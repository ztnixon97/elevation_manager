// src-tauri/src/commands/settings.rs

use crate::services::api_client::ApiClient;
use log::{debug, info};
use serde::{Deserialize, Serialize};
use tauri::State;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub theme: String,
    pub notifications: NotificationSettings,
    pub display: DisplaySettings,
    pub security: SecuritySettings,
    pub data: DataSettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationSettings {
    pub enabled: bool,
    pub sound: bool,
    pub desktop: bool,
    pub email: bool,
    pub polling_interval: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DisplaySettings {
    pub density: String,
    pub font_size: i32,
    pub show_animations: bool,
    pub auto_refresh: bool,
    pub refresh_interval: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecuritySettings {
    pub auto_lock: bool,
    pub lock_timeout: i32,
    pub require_password: bool,
    pub session_timeout: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DataSettings {
    pub auto_save: bool,
    pub save_interval: i32,
    pub max_history_items: i32,
    pub clear_cache_on_exit: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            theme: "system".to_string(),
            notifications: NotificationSettings {
                enabled: true,
                sound: true,
                desktop: true,
                email: false,
                polling_interval: 30,
            },
            display: DisplaySettings {
                density: "comfortable".to_string(),
                font_size: 14,
                show_animations: true,
                auto_refresh: true,
                refresh_interval: 60,
            },
            security: SecuritySettings {
                auto_lock: false,
                lock_timeout: 30,
                require_password: true,
                session_timeout: 1440,
            },
            data: DataSettings {
                auto_save: true,
                save_interval: 5,
                max_history_items: 100,
                clear_cache_on_exit: false,
            },
        }
    }
}

/// Tauri command to get user settings
#[tauri::command]
pub async fn get_settings(_api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Fetching user settings...");
    
    // Try to load from local storage first
    if let Ok(stored_settings) = tauri::api::path::app_local_data_dir() {
        let settings_path = stored_settings.join("settings.json");
        if let Ok(contents) = std::fs::read_to_string(settings_path) {
            if let Ok(settings) = serde_json::from_str::<Settings>(&contents) {
                debug!("Loaded settings from storage");
                return Ok(serde_json::to_string(&settings)
                    .map_err(|e| format!("Failed to serialize settings: {}", e))?);
            }
        }
    }
    
    // Return default settings if no stored settings found
    let default_settings = Settings::default();
    let settings_json = serde_json::to_string(&default_settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    Ok(settings_json)
}

/// Tauri command to save user settings
#[tauri::command]
pub async fn save_settings(
    _api_client: State<'_, ApiClient>,
    settings: String,
) -> Result<(), String> {
    info!("Saving user settings...");
    
    // Parse the settings JSON
    let settings: Settings = serde_json::from_str(&settings)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;

    // Save to local storage
    if let Ok(app_data_dir) = tauri::api::path::app_local_data_dir() {
        let settings_path = app_data_dir.join("settings.json");
        
        // Create directory if it doesn't exist
        if let Some(parent) = settings_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        
        let settings_json = serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        
        std::fs::write(settings_path, settings_json)
            .map_err(|e| format!("Failed to write settings file: {}", e))?;
        
        debug!("Settings saved to storage: {:?}", settings);
    }

    Ok(())
}

/// Tauri command to reset settings to defaults
#[tauri::command]
pub async fn reset_settings(_api_client: State<'_, ApiClient>) -> Result<(), String> {
    info!("Resetting settings to defaults...");
    
    // Delete the settings file if it exists
    if let Ok(app_data_dir) = tauri::api::path::app_local_data_dir() {
        let settings_path = app_data_dir.join("settings.json");
        let _ = std::fs::remove_file(settings_path);
    }

    Ok(())
}

/// Tauri command to get application info
#[tauri::command]
pub async fn get_app_info() -> Result<String, String> {
    info!("Fetching application info...");
    
    let app_info = serde_json::json!({
        "name": "Elevation Manager",
        "version": env!("CARGO_PKG_VERSION"),
        "description": "A comprehensive elevation data management system",
        "author": "Your Organization",
        "license": "MIT",
        "features": [
            "User Management",
            "Team Collaboration",
            "Product Management",
            "Review System",
            "Contract Management",
            "Task Order Management",
            "Notification System",
            "Profile Management",
            "Settings Configuration"
        ]
    });

    Ok(app_info.to_string())
}

/// Tauri command to export settings
#[tauri::command]
pub async fn export_settings(_api_client: State<'_, ApiClient>) -> Result<String, String> {
    info!("Exporting settings...");
    
    // Get current settings
    let settings = get_settings(_api_client).await?;
    
    // Add export metadata
    let export_data = serde_json::json!({
        "exported_at": chrono::Utc::now().to_rfc3339(),
        "app_version": env!("CARGO_PKG_VERSION"),
        "settings": serde_json::from_str::<serde_json::Value>(&settings)
            .map_err(|e| format!("Failed to parse settings for export: {}", e))?
    });

    Ok(export_data.to_string())
}

/// Tauri command to import settings
#[tauri::command]
pub async fn import_settings(
    _api_client: State<'_, ApiClient>,
    settings_data: String,
) -> Result<(), String> {
    info!("Importing settings...");
    
    // Parse the import data
    let import_data: serde_json::Value = serde_json::from_str(&settings_data)
        .map_err(|e| format!("Failed to parse import data: {}", e))?;

    // Validate the import data
    if !import_data.is_object() {
        return Err("Invalid import data format".to_string());
    }

    // Extract settings from import data
    let settings_value = import_data.get("settings")
        .ok_or("No settings found in import data")?;

    // Convert back to string for saving
    let settings_string = serde_json::to_string(settings_value)
        .map_err(|e| format!("Failed to serialize imported settings: {}", e))?;

    // Save the imported settings
    save_settings(_api_client, settings_string).await?;

    Ok(())
}

/// Tauri command to apply font size setting
#[tauri::command]
pub async fn apply_font_size(font_size: i32) -> Result<(), String> {
    info!("Applying font size: {}", font_size);
    
    // Validate font size range
    if font_size < 10 || font_size > 24 {
        return Err("Font size must be between 10 and 24".to_string());
    }
    
    // This will be handled by the frontend CSS custom properties
    Ok(())
}

/// Tauri command to apply display density setting
#[tauri::command]
pub async fn apply_display_density(density: String) -> Result<(), String> {
    info!("Applying display density: {}", density);
    
    // Validate density options
    match density.as_str() {
        "compact" | "comfortable" | "spacious" => Ok(()),
        _ => Err("Invalid density option".to_string()),
    }
}

/// Tauri command to update notification polling interval
#[tauri::command]
pub async fn update_notification_polling(interval: i32) -> Result<(), String> {
    info!("Updating notification polling interval: {}", interval);
    
    // Validate interval range
    if interval < 10 || interval > 300 {
        return Err("Polling interval must be between 10 and 300 seconds".to_string());
    }
    
    // This will be handled by the notification system
    Ok(())
}

/// Tauri command to clear application cache
#[tauri::command]
pub async fn clear_application_cache() -> Result<(), String> {
    info!("Clearing application cache...");
    
    // Clear various cache directories
    if let Ok(app_data_dir) = tauri::api::path::app_local_data_dir() {
        let cache_dir = app_data_dir.join("cache");
        let _ = std::fs::remove_dir_all(cache_dir);
    }
    
    Ok(())
} 