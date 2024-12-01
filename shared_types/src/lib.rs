use aws_sdk_dynamodb::types::AttributeValue;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GroceryItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub brand: String,
    pub amount: i32,
    pub expiry_date: Option<String>,
}

#[derive(Default)]
pub struct GroceryItemUpdate {
    updates: HashMap<String, AttributeValue>,
}

impl GroceryItemUpdate {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn name(mut self, name: impl Into<String>) -> Self {
        self.updates
            .insert("name".to_string(), AttributeValue::S(name.into()));
        self
    }

    pub fn brand(mut self, brand: impl Into<String>) -> Self {
        self.updates
            .insert("brand".to_string(), AttributeValue::S(brand.into()));
        self
    }

    pub fn category(mut self, category: impl Into<String>) -> Self {
        self.updates
            .insert("category".to_string(), AttributeValue::S(category.into()));
        self
    }

    pub fn amount(mut self, amount: impl ToString) -> Self {
        self.updates
            .insert("amount".to_string(), AttributeValue::N(amount.to_string()));
        self
    }

    pub fn expiry_date(mut self, date: impl Into<String>) -> Self {
        self.updates
            .insert("expiry_date".to_string(), AttributeValue::S(date.into()));
        self
    }

    pub fn build(self) -> HashMap<String, AttributeValue> {
        self.updates
    }
}

#[derive(Deserialize, Serialize)]
pub struct GroceryItemUpdateRequest {
    pub name: Option<String>,
    pub brand: Option<String>,
    pub category: Option<String>,
    pub amount: Option<f64>,
    pub expiry_date: Option<String>,
}
