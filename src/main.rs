use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::{extract::State, response::Json, routing::get, Router};
use chrono::DateTime;
use dotenv::dotenv;
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;
use validator::{Validate, ValidationError};

use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Client;
use db::{connect_to_local_db, create_table_if_not_exists};

#[derive(Clone)]
struct AppState {
    client: Client,
}

#[derive(Serialize, Deserialize, Debug)]
struct GroceryItem {
    id: String,
    icon: String,
    name: String,
    category: String,
    brand: String,
    amount: i32,
    waste_score: i32,
    expiry_date: Option<String>,
}

#[derive(Serialize)]
struct GroceryResponse {
    id: String,
    message: String,
}

#[derive(Debug, Serialize)]
struct ApiError {
    message: String,
}

fn validate_category(category: &str) -> Result<(), ValidationError> {
    let valid_categories = ["Fruit", "Vegetable", "Meat", "Dairy"];
    if valid_categories.contains(&category) {
        Ok(())
    } else {
        Err(ValidationError::new("invalid_category"))
    }
}

fn validate_iso_date_if_present(date: &str) -> Result<(), ValidationError> {
    DateTime::parse_from_rfc3339(date).map_err(|_| ValidationError::new("invalid_iso_date"))?;
    Ok(())
}

#[derive(Debug, Validate, Deserialize)]
struct CreateGroceryItem {
    #[validate(length(
        min = 1,
        max = 50,
        message = "name must be between 1 and 100 characters"
    ))]
    name: String,

    #[validate(length(
        min = 1,
        max = 50,
        message = "name must be between 1 and 100 characters"
    ))]
    brand: String,

    #[validate(length(min = 1), custom(function = "validate_category"))]
    category: String,

    #[validate(range(min = 1, max = 100))]
    amount: i32,

    #[validate(custom(function = "validate_iso_date_if_present"))]
    expiry_date: Option<String>,
}

async fn create_grocery_item(
    State(state): State<AppState>,
    Json(payload): Json<CreateGroceryItem>,
) -> Result<impl IntoResponse, (StatusCode, Json<ApiError>)> {
    let table_name: String =
        env::var("FOOD_WASTE_TABLE_NAME").unwrap_or("FoodWasteTable".to_string());

    if let Err(validation_errors) = payload.validate() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                message: format!("Validation error: {:?}", validation_errors),
            }),
        ));
    }

    let id = Uuid::new_v4().to_string();

    let request = state
        .client
        .put_item()
        .table_name(table_name)
        .item("id", AttributeValue::S(id.clone()))
        .item("name", AttributeValue::S(payload.name.clone()))
        .item("brand", AttributeValue::S(payload.brand.clone()))
        .item("category", AttributeValue::S(payload.category.clone()))
        .item("amount", AttributeValue::N(payload.amount.to_string()));

    request.send().await.map_err(|e| (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiError {
            message: format!("Database error: {}", e),
        }),
    ))?;

    let response = GroceryResponse {
        id,
        message: format!("Created grocery item: {}", payload.name),
    };

    Ok((StatusCode::CREATED, Json(response)))
}

async fn json() -> Json<Vec<GroceryItem>> {
    Json(vec![GroceryItem {
        id: "1".to_string(),
        icon: "checkbox".to_string(),
        name: "Apple".to_string(),
        category: "Fruit".to_string(),
        brand: "Unknown".to_string(),
        amount: 1,
        waste_score: 1,
        expiry_date: Some("2024-12-31".to_string()),
    }])
}

fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(|| async { "Hello, World!" }))
        .route("/health", get(|| async { "OK" }))
        .route("/api/v1/groceries", get(json).post(create_grocery_item))
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    let db_endpoint_url: String = env::var("DYNAMODB_ENDPOINT_URL")
        .unwrap_or("http://localhost:8000".to_string())
        .parse()
        .expect("DYNAMODB_ENDPOINT_URL is not valid");
    let table_name: String =
        env::var("FOOD_WASTE_TABLE_NAME").unwrap_or("FOOD_WASTE_TABLE_NAME".to_string());
    let region: String = env::var("REGION").unwrap_or("eu-west-2".to_string());

    let client = connect_to_local_db(db_endpoint_url, region).await;
    create_table_if_not_exists(&client, table_name)
        .await
        .expect("Unable to create table");

    let port: u16 = env::var("PORT")
        .unwrap_or("3001".to_string())
        .parse()
        .expect("PORT must be a number");

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .unwrap();
    println!(
        "Server running at http://{} 🚀",
        listener.local_addr().unwrap()
    );

    let routes = routes().with_state(AppState { client });

    axum::serve(listener, routes).await.unwrap();
}
