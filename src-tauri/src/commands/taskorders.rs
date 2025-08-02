use crate::services::api_client::ApiClient;
use log::info;
use tauri::State;
use serde::Serialize;

#[derive(Serialize)]
struct NewTaskOrderRequest {
    pub contract_id: Option<i32>,
    pub name: String,
    pub status: String,
    pub task_order_type: String,
    pub producer: Option<String>,
    pub cor: Option<String>,
    pub pop: Option<String>,
    pub price: Option<f64>,
}

#[derive(Serialize)]
struct UpdateTaskOrderRequest {
    pub name: Option<String>,
    pub status: Option<String>,
    pub producer: Option<String>,
    pub cor: Option<String>,
    pub pop: Option<String>,
    pub price: Option<f64>,
}

#[tauri::command(rename_all="snake_case")]
pub async fn create_task_order(
    api_client: State<'_, ApiClient>,
    contract_id: Option<i32>,
    name: String,
    status: String,
    producer: Option<String>,
    cor: Option<String>,
    pop: Option<String>,
    price: Option<f64>,
    task_order_type: String,
) -> Result<String, String> {
    info!("Creating new task order: {}", name);

    let request = NewTaskOrderRequest {
        contract_id,
        name,
        status,
        task_order_type,
        producer,
        cor,
        pop,
        price,
    };

    api_client.post("/taskorders", &request).await
}

#[tauri::command(rename_all="snake_case")]
pub async fn get_all_taskorders(
    api_client: State<'_, ApiClient>,
) -> Result<String, String> {
    info!("Fetching all task orders...");
    api_client.get("/taskorders").await
}

#[tauri::command(rename_all="snake_case")]
pub async fn get_task_order(
    api_client: State<'_, ApiClient>,
    taskorder_id: i32,
) -> Result<String, String> {
    info!("Fetching task order details for ID: {}", taskorder_id);
    api_client.get(&format!("/taskorders/{}", taskorder_id)).await
}

#[tauri::command(rename_all="snake_case")]
pub async fn get_taskorder_products(
    api_client: State<'_, ApiClient>,
    taskorder_id: i32,
) -> Result<String, String> {
    info!("Fetching products for task order: {}", taskorder_id);
    api_client.get(&format!("/products?taskorder_id={}", taskorder_id)).await
}

#[tauri::command(rename_all="snake_case")]
pub async fn check_task_order_edit_permission(
    api_client: State<'_, ApiClient>,
    taskorder_id: i32,
) -> Result<String, String> {
    info!("Checking edit permission for task order: {}", taskorder_id);
    api_client.get(&format!("/taskorders/{}/permissions", taskorder_id)).await
}

#[tauri::command(rename_all="snake_case")]
pub async fn update_task_order(
    api_client: State<'_, ApiClient>,
    taskorder_id: i32,
    name: Option<String>,
    status: Option<String>,
    producer: Option<String>,
    cor: Option<String>,
    pop: Option<String>,
    price: Option<f64>,
) -> Result<String, String> {
    info!("Updating task order: {}", taskorder_id);

    let request = UpdateTaskOrderRequest {
        name,
        status,
        producer,
        cor,
        pop,
        price,
    };

    api_client.put(&format!("/taskorders/{}", taskorder_id), &request).await
}
