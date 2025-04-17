use crate::utils::get_auth_header;
use crate::auth::login::AuthState;
use log::{debug, error, info};
use reqwest::Client;
use tauri::State;

#[tauri::command(rename_all="snake_case")]
pub async fn get_task_order(
    state: State<'_, AuthState>,
    taskorder_id: i32,
) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/taskorders/{taskorder_id}");

    let auth_header = get_auth_header(&state).await?;

    info!("Fetching task order details");

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {e}");
            format!("Request Failed: {e}")
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retrived task");
        debug!("Response: {response_text}");
        Ok(response_text)
    } else {
        error!("Failed to retrive task. Status: {status}, Response: {response_text}");

        Err(format!("Failed to retrived task: {response_text}"))
    }
}

#[tauri::command(rename_all="snake_case")]
pub async fn get_taskorder_products(
    state: State<'_, AuthState>,
    taskorder_id: i32,
) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/products?taskorder_id={taskorder_id}");

    let auth_header = get_auth_header(&state).await?;

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {e}");
            format!("Request failed: {e}")
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retried taskorder products");
        debug!("Response: {response_text}");
        Ok(response_text)
    } else {
        error!("Failed to retrive taskorder pdoucts. Status: {status} Response: {response_text}");
        Err(format!("Failed to retreive taskorder products: {response_text}"))
    }
    
}
