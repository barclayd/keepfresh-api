use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct GroceryItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub brand: String,
    pub amount: i32,
    pub expiry_date: Option<String>,
}