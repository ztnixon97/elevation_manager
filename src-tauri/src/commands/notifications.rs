// src-tauri/src/commands/notifications.rs
use crate::auth::login::AuthState;
use log::{error, info, debug};
use reqwest::Client;
use tauri::{ State, Window};
use tauri_plugin_notification::{self, NotificationExt, PermissionState};
use serde::{Deserialize, Serialize};
use crate::utils::get_auth_header;

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

/// Fetch the current notification count
#[tauri::command]
pub async fn get_notification_count(state: State<'_, AuthState>) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/notifications/count".to_string();

    let auth_header = get_auth_header(&state).await?;

    info!("Fetching notification count...");

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {e}")
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retrieved notification count");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!("Failed to retrieve notification count. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to retrieve notification count: {:?}", response_text))
    }
}

/// Fetch all notifications for the current user
#[tauri::command]
pub async fn get_notifications(state: State<'_, AuthState>) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/notifications?include_dismissed=false".to_string();

    let auth_header = get_auth_header(&state).await?;

    info!("Fetching notifications...");

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {e}")
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retrieved notifications");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!("Failed to retrieve notifications. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to retrieve notifications: {:?}", response_text))
    }
}

/// Dismiss a notification
#[tauri::command]
pub async fn dismiss_notification(state: State<'_, AuthState>, notification_id: i32) -> Result<(), String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/notifications/{}/dismiss", notification_id);

    let auth_header = get_auth_header(&state).await?;

    info!("Dismissing notification {}...", notification_id);

    let response = client
        .post(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {e}")
        })?;
    
    let status = response.status();
    
    if status.is_success() {
        info!("Successfully dismissed notification {}", notification_id);
        Ok(())
    } else {
        let response_text = response.text().await.unwrap_or_default();
        error!("Failed to dismiss notification. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to dismiss notification: {:?}", response_text))
    }
}

/// Dismiss all notifications
#[tauri::command]
pub async fn dismiss_all_notifications(state: State<'_, AuthState>) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/notifications/dismiss-all".to_string();

    let auth_header = get_auth_header(&state).await?;

    info!("Dismissing all notifications...");

    let response = client
        .post(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {e}")
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully dismissed all notifications");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!("Failed to dismiss all notifications. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to dismiss all notifications: {:?}", response_text))
    }
}

/// Show a system notification
#[tauri::command]
pub async fn show_system_notification(window: Window, title: String, body: String) -> Result<(), String> {
    info!("showing system notification: {title} - {body}");

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
            return Err(format!("Failed to retrive permission state: {e}"))
        }
        _ => {
            return Err("shouldn't have gotten here, this is for android only".to_string())
        }
    }

    
    Ok(())
}
// TODO! Fix this funtion
// #[tauri::command]
// pub async fn start_notification_polling(window: Window, state: State<'_, AuthState>) -> Result<(), String> {
//     info!("Starting notification polling...");
    
//     let window_clone = window.clone();
//     let state_clone = state.inner().clone();
    
//     // Spawn polling task
//     tauri::async_runtime::spawn(async move {
//         let mut last_count = 0;
        
//         loop {
//             if let Ok(auth_guard) = state_clone.token.lock().await {
//                 if auth_guard.is_some() {
//                     // Only poll if logged in
//                     match get_notification_count(State::new(state_clone.clone())).await {
//                         Ok(count_json) => {
//                             if let Ok(count_resp) = serde_json::from_str::<CountResponse>(&count_json) {
//                                 let unread = count_resp.data.unread;
                                
//                                 // Emit event to update UI
//                                 let _ = window_clone.emit("notification_count_updated", unread);
                                
//                                 // If there are new notifications
//                                 if unread > last_count && last_count > 0 {
//                                     // Get details of new notifications
//                                     if let Ok(notif_json) = get_notifications(State::new(state_clone.clone())).await {
//                                         if let Ok(notif_resp) = serde_json::from_str::<NotificationResponse>(&notif_json) {
//                                             // Find and show the new notifications
//                                             for notif in notif_resp.data.iter().take((unread - last_count) as usize) {
//                                                 let title = &notif.notification.title;
//                                                 let body = notif.notification.body.clone().unwrap_or_default();
                                                
//                                                 // Show system notification
//                                                 let _ = Notification::new(&window_clone.app_handle().config().tauri.bundle.identifier)
//                                                     .title(title)
//                                                     .body(body)
//                                                     .show();
                                                
//                                                 // Also emit event for the app to handle
//                                                 let _ = window_clone.emit("new_notification", notif.clone());
//                                             }
//                                         }
//                                     }
//                                 }
                                
//                                 last_count = unread;
//                             }
//                         }
//                         Err(e) => error!("Error polling notifications: {}", e),
//                     }
//                 }
//             }
            
//             // Sleep for 1 minute before polling again
//             tokio::time::sleep(std::time::Duration::from_secs(60)).await;
//         }
//     });
    
//     Ok(())
// }
