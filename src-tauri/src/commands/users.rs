use crate::services::api_client::ApiClient;
use log::{debug, error, info};
use serde_json::Value;
use tauri::State;

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_user(api_client: State<'_, ApiClient>, user_id: i32) -> Result<String, String> {
    info!("Deleting user {user_id}");
    api_client.delete(&format!("/users/{}", user_id)).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_user(
    api_client: State<'_, ApiClient>,
    user_id: i32,
    user_data: Value,
) -> Result<String, String> {
    debug!("Updating user {} with data: {}", user_id, user_data);
    api_client.put(&format!("/users/{}", user_id), &user_data).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn lock_user(
    api_client: State<'_, ApiClient>,
    user_id: i32,
    locked: bool,
) -> Result<String, String> {
    use serde_json::json;
    let user_data = json!({ "account_locked": locked });
    info!("Locking/unlocking user {}: {}", user_id, locked);
    api_client.put(&format!("/users/{}", user_id), &user_data).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_user_teams(api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Fetching user teams");
    api_client.get("/users/me/teams").await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_me(
    api_client: State<'_, ApiClient>,
) -> Result<String, String> {
    info!("Fetching current user information");
    api_client.get("/users/me").await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_me_profile(
    api_client: State<'_, ApiClient>,
) -> Result<String, String> {
    info!("Fetching current user profile");
    api_client.get("/users/me/profile").await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn change_password(
    api_client: State<'_, ApiClient>,
    user_id: i32,
    old_password: String,
    new_password: String,
) -> Result<String, String> {
    info!("Changing password for user {}", user_id);
    let password_data = serde_json::json!({
        "old_password": old_password,
        "new_password": new_password,
    });
    api_client.post(&format!("/auth/change_password/{}", user_id), &password_data).await
}