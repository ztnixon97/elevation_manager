// src-tauri/src/commands/notifications.rs

use crate::auth::login::AuthState;
use crate::utils::{
    get_auth_header,          // for Tauri commands
    get_auth_header_internal, // for internal/polling
};
use log::{debug, error, info};
use reqwest::Client;
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
async fn get_notification_count_internal(auth_state: &AuthState) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/notifications/count".to_string();

    // NEW: call get_auth_header_internal(...) instead of get_auth_header(...)
    let auth_header = get_auth_header_internal(auth_state).await?;

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
async fn get_notifications_internal(auth_state: &AuthState) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/notifications?include_dismissed=false".to_string();

    // NEW: call get_auth_header_internal(...) instead of get_auth_header(...)
    let auth_header = get_auth_header_internal(auth_state).await?;

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
pub async fn get_notification_count(state: State<'_, AuthState>) -> Result<String, String> {
    // Tauri command → we can still use get_notification_header(...) with `State<'_, AuthState>`
    // (But here we’re just reusing get_notification_count_internal for simplicity.)
    get_notification_count_internal(&state).await
}

/// Tauri command that fetches notifications for the current user.
#[tauri::command]
pub async fn get_notifications(state: State<'_, AuthState>) -> Result<String, String> {
    // Tauri command → we can still use get_notification_header(...) with `State<'_, AuthState>`
    // (But here we’re just reusing get_notifications_internal for simplicity.)
    get_notifications_internal(&state).await
}

/// Tauri command that dismisses a specific notification.
#[tauri::command]
pub async fn dismiss_notification(
    state: State<'_, AuthState>,
    notification_id: i32,
) -> Result<(), String> {
    let client = Client::new();
    let url = format!(
        "http://localhost:3000/notifications/{}/dismiss",
        notification_id
    );

    // Tauri command → can use the original get_auth_header(...) function
    let auth_header = get_auth_header(&state).await?;

    info!("Dismissing notification {notification_id}...");

    let response = client
        .post(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {e}");
            format!("Request failed: {e}")
        })?;

    let status = response.status();

    if status.is_success() {
        info!("Successfully dismissed notification {notification_id}");
        Ok(())
    } else {
        let response_text = response.text().await.unwrap_or_default();
        error!("Failed to dismiss notification. Status: {status:?}, Response: {response_text}");
        Err(format!("Failed to dismiss notification: {response_text:?}"))
    }
}

/// Tauri command that dismisses all notifications.
#[tauri::command]
pub async fn dismiss_all_notifications(state: State<'_, AuthState>) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/notifications/dismiss-all".to_string();

    // Tauri command → can use the original get_auth_header(...) function
    let auth_header = get_auth_header(&state).await?;

    info!("Dismissing all notifications...");

    let response = client
        .post(&url)
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
        info!("Successfully dismissed all notifications");
        debug!("Response: {response_text}");
        Ok(response_text)
    } else {
        error!(
            "Failed to dismiss all notifications. Status: {status:?}, Response: {response_text}"
        );
        Err(format!(
            "Failed to dismiss all notifications: {response_text:?}"
        ))
    }
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

#[derive(Debug, Default)]
pub struct PollingState {
    pub task_handle: Mutex<Option<JoinHandle<()>>>,
}

