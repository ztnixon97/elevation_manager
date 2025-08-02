use crate::services::api_client::ApiClient;
use log::{debug, error, info};
use tauri::State;

#[tauri::command]
pub async fn get_user_role(
    api_client: State<'_, ApiClient>,
    username: String,
) -> Result<String, String> {
    let url = format!("/users/{}/role", username);
    debug!("Sending role request for username: {}", username);
    let response_text = api_client.get(&url).await?;
    // ✅ Extract just the role from JSON response
    let role: String = match serde_json::from_str::<serde_json::Value>(&response_text) {
        Ok(json) => json["data"].as_str().unwrap_or("unknown").to_string(),
        Err(_) => return Err("Failed to parse role from response".to_string()),
    };
    info!("Successfully retrieved user role for username: {}", username);
    debug!("Role: {}", role);
    Ok(role)
}

#[tauri::command]
pub async fn get_users(api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Fetching users");
    let user_json = api_client.get("/users").await?;
    info!("Successfully retrieved users");
    debug!("Response: {}", user_json);
    Ok(user_json)
}
