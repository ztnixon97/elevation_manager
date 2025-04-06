use log::{error, info};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;

// 🔹 Store JWT Token
#[derive(Default)]
pub struct AuthState {
    pub token: Mutex<Option<String>>,
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
pub async fn login(
    state: State<'_, AuthState>,
    username: String,
    password: String,
) -> Result<(String, String), String> {
    let client = Client::new();
    let login_url = "http://localhost:3000/auth/login";

    let username_clone = username.clone();
    info!("🔄 Attempting login for user: {}", username_clone);

    let request_body = AuthRequest { username, password };
    info!("📩 Request JSON: {}", serde_json::to_string(&request_body).unwrap());

    let response = client
        .post(login_url)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("❌ Network error: {e}"))?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_else(|_| "No response body".to_string());

    info!("📡 Response Status: {:?}", status);
    info!("📜 Response Body: {}", response_text);

    if status.is_success() {
        let body: AuthResponse = serde_json::from_str(&response_text)
            .map_err(|e| format!("❌ JSON parsing error: {e}"))?;

        let mut token = state.token.lock().await;
        *token = Some(body.token.clone());

        info!("✅ Login successful! Token and role stored.");
        Ok((body.token, body.role))
    } else {
        let error_message = serde_json::from_str::<serde_json::Value>(&response_text)
            .ok()
            .and_then(|json| json.get("message").and_then(|m| m.as_str().map(|s| s.to_string())))
            .unwrap_or_else(|| "Unknown error".to_string());

        error!("🚫 Login failed for user {}: {}", username_clone, error_message);
        Err(error_message)
    }
}




// 🔹 Register Function
#[tauri::command]
pub async fn register(
    state: State<'_, AuthState>,
    username: String,
    password: String,
) -> Result<String, String> {
    let client = Client::new();
    let register_url = "http://localhost:3000/auth/register";

    info!("🔐 Registering new user: {}", username);

    let request_body = RegisterRequest {
        username: username.clone(),
        password: password.clone(),
        role: "user".to_string(),
    };

    info!("📤 Request JSON: {}", serde_json::to_string(&request_body).unwrap());

    let response = client
        .post(register_url)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("❌ Network error: {e}"))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .unwrap_or_else(|_| "No response body".to_string());

    info!("📡 Response Status: {:?}", status);
    info!("📜 Response Body: {}", response_text);

    if status.is_success() {
        info!("✅ Registration succeeded. Proceeding to login.");

        // Automatically login after registration
        login(state, username, password).await
            .map(|_| "Registration and login successful!".to_string())
    } else {
        let maybe_msg = serde_json::from_str::<serde_json::Value>(&response_text)
            .ok()
            .and_then(|v| v.get("message").and_then(|m| m.as_str().map(|s| s.to_string())))
            .unwrap_or_else(|| "Registration failed. Try again.".to_string());

        error!("🚫 Registration failed: {}", maybe_msg);
        Err(maybe_msg)
    }
}


