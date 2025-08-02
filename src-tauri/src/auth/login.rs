use log::{error, info};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;

// 🔹 AuthState (modified)
#[derive(Debug, Default, Clone)]
pub struct AuthState {
    pub token: std::sync::Arc<Mutex<Option<String>>>,
}

// 🔹 Request & Response Structures
#[derive(Serialize)]
struct AuthRequest {
    username: String,
    password: String,
}

#[derive(Serialize)]
struct RegisterRequest {
    username: String,
    password: String,
    role: String,
}

#[derive(Deserialize)]
struct AuthResponse {
    token: String,
    role: String,
}

// 🔹 Login Function
#[tauri::command]
#[allow(dead_code)] // The code is being fasly flagged as dead by clippy
pub async fn login(
    state: State<'_, AuthState>,
    api_client: State<'_, crate::services::api_client::ApiClient>,
    username: String,
    password: String,
) -> Result<(String, String), String> {
    // Prepare the request body
    let request_body = serde_json::json!({
        "username": username,
        "password": password,
    });

    // Use the ApiClient for the login request
    let response = api_client
        .post_no_auth("/auth/login", &request_body)
        .await?;

    // Parse the response
    let body: AuthResponse = serde_json::from_str(&response)
        .map_err(|e| format!("❌ JSON parsing error: {e}"))?;

    // Update legacy AuthState
    let mut token_guard = state.token.lock().await;
    *token_guard = Some(body.token.clone());

    // Also update ApiClient's auth_state
    api_client.set_token(body.token.clone()).await;

    info!("✅ Login successful! Token and role stored.");
    Ok((body.token, body.role))
}

// 🔹 Register Function
#[tauri::command]
#[allow(dead_code)]
pub async fn register(
    state: State<'_, AuthState>,
    api_client: State<'_, crate::services::api_client::ApiClient>,
    username: String,
    password: String,
) -> Result<String, String> {
    // Prepare the request body
    let request_body = serde_json::json!({
        "username": username,
        "password": password,
        "role": "user",
    });

    // Use the ApiClient for the registration request
    let response = api_client
        .post_no_auth("/auth/register", &request_body)
        .await?;

    // Parse the response to check for success
    let response_json: serde_json::Value = serde_json::from_str(&response)
        .map_err(|e| format!("❌ JSON parsing error: {e}"))?;

    info!("🔐 Registration response: {:?}", response_json);
    if response_json.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
        info!("✅ Registration succeeded. Proceeding to login.");
        // Automatically login after registration
        login(state, api_client, username, password)
            .await
            .map(|_| "Registration and login successful!".to_string())
    } else {
        let maybe_msg = response_json.get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Registration failed. Try again.");
        error!("🚫 Registration failed: {}", maybe_msg);
        Err(maybe_msg.to_string())
    }
}
