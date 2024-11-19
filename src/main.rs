use axum::{response::Json, routing::get, Router};

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct GroceryItem {
    id: String,
    icon: String,
    name: String,
    category: String,
    brand: String,
    amount: i32,
    waste_score: i32,
    expiry_date: String,
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
        expiry_date: "2024-12-31".to_string(),
    }])
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(|| async { "Hello, World!" }))
        .route("/health", get(|| async { "OK" }))
        .route("/api/v1/groceries", get(json));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
