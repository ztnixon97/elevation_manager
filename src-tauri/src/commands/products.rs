use crate::services::api_client::ApiClient;
use log::info;
use tauri::State;
use serde_json::json;

#[tauri::command]
pub async fn get_all_products(api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Fetching all products...");
    api_client.get("/products").await
}

#[tauri::command]
pub async fn get_all_product_types(api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Fetching all product_types...");
    api_client.get("/product_types").await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_user_products(api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Fetching user assigned products...");
    api_client.get("/products/me").await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn checkout_product(
    api_client: State<'_, ApiClient>,
    product_id: i32,
    team_id: Option<i32>,
    reason: String,
) -> Result<String, String> {
    info!("Checking out product {product_id}...");
    let checkout_payload = json!({
        "product_id": product_id,
        "user_id": null,
        "team_id": team_id,
        "assignment_type": "checked_out",
        "status": "active",
        "assigned_by": null,
        "due_date": null,
        "reason": reason,
    });
    api_client.post("/product-assignments", &checkout_payload).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn assign_product_to_user(
    api_client: State<'_, ApiClient>,
    product_id: i32,
    user_id: i32,
    team_id: Option<i32>,
    assignment_type: Option<String>,
    due_date: Option<String>,
    reason: Option<String>,
) -> Result<String, String> {
    info!("Assigning product {product_id} to user {user_id}...");
    let assignment_payload = json!({
        "product_id": product_id,
        "user_id": user_id,
        "team_id": team_id,
        "assignment_type": assignment_type.unwrap_or_else(|| "assigned".to_string()),
        "status": null,
        "assigned_by": null,
        "due_date": due_date,
        "reason": reason,
    });
    api_client.post("/product-assignments", &assignment_payload).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_product_details(
    api_client: State<'_, ApiClient>,
    product_id: i32,
) -> Result<String, String> {
    info!("Fetching details for product {product_id}...");
    api_client.get(&format!("/products/{}", product_id)).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_product_assignment(
    api_client: State<'_, ApiClient>,
    assignment_id: i32,
) -> Result<String, String> {
    info!("Deleting product assignment {assignment_id}...");
    api_client.delete(&format!("/product-assignments/{}", assignment_id)).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_product_assignments(
    api_client: State<'_, ApiClient>,
    product_id: i32,
) -> Result<String, String> {
    info!("Fetching assignments for product {product_id}...");
    api_client.get(&format!("/products/{}/assignments", product_id)).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_product(
    api_client: State<'_, ApiClient>,
    product_id: i32,
    site_id: Option<String>,
    item_id: Option<String>,
    status: Option<String>,
    classification: Option<String>,
    product_type_id: Option<i32>,
    taskorder_id: Option<i32>,
) -> Result<String, String> {
    info!("Updating product {product_id}...");
    let update_payload = json!({
        "site_id": site_id,
        "item_id": item_id,
        "status": status,
        "classification": classification,
        "product_type_id": product_type_id,
        "taskorder_id": taskorder_id,
    });
    api_client.patch(&format!("/products/{}", product_id), &update_payload).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_product_status(
    api_client: State<'_, ApiClient>,
    product_id: i32,
    status: String,
) -> Result<String, String> {
    info!("Updating product {product_id} status to {status}...");
    let payload = json!({
        "status": status,
    });
    api_client.patch(&format!("/products/{}", product_id), &payload).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn create_product(
    api_client: State<'_, ApiClient>,
    item_id: String,
    site_id: String,
    product_type_id: i32,
    status: String,
    status_date: Option<String>,
    taskorder_id: Option<i32>,
    file_path: Option<String>,
    s2_index: Option<String>,
    classification: Option<String>,
    geometry: Option<serde_json::Value>,
    coordinate_system: Option<String>,
    srid: Option<i32>,
) -> Result<String, String> {
    info!("Creating product {site_id}/{item_id}...");
    // Map frontend geometry -> backend geom and pass through other fields.
    let payload = json!({
        "taskorder_id": taskorder_id,
        "item_id": item_id,
        "site_id": site_id,
        "product_type_id": product_type_id,
        "status": status,
        "status_date": status_date,
        "acceptance_date": null,
        "publish_date": null,
        "file_path": file_path,
        "s2_index": s2_index,
        "geom": geometry,
        "classification": classification,
        // optional SRID hint; coordinate_system is accepted but SRID is what backend can apply
        "srid": srid,
        "coordinate_system": coordinate_system,
    });
    api_client.post("/products", &payload).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn create_product_type(
    api_client: State<'_, ApiClient>,
    name: String,
    acronym: String,
) -> Result<String, String> {
    info!("Creating product type {name} ({acronym})...");
    let payload = json!({
        "name": name,
        "acronym": acronym,
    });
    api_client.post("/product_types", &payload).await
}