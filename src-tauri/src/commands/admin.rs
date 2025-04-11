use crate::auth::login::AuthState;
use crate::utils::get_auth_header;
use log::{debug, error, info};
use reqwest::Client;
use tauri::State;

#[tauri::command]
pub async fn get_user_role(
    state: State<'_, AuthState>,
    username: String,
) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/users/{username}/role");

    let auth_header = get_auth_header(&state).await?;
    debug!(
        "🔐 Sending role request with header: {}",
        auth_header.clone()
    );

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        // ✅ Extract just the role from JSON response
        let role: String = match serde_json::from_str::<serde_json::Value>(&response_text) {
            Ok(json) => json["data"].as_str().unwrap_or("unknown").to_string(),
            Err(_) => return Err("Failed to parse role from response".to_string()),
        };

        info!(
            "Successfully retrieved user role for username: {}",
            username
        );
        debug!("Role: {}", role);
        Ok(role)
    } else {
        error!(
            "Failed to retrieve user role. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to retrieve user role: {:?}", response_text))
    }
}

#[tauri::command]
pub async fn get_users(state: State<'_, AuthState>) -> Result<String, String> {
    let client = Client::new();
    let auth_header = get_auth_header(&state)
        .await
        .map_err(|e| format!("Authentication error: {e}"))?;

    let query_url = format!("http://localhost:3000/users");
    info!("Fetrching users");

    let user_response = client
        .get(&query_url)
        .header("Authorization", &auth_header)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch users"))?;

    let status = user_response.status();
    let user_json = user_response
        .text()
        .await
        .unwrap_or_else(|_| "No response".to_string());

    if status.is_success() {
        info!("Successfully retrived users");
        debug!("Respnose: {user_json}");
        Ok(user_json)
    } else {
        error!(
            "Failed to retrieve  users. Status: {:?}, Response: {}",
            status, user_json
        );
        Err(format!("Failed to retrieve  users: {}", user_json))
    }
}
