use crate::services::api_client::ApiClient;
use log::info;
use tauri::State;

#[tauri::command(rename_all = "snake_case")]
pub async fn get_contracts(
    api_client: State<'_, ApiClient>,
) -> Result<String, String> {
    info!("Fetching contracts...");
    api_client.get("/contracts").await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_contract_task_orders(
    api_client: State<'_, ApiClient>,
    contract_id: i32,
) -> Result<String, String> {
    info!("Fetching contract task orders for contract_id: {}", contract_id);
    api_client.get(&format!("/contracts/{}/taskorders", contract_id)).await
}

#[tauri::command(rename_all="snake_case")]
pub async fn get_contract_details(
    api_client: State<'_, ApiClient>,
    contract_id: i32
) -> Result<String, String> {
    info!("Fetching contract details for contract_id: {}", contract_id);
    api_client.get(&format!("/contracts/{}", contract_id)).await
}

#[tauri::command(rename_all="snake_case")]
pub async fn create_contract(
    api_client: State<'_, ApiClient>,
    contract: serde_json::Value,
) -> Result<String, String> {
    info!("Creating contract");
    api_client.post("/contracts", &contract).await
}
