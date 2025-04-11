use crate::auth::login::AuthState;
use crate::utils::get_auth_header;
use log::{debug, error, info};
use reqwest::Client;
use serde_json::Value;
use tauri::State;

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_user(state: State<'_, AuthState>, user_id: i32) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/users/{user_id}");

    let auth_header = get_auth_header(&state).await?;
    log::debug!("🔐 Sending DELETE request with auth: {}", auth_header);

    let response = client
        .delete(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let body = response.text().await.unwrap_or_default();

    if status.is_success() {
        log::info!("✅ Successfully deleted user {user_id}");
        Ok(format!("User {user_id} deleted successfully"))
    } else {
        log::error!("❌ Failed to delete user. Status: {status:?}, Body: {body}");
        Err(format!("Failed to delete user: {body}"))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_user(
    state: State<'_, AuthState>,
    user_id: i32,
    user_data: Value,
) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/users/{}", user_id);

    let auth_header = get_auth_header(&state).await?;
    debug!("🔐 Sending update to {} with data: {}", url, user_data);

    let response = client
        .put(&url)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&user_data)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let body = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("✅ Successfully updated user {}", user_id);
        Ok(format!("User {} updated successfully", user_id))
    } else {
        error!(
            "🚫 Failed to update user. Status: {:?}, Body: {}",
            status, body
        );
        Err(format!("Failed to update user: {}", body))
    }
}
#[tauri::command(rename_all = "snake_case")]
pub async fn lock_user(
    state: State<'_, AuthState>,
    user_id: i32,
    locked: bool,
) -> Result<String, String> {
    use serde_json::json;
    let client = Client::new();
    let url = format!("http://localhost:3000/users/{}", user_id);

    let auth_header = get_auth_header(&state).await?;

    let user_data = json!({ "account_locked": locked });

    let response = client
        .put(&url)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&user_data)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let body = response.text().await.unwrap_or_default();

    if status.is_success() {
        Ok(format!(
            "User {} {} successfully",
            user_id,
            if locked { "locked" } else { "unlocked" }
        ))
    } else {
        Err(format!("Failed to update account status: {}", body))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_user_teams(state: State<'_, AuthState>) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/users/me/teams";

    let auth_header = get_auth_header(&state).await?;
    info!("Feteching users teams with header: {auth_header}");

    let response = client
        .get(url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .unwrap_or_else(|_| "Failed to read response".to_string());

    if status.is_success() {
        info!("Successfully fetched user teams: {}", body);
        Ok(body)
    } else {
        error!(
            "Failed to fetch user teams. Status: {:?}, Body: {}",
            status, body
        );
        Err(format!("Failed to fetch user teams: {}", body))
    }
}
