use crate::auth::login::AuthState;
use log::{error, info, debug};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::State;

pub async fn get_auth_header(state: &State<'_, AuthState>) -> Result<String, String> {
    let token_guard = state.token.lock().await;
    if let Some(token) = &*token_guard {
        info!("Successfully retrieved authentication token.");
        Ok(format!("Bearer {}", token))
    } else {
        error!("Failed to retrieve authentication token. User is not logged in.");
        Err("No valid authentication token found. Please log in.".to_string())
    }
}

pub async fn get_auth_header_internal(auth_state: &AuthState) -> Result<String, String> {
    let token_guard = auth_state.token.lock().await;
    if let Some(token) = &*token_guard {
        Ok(format!("Bearer {token}"))
    } else {
        Err("No valid authentication token found. Please log in".to_string())
    }
}