/// Start background notification polling in a spawned task.
#[tauri::command]
pub async fn start_notification_polling(
    window: Window,
    state: State<'_, AuthState>,
    polling_state: State<'_, Arc<PollingState>>,
) -> Result<(), String> {
    info!("Starting notification polling...");

    // Check if polling is already active.
    let mut handle_guard = polling_state.task_handle.lock().await;
    if handle_guard.is_some() {
        info!("Notification polling already active");
        return Ok(()); // Already polling
    }

    // Clone what we need for the async task.
    let window_clone = window.clone();
    let state_clone = state.inner().clone(); // your AuthState must be Clone

    let handle = tokio::spawn(async move {
        let mut last_count: i64 = 0;
        let mut error_count = 0;
        let mut backoff_seconds = 10; // initial backoff
        let mut consecutive_success = 0;

        loop {
            // If no token => skip polling
            let guard = state_clone.token.lock().await;
            let should_poll = guard.is_some();
            drop(guard); // explicitly drop the guard so we don't hold the lock

            if !should_poll {
                tokio::time::sleep(Duration::from_secs(10)).await;
                continue;
            }

            // If too many consecutive errors, back off
            if error_count > 5 {
                info!(
                    "Multiple errors in notification polling, backing off for {backoff_seconds} seconds"
                );
                tokio::time::sleep(Duration::from_secs(backoff_seconds)).await;
                backoff_seconds = (backoff_seconds * 2).min(300); // max 5 min
                error_count = 0;
                continue;
            }

            // Fetch the notification count
            match get_notification_count_internal(&state_clone).await {
                Ok(count_json) => match serde_json::from_str::<CountResponse>(&count_json) {
                    Ok(count_resp) => {
                        let unread_count = count_resp.data.unread;

                        // Emit event so UI can update
                        if let Err(e) =
                            window_clone.emit("notification_count_updated", unread_count)
                        {
                            error!("Failed to emit notification count event: {e}");
                            error_count += 1;
                        }

                        // If we have new notifications, fetch them
                        if unread_count > last_count && last_count > 0 {
                            match get_notifications_internal(&state_clone).await {
                                Ok(notif_json) => {
                                    match serde_json::from_str::<NotificationResponse>(&notif_json)
                                    {
                                        Ok(notif_resp) => {
                                            // Take as many new notifs as the difference
                                            let added = (unread_count - last_count) as usize;
                                            let new_notifs = &notif_resp.data
                                                [..added.min(notif_resp.data.len())];

                                            for notif in new_notifs {
                                                let title = &notif.notification.title;
                                                let body = notif
                                                    .notification
                                                    .body
                                                    .clone()
                                                    .unwrap_or_default();

                                                // Show system notification
                                                if let Err(e) = show_system_notification(
                                                    window_clone.clone(),
                                                    title.clone(),
                                                    body,
                                                )
                                                .await
                                                {
                                                    error!(
                                                        "Failed to show system notification: {e}"
                                                    );
                                                }

                                                // Emit event for the app
                                                if let Err(e) =
                                                    window_clone.emit("new_notification", notif)
                                                {
                                                    error!("Failed to emit new notification event: {e}");
                                                }
                                            }
                                        }
                                        Err(e) => {
                                            error!("Failed to parse notifications: {e}");
                                            error_count += 1;
                                        }
                                    }
                                }
                                Err(e) => {
                                    error!("Failed to fetch notifications: {e}");
                                    error_count += 1;
                                }
                            }
                        }

                        last_count = unread_count;
                        // Reset error counters
                        error_count = 0;
                        consecutive_success += 1;

                        // After a few successes, reset backoff
                        if consecutive_success >= 3 {
                            backoff_seconds = 10;
                            consecutive_success = 0;
                        }
                    }
                    Err(e) => {
                        error!("Failed to parse notification count: {e}");
                        error_count += 1;
                    }
                },
                Err(e) => {
                    // If it's not an auth-related error, increment error count
                    if !e.contains("No valid authentication token found") {
                        error!("Error polling notifications: {e}");
                        error_count += 1;
                    }
                }
            }

            // Wait for next poll
            tokio::time::sleep(Duration::from_secs(30)).await;
        }
    });

    // Store handle to task
    *handle_guard = Some(handle);

    Ok(())
}

/// Stop notification polling
#[tauri::command]
pub async fn stop_notification_polling(
    polling_state: State<'_, Arc<PollingState>>,
) -> Result<(), String> {
    info!("Stopping notification polling...");

    let mut handle_guard = polling_state.task_handle.lock().await;
    if let Some(handle) = handle_guard.take() {
        handle.abort();
        info!("Notification polling stopped");
    }

    Ok(())
}

/// Manually refresh notifications (front-end triggers this on demand).
#[tauri::command]
pub async fn manual_refresh_notifications(
    window: Window,
    state: State<'_, AuthState>,
) -> Result<(), String> {
    info!("Manual refresh of notifications requested");

    // 1) Get notification count
    match get_notification_count_internal(&state).await {
        Ok(count_json) => match serde_json::from_str::<CountResponse>(&count_json) {
            Ok(count_resp) => {
                let unread_count = count_resp.data.unread;

                // Emit event to update UI with count
                if let Err(e) = window.emit("notification_count_updated", unread_count) {
                    error!("Failed to emit notification count event: {e}");
                }

                // 2) Get full notifications
                match get_notifications_internal(&state).await {
                    Ok(notif_json) => {
                        match serde_json::from_str::<NotificationResponse>(&notif_json) {
                            Ok(notif_resp) => {
                                // Emit event with full notifications
                                if let Err(e) =
                                    window.emit("notifications_refreshed", &notif_resp.data)
                                {
                                    error!("Failed to emit notifications refresh event: {e}");
                                    return Err(format!("Failed to notify frontend: {e}"));
                                }

                                info!("Manual refresh completed successfully");
                                Ok(())
                            }
                            Err(e) => {
                                error!("Failed to parse notifications: {e}");
                                Err(format!("Failed to parse notifications: {e}"))
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to fetch notifications: {e}");
                        Err(format!("Failed to fetch notifications: {e}"))
                    }
                }
            }
            Err(e) => {
                error!("Failed to parse notification count: {e}");
                Err(format!("Failed to parse notification count: {e}"))
            }
        },
        Err(e) => {
            error!("Error fetching notification count: {e}");
            Err(format!("Error fetching notification count: {e}"))
        }
    }
}
