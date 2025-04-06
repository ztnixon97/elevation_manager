use crate::auth::login::AuthState;
use log::{error, info, debug};
use reqwest::Client;
use tauri::State;
use crate::utils::get_auth_header;


#[tauri::command]
pub async fn get_all_products(state: State<'_, AuthState>) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/products".to_string();

    let auth_header = get_auth_header(&state).await?;

    info!("Fetching all products...");

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {e}")
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retrieved all teams.");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!("Failed to retrived products. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to retrieve products: {:?}", response_text))
    }
}

#[tauri::command]
pub async fn get_all_product_types(state: State<'_, AuthState>) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/product_types".to_string();

    let auth_header = get_auth_header(&state).await?;

    info!("Fetching all product_types...");

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {e}")
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retrieved all product types.");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!("Failed to retrived produc types. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to retrieve product types: {:?}", response_text))
    }
}