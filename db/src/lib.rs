use aws_config;
use aws_sdk_dynamodb::{
Client, Error
};
use aws_sdk_dynamodb::types::{AttributeDefinition, AttributeValue, KeySchemaElement, KeyType, ProvisionedThroughput, ScalarAttributeType};
use serde_dynamo::from_items;
use tracing_subscriber::fmt;
use serde::Serialize;
use shared_types::GroceryItem;

#[derive(Serialize)]
pub enum DBError {
    AwsSdkError(String),
    Other(String)
}

impl DBError {
    pub fn to_message(self) -> String {
        match self {
            DBError::AwsSdkError(msg) => msg,
            DBError::Other(msg) => msg,
        }
    }
}

pub async fn connect_to_local_db(endpoint_url: String, region: String) -> Client {
    fmt::init();

    let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .test_credentials()
        .endpoint_url(endpoint_url)
        .region(aws_config::Region::new(region))
        .load()
        .await;
    let dynamodb_local_config = aws_sdk_dynamodb::config::Builder::from(&config).build();

    let client = aws_sdk_dynamodb::Client::from_conf(dynamodb_local_config);

    client
}

pub async fn create_table_if_not_exists(client: &Client, table_name: &String) -> Result<bool, Error> {
    let key = "id";

    let list_resp = client.list_tables().send().await;

    match list_resp {
        Ok(resp) => {
            match resp.table_names().contains(&table_name) {
                true => {
                    println!("\"{}\" table found", table_name);
                    Ok(true)
                },
                false => create_table(client, &table_name, key).await,
            }
        }
        Err(e) => {
            eprintln!("Got an error creating table:");
            eprintln!("{}", e);
            Err(Error::from(e))
        }
    }
}

pub async fn create_table(client: &Client, table_name: &str, key: &str) -> Result<bool, Error> {
    let id_attribute_definition = AttributeDefinition::builder()
        .attribute_name(key)
        .attribute_type(ScalarAttributeType::S)
        .build()
        .map_err(Error::from)?;

    let key_schema_element = KeySchemaElement::builder()
        .attribute_name("id")
        .key_type(KeyType::Hash)
        .build()
        .map_err(Error::from)?;

    let pt = ProvisionedThroughput::builder()
        .read_capacity_units(10)
        .write_capacity_units(5)
        .build()
        .map_err(Error::from)?;

    let create_table_response = client
        .create_table()
        .table_name(table_name)
        .key_schema(key_schema_element)
        .attribute_definitions(id_attribute_definition)
        .provisioned_throughput(pt)
        .send()
        .await;

    match create_table_response {
        Ok(_out) => {
            println!("Added table {} with key {}", table_name, key);
            Ok(true)
        }
        Err(e) => {
            eprintln!("Got an error creating table:");
            eprintln!("{}", e);
            Err(Error::from(e))
        }
    }
}

pub async fn scan_items(client: &Client, table_name: &str) -> Result<Vec<GroceryItem>, DBError> {
    let result = client.scan().table_name(table_name).send().await.map_err(|err| DBError::AwsSdkError(err.to_string()))?;
    let items = result.items();
    let grocery_items: Vec<GroceryItem> = from_items(items.to_vec())
        .map_err(|e| DBError::Other(e.to_string()))?;
    Ok(grocery_items)
}

pub async fn get_item(client: &Client, table_name: &str, grocery_item_id: &str) -> Result<Option<GroceryItem>, DBError> {
    let get_item_output = client.get_item().table_name(table_name).key("id", AttributeValue::S(grocery_item_id.into())).send().await.map_err(|e| DBError::AwsSdkError(e.to_string()))?;

    match get_item_output.item() {
        Some(item) => {
            let grocery_item: GroceryItem = serde_dynamo::from_item(item.clone())
                .map_err(|e| DBError::Other(e.to_string()))?;
            Ok(Some(grocery_item))
        }
        None => Ok(None)
    }
}

pub async fn put_item(client: &Client, table_name: &str, grocery_item: &GroceryItem) -> Result<GroceryItem, DBError> {
    let items = [
        ("id", AttributeValue::S(grocery_item.id.to_string())),
        ("name", AttributeValue::S(grocery_item.name.to_string())),
        ("brand", AttributeValue::S(grocery_item.brand.to_string())),
        ("category", AttributeValue::S(grocery_item.category.to_string())),
        ("amount", AttributeValue::N(grocery_item.amount.to_string())),
        ("expiry_date", AttributeValue::S(grocery_item.expiry_date.clone().unwrap_or_default())),
    ];

    let mut request = client.put_item().table_name(table_name);
    for (key, value) in items {
        request = request.item(key, value);
    }

    request
        .send()
        .await
        .map_err(|e| (DBError::AwsSdkError(e.to_string())))?;

    Ok(grocery_item.clone())
}

pub async fn delete_item(client: &Client, table_name: &str, grocery_item_id: &str) -> Result<bool, DBError> {
    let result = client
        .delete_item()
        .table_name(table_name)
        .key("id", AttributeValue::S(grocery_item_id.into()))
        .return_values(aws_sdk_dynamodb::types::ReturnValue::AllOld)
        .send()
        .await
        .map_err(|e| DBError::AwsSdkError(e.to_string()))?;

    Ok(result.attributes().is_some())
}