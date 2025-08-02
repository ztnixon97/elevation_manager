// src-tauri/src/commands/notifications.rs

use crate::services::{api_client::ApiClient, config::AppConfig};
use crate::auth::login::AuthState;
use log::{debug, error, info};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tauri::{Emitter, State, Window};
use tauri_plugin_notification::{self, NotificationExt, PermissionState};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

// ======================
// === Data Structures ==
// ======================
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationCountResponse {
    pub total: i64,
    pub unread: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationTarget {
    pub id: i32,
    pub notification_id: i32,
    pub scope: String,
    pub target_id: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationItem {
    pub id: i32,
    pub title: String,
    pub body: Option<String>,
    #[serde(rename = "type")]
    pub type_field: String,
    pub action_type: Option<String>,
    pub action_data: Option<serde_json::Value>,
    pub global: bool,
    pub dismissible: bool,
    pub created_at: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationWithTargets {
    pub notification: NotificationItem,
    pub targets: Vec<NotificationTarget>,
    pub dismissed: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationResponse {
    pub success: bool,
    pub status_code: u16,
    pub message: String,
    pub timestamp: String,
    pub data: Vec<NotificationWithTargets>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CountResponse {
    pub success: bool,
    pub status_code: u16,
    pub message: String,
    pub timestamp: String,
    pub data: NotificationCountResponse,
}

// ===============================
// === Internal Helper Methods ===
// ===============================
//
// These do the actual HTTP requests but take `&AuthState` directly
// instead of Tauri `State<'_, AuthState>`. This lets you call them
// from the polling loop, where you only have `AuthState` without `State`.

/// Internal helper to fetch the current notification count.
async fn get_notification_count_internal(auth_state: &crate::auth::login::AuthState) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = "http://localhost:3000/notifications/count".to_string();

    // NEW: call get_auth_header_internal(...) instead of get_auth_header(...)
    let auth_header = crate::utils::get_auth_header_internal(auth_state).await?;

    info!("Fetching notification count...");

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {e}");
            format!("Request failed: {e}")
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retrieved notification count");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!(
            "Failed to retrieve notification count. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!(
            "Failed to retrieve notification count: {:?}",
            response_text
        ))
    }
}

/// Internal helper to fetch all notifications for the current user.
async fn get_notifications_internal(auth_state: &crate::auth::login::AuthState) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = "http://localhost:3000/notifications?include_dismissed=false".to_string();

    // NEW: call get_auth_header_internal(...) instead of get_auth_header(...)
    let auth_header = crate::utils::get_auth_header_internal(auth_state).await?;

    info!("Fetching notifications...");

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {e}");
            format!("Request failed: {e}")
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retrieved notifications");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!(
            "Failed to retrieve notifications. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!(
            "Failed to retrieve notifications: {:?}",
            response_text
        ))
    }
}

// ===============================
// === Tauri Commands (Public) ===
// ===============================

/// Tauri command that fetches the current notification count.
#[tauri::command]
pub async fn get_notification_count(api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Fetching notification count...");
    api_client.get("/notifications/count").await
}

/// Tauri command that fetches notifications for the current user.
#[tauri::command]
pub async fn get_notifications(api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Fetching notifications...");
    api_client.get("/notifications?include_dismissed=false").await
}

/// Tauri command that dismisses a specific notification.
#[tauri::command]
pub async fn dismiss_notification(
    api_client: State<'_, ApiClient>,
    notification_id: i32,
) -> Result<(), String> {
    info!("Dismissing notification {notification_id}...");
    api_client.post(&format!("/notifications/{}/dismiss", notification_id), &()).await?;
    Ok(())
}

/// Tauri command that dismisses all notifications.
#[tauri::command]
pub async fn dismiss_all_notifications(api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Dismissing all notifications...");
    api_client.post("/notifications/dismiss-all", &()).await
}

/// Tauri command that shows a system notification (using the Tauri plugin).
#[tauri::command]
pub async fn show_system_notification(
    window: Window,
    title: String,
    body: String,
) -> Result<(), String> {
    info!("Showing system notification: {title} - {body}");

    match window.notification().permission_state() {
        Ok(PermissionState::Granted) => {
            window
                .notification()
                .builder()
                .title(title)
                .body(body)
                .show()
                .map_err(|e| {
                    error!("Failed to show notification: {e}");
                    format!("Failed to show notification: {e}")
                })?;
        }
        Ok(PermissionState::Prompt) => {
            if let Err(e) = window.notification().request_permission() {
                return Err(format!("failed to request notification permission: {e}"));
            }
        }
        Ok(PermissionState::Denied) => {
            info!("Notification permission denied by the user.");
        }
        Err(e) => {
            return Err(format!("Failed to retrieve permission state: {e}"));
        }
        _ => {
            return Err("Shouldn't have gotten here (Android-only case)".to_string());
        }
    }

    Ok(())
}

// =============================
// === Polling-Related State ===
// =============================

// Polling state now holds ApiClient
#[derive(Debug, Default)]
pub struct PollingState {
    pub task_handle: Mutex<Option<JoinHandle<()>>>,
}

/// Start background notification polling in a spawned task.
#[tauri::command]
pub async fn start_notification_polling(
    window: Window,
    auth_state: State<'_, Arc<Mutex<AuthState>>>,
    config: State<'_, Arc<AppConfig>>,
    polling_state: State<'_, Arc<PollingState>>,
) -> Result<(), String> {
    info!("Starting notification polling...");
    let polling_client = ApiClient::new((**config).clone(), auth_state.inner().clone());
    let window = window.clone();
    let mut task_handle = polling_state.task_handle.lock().await;
    if task_handle.is_some() {
        return Ok(());
    }
    let handle = tokio::spawn(async move {
        loop {
            match polling_client.get("/notifications/count").await {
                Ok(count) => {
                    let _ = window.emit("notification_count", count);
                }
                Err(e) => {
                    error!("Polling error: {}", e);
                }
            }
            match polling_client.get("/notifications?include_dismissed=false").await {
                Ok(notifications) => {
                    let _ = window.emit("notifications", notifications);
                }
                Err(e) => {
                    error!("Polling error: {}", e);
                }
            }
            tokio::time::sleep(Duration::from_secs(30)).await;
        }
    });
    *task_handle = Some(handle);
    Ok(())
}

/// Stop notification polling
#[tauri::command]
pub async fn stop_notification_polling(
    polling_state: State<'_, Arc<PollingState>>,
) -> Result<(), String> {
    let mut task_handle = polling_state.task_handle.lock().await;
    if let Some(handle) = task_handle.take() {
        handle.abort();
    }
    Ok(())
}

/// Manually refresh notifications (front-end triggers this on demand).
#[tauri::command]
pub async fn manual_refresh_notifications(
    window: Window,
    api_client: State<'_, ApiClient>,
) -> Result<(), String> {
    info!("Manual refresh of notifications requested");
    match api_client.get("/notifications/count").await {
        Ok(count) => {
            let _ = window.emit("notification_count", count);
        }
        Err(e) => {
            error!("Manual refresh error: {}", e);
        }
    }
    match api_client.get("/notifications?include_dismissed=false").await {
        Ok(notifications) => {
            let _ = window.emit("notifications", notifications);
        }
        Err(e) => {
            error!("Manual refresh error: {}", e);
        }
    }
    Ok(())
}
