use crate::services::api_client::ApiClient;
use log::{debug, error, info};
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
struct NewTeam {
    pub name: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn create_team(api_client: State<'_, ApiClient>, name: String) -> Result<String, String> {
    info!("Creating a new team: {name}");
    let response = api_client.post("/teams", &NewTeam { name: name.clone() }).await?;
    let parsed_response: serde_json::Value = serde_json::from_str(&response).map_err(|e| e.to_string())?;
    if let Some(team_id) = parsed_response["data"].as_i64() {
        let response_json = serde_json::json!({
            "success": true,
            "data": {
                "id": team_id,
                "name": name
            }
        });
        Ok(response_json.to_string())
    } else {
        Err("Unexpected response format".to_string())
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_team(api_client: State<'_, ApiClient>, team_id: i32) -> Result<String, String> {
    info!("Fetching team details for ID: {team_id}");
    api_client.get(&format!("/teams/{}", team_id)).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_all_teams(api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Fetching all teams...");
    api_client.get("/teams").await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_team(api_client: State<'_, ApiClient>, team_id: i32, name: String) -> Result<(), String> {
    info!("Updating team ID {} with name: {}", team_id, name);
    api_client.put(&format!("/teams/{}", team_id), &NewTeam { name }).await?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_team(api_client: State<'_, ApiClient>, team_id: i32) -> Result<String, String> {
    info!("Deleting team ID: {}", team_id);
    api_client.delete(&format!("/teams/{}", team_id)).await
}

#[derive(Serialize)]
struct AddUser {
    pub user_id: i32,
    pub role: String,
}

#[derive(Serialize)]
struct UpdateUserRole {
    pub role: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_team_users(api_client: State<'_, ApiClient>, team_id: i32) -> Result<String, String> {
    info!("Fetching users for team ID: {}", team_id);
    api_client.get(&format!("/teams/{}/users", team_id)).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn add_user_to_team(api_client: State<'_, ApiClient>, team_id: i32, user_id: i32, role: String) -> Result<(), String> {
    info!("Adding user {} to team {} with role {}", user_id, team_id, role);
    api_client.post(&format!("/teams/{}/users", team_id), &AddUser { user_id, role }).await?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_user_from_team(api_client: State<'_, ApiClient>, team_id: i32, user_id: i32) -> Result<(), String> {
    info!("Removing user {} from team {}", user_id, team_id);
    api_client.delete(&format!("/teams/{}/users/{}", team_id, user_id)).await?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_user_role(api_client: State<'_, ApiClient>, team_id: i32, user_id: i32, role: String) -> Result<(), String> {
    info!("Updating user {} role in team {} to {}", user_id, team_id, role);
    api_client.put(&format!("/teams/{}/users/{}", team_id, user_id), &UpdateUserRole { role }).await?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_team_products(api_client: State<'_, ApiClient>, team_id: i32) -> Result<String, String> {
    info!("Fetching products for team ID: {}", team_id);
    api_client.get(&format!("/teams/{}/products", team_id)).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn assign_product_to_team(api_client: State<'_, ApiClient>, team_id: i32, site_id: String) -> Result<(), String> {
    info!("Assigning product {} to team {}", site_id, team_id);
    api_client.post(&format!("/teams/{}/products", team_id), &serde_json::json!({"site_id": site_id})).await?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_product_from_team(api_client: State<'_, ApiClient>, team_id: i32, product_id: i32) -> Result<(), String> {
    info!("Removing product {} from team {}", product_id, team_id);
    api_client.delete(&format!("/teams/{}/products/{}", team_id, product_id)).await?;
    Ok(())
}

#[derive(Serialize)]
struct AssignProductType {
    pub product_type_id: i32,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_team_product_types(api_client: State<'_, ApiClient>, team_id: i32) -> Result<String, String> {
    info!("Fetching product types for team ID: {}", team_id);
    api_client.get(&format!("/teams/{}/product_types", team_id)).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn assign_product_type_to_team(api_client: State<'_, ApiClient>, team_id: i32, product_type_id: i32) -> Result<(), String> {
    info!("Assigning product type {} to team {}", product_type_id, team_id);
    api_client.post(&format!("/teams/{}/product_types", team_id), &AssignProductType { product_type_id }).await?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_product_type_from_team(api_client: State<'_, ApiClient>, team_id: i32, product_type_id: i32) -> Result<(), String> {
    info!("Removing product type {} from team {}", product_type_id, team_id);
    api_client.delete(&format!("/teams/{}/product_types/{}", team_id, product_type_id)).await?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_all_users(api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Fetching all users...");
    api_client.get("/users").await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_team_tasks(api_client: State<'_, ApiClient>, team_id: i32) -> Result<String, String> {
    info!("Fetching tasks for team ID: {}", team_id);
    api_client.get(&format!("/teams/{}/tasks", team_id)).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn assign_task_order_to_team(api_client: State<'_, ApiClient>, team_id: i32, task_name: String) -> Result<(), String> {
    info!("Assigning task order {} to team {}", task_name, team_id);
    api_client.post(&format!("/teams/{}/tasks", team_id), &serde_json::json!({"task_name": task_name})).await?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_task_order_from_team(api_client: State<'_, ApiClient>, team_id: i32, task_id: i32) -> Result<(), String> {
    info!("Removing task order {} from team {}", task_id, team_id);
    api_client.delete(&format!("/teams/{}/tasks/{}", team_id, task_id)).await?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_team_notifications(api_client: State<'_, ApiClient>, team_id: i32) -> Result<String, String> {
    info!("Fetching notifications for team ID: {}", team_id);
    api_client.get(&format!("/teams/{}/notifications", team_id)).await
}
