use axum::http::StatusCode;
use axum::{extract::State, extract::Path, response::Json, routing::get, Router};
use chrono::DateTime;
use dotenv::dotenv;
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;
use validator::{Validate, ValidationError};
use aws_sdk_dynamodb::Client;
use db::{connect_to_local_db, create_table_if_not_exists, delete_item, scan_items, get_item, put_item};
use shared_types::GroceryItem;

#[derive(Clone)]
struct AppState {
    client: Client,
    table_name: String,
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
) -> Result<(StatusCode, Json<GroceryItem>), (StatusCode, Json<ApiError>)> {
    if let Err(validation_errors) = payload.validate() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                message: format!("Validation error: {:?}", validation_errors),
            }),
        ));
    }

    let id = Uuid::new_v4().to_string();

    let grocery_item = GroceryItem {
        id,
        name: payload.name,
        brand: payload.brand,
        category: payload.category,
        amount: payload.amount,
        expiry_date: payload.expiry_date,
    };

    match put_item(&state.client, &state.table_name, &grocery_item).await {
        Ok(item) => {
            Ok((StatusCode::CREATED, Json(item)))
        },
        Err(e) => Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                message: e.to_message(),
            })
        ))
    }
}

async fn get_grocery_items(State(state): State<AppState>) -> Result<Json<Vec<GroceryItem>>, (StatusCode, Json<ApiError>)> {
    match scan_items(&state.client, &state.table_name).await {
        Ok(items) => Ok(Json(items)),
        Err(e) => Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                message: e.to_message(),
            })
        ))
    }
}

async fn get_grocery_item(
    State(state): State<AppState>,
    Path(grocery_item_id): Path<String>,
) -> Result<Json<GroceryItem>, (StatusCode, Json<ApiError>)> {
    match get_item(&state.client, &state.table_name, &grocery_item_id).await {
        Ok(Some(item)) => Ok(Json(item)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiError {
                message: format!("Grocery item with id {} not found", grocery_item_id),
            })
        )),
        Err(e) => Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                message: e.to_message(),
            })
        ))
    }
}

async fn delete_grocery_item(
    State(state): State<AppState>,
    Path(grocery_item_id): Path<String>,
) -> Result<StatusCode, (StatusCode, Json<ApiError>)> {
    match delete_item(&state.client, &state.table_name, &grocery_item_id).await {
        Ok(true) => {
            println!("Item deleted successfully");
            Ok(StatusCode::NO_CONTENT)
        },
        Ok(false) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiError {
                message: format!("Grocery item with id {} not found", grocery_item_id),
            })
        )),
        Err(e) => Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                message: e.to_message(),
            })
        ))
    }
}

fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(|| async { "Hello, World!" }))
        .route("/health", get(|| async { "OK" }))
        .route("/api/v1/groceries", get(get_grocery_items).post(create_grocery_item))
        .route("/api/v1/groceries/:grocery_item_id", get(get_grocery_item).delete(delete_grocery_item))
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
    create_table_if_not_exists(&client, &table_name)
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

    let routes = routes().with_state(AppState { client, table_name });

    axum::serve(listener, routes).await.unwrap();
}
