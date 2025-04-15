use crate::auth::login::AuthState;
use crate::utils::get_auth_header;
use log::{error, info};
use reqwest::Client;
use tauri::State;

#[tauri::command(rename_all = "snake_case")]
pub async fn get_contracts(
    state: State<'_, AuthState>,
) -> Result<String, String> {
    let client = Client::new();
    let auth_header = get_auth_header(&state).await.map_err(|e| format!("Failed to get auth header: {}", e))?;
    let url = "http://localhost:3000/contracts";

    let response = client
        .get(url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    if status.is_success() {
        info!("Contracts fetched successfully: {}", response_text);
        Ok(response_text)
    } else {
        error!("Failed to fetch contracts: {}", response_text);
        Err(format!("Error: {}", response_text))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_contract_task_orders(
    state: State<'_, AuthState>,
    contract_id: i32,
) -> Result<String, String> {
    let client = Client::new();
    let auth_header = get_auth_header(&state).await.map_err(|e| format!("Failed to get auth header: {}", e))?;
    let url = format!("http://localhost:3000/contracts/{}/taskorders", contract_id);

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    if status.is_success() {
        info!("Contract task orders fetched successfully: {}", response_text);
        Ok(response_text)
    } else {
        error!("Failed to fetch contract task orders: {}", response_text);
        Err(format!("Error: {}", response_text))
    }
}

#[tauri::command(rename_all="snake_case")]
pub async fn get_contract_details(
    state: State<'_, AuthState>,
    contract_id: i32
) -> Result<String, String> {
    let client = Client::new();
    let auth_header = get_auth_header(&state).await.map_err(|e| format!("Failed to get auth header: {}", e))?;
    let url = format!("http://localhost:3000/contracts/{contract_id}");

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {e}"))?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("Failed to read response: {e}"))?;


    if status.is_success() {
        info!("Contract fetched successfully: {response_text}");
        Ok(response_text)
    } else {
        error!("Failed to fetch contract response: {response_text}");
        Err(format!("Error: {response_text}"))
    }
}
