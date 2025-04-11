use std::iter::Product;

use crate::utils::get_auth_header;
use crate::{
    auth::{self, login::AuthState},
    state,
};
use log::{debug, error, info};
use reqwest::Client;
use tauri::{http::status, State};

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
        error!(
            "Failed to retrived products. Status: {:?}, Response: {}",
            status, response_text
        );
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
        error!(
            "Failed to retrived produc types. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!(
            "Failed to retrieve product types: {:?}",
            response_text
        ))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_user_products(state: State<'_, AuthState>) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/products/me".to_string();

    let auth_header = get_auth_header(&state).await?;

    info!("Fetching user assinged products...");

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
        info!("Successfully retrieved user assigned products.");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!(
            "Failed to retrived user assigned products. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!(
            "Failed to retrieve user assigned products: {:?}",
            response_text
        ))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn checkout_product(
    state: State<'_, AuthState>,
    product_id: i32,
    team_id: Option<i32>,
    reason: String,
) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/product-assignments".to_string();
    let auth_header = get_auth_header(&state).await?;

    info!("Checking out product {product_id}...");

    let checkout_payload = serde_json::json!({
        "product_id": product_id,
        "user_id": null, // Will be set from JWT claims
        "team_id": team_id,
        "assignment_type": "checked_out",
        "status": "active",
        "assigned_by": null, // Will be set from JWT claims
        "due_date": null,
        "reason": reason,
    });

    let response = client
        .post(&url)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&checkout_payload)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {e}")
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully checked out product.");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!(
            "Failed to checkout product. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to checkout product: {:?}", response_text))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn assign_product_to_user(
    state: State<'_, AuthState>,
    product_id: i32,
    user_id: i32,
    team_id: Option<i32>,
    assignment_type: Option<String>,
    due_date: Option<String>,
    reason: Option<String>,
) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/product-assignments".to_string();
    let auth_header = get_auth_header(&state).await?;

    info!("Assigning product {product_id} to user {user_id}...");

    let assignment_payload = serde_json::json!({
        "product_id": product_id,
        "user_id": user_id,
        "team_id": team_id,
        "assignment_type": assignment_type.unwrap_or_else(|| "assigned".to_string()),
        "status": null, // The backend will default this to "active"
        "assigned_by": null, // The backend will get this from the JWT claims
        "due_date": due_date,
        "reason": reason,
    });

    let response = client
        .post(&url)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&assignment_payload)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {e}");
            format!("Request failed: {e}")
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully assigned product to user.");
        debug!("Response: {response_text}");
        Ok(response_text)
    } else {
        error!(
            "Failed to assign product to user. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!(
            "Failed to assign product to user: {:?}",
            response_text
        ))
    }
}

// Add this to src-tauri/src/commands/products.rs

#[tauri::command(rename_all = "snake_case")]
pub async fn get_product_details(
    state: State<'_, AuthState>,
    product_id: i32,
) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/products/{}", product_id);
    let auth_header = get_auth_header(&state).await?;

    info!("Fetching details for product {product_id}...");

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
        info!("Successfully retrieved product details.");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!(
            "Failed to retrieve product details. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!(
            "Failed to retrieve product details: {:?}",
            response_text
        ))
    }
}
