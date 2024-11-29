use aws_config;
use aws_sdk_dynamodb::{
Client, Error
};
use aws_sdk_dynamodb::types::{
    AttributeDefinition, KeySchemaElement, KeyType, ProvisionedThroughput, ScalarAttributeType
};
use tracing_subscriber::fmt;

pub async fn connect_to_local_db(endpoint_url: String) -> Client {
    fmt::init();

    let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .test_credentials()
        .endpoint_url(endpoint_url)
        .region(aws_config::Region::new("eu-west-2"))
        .load()
        .await;
    let dynamodb_local_config = aws_sdk_dynamodb::config::Builder::from(&config).build();

    let client = aws_sdk_dynamodb::Client::from_conf(dynamodb_local_config);

    return client;
}

pub async fn create_table_if_not_exists(client: &Client) -> Result<bool, Error> {
    let table_name = String::from("FoodWasteTable");
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