// src-tauri/src/lib.rs
mod auth;
mod commands;
mod state;
mod utils;
mod services;  // Add this line

use auth::login::{login, register, AuthState};
use commands::admin::*;
use commands::notifications::*;
use commands::products::*;
use commands::reviews::*;
use commands::team::*;
use commands::users::*;
use commands::userteams::*;
use commands::contracts::*;
use commands::taskorders::*;
use commands::settings::*;

// Add these imports for the new ApiClient
use services::{api_client::ApiClient, config::AppConfig};
use std::sync::Arc;
use tokio::sync::Mutex;

#[tokio::main]
pub async fn run() {
    // Create configuration
    let config = Arc::new(AppConfig::new());
    
    // Create shared auth state
    let auth_state = Arc::new(Mutex::new(AuthState::default()));
    
    // Create shared API client
    let api_client = ApiClient::new((*config).clone(), auth_state.clone());
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .manage(AuthState::default())  // Keep old AuthState for backward compatibility
        .manage(auth_state.clone())    // Add new shared AuthState
        .manage(config.clone())        // Add shared config for polling
        .manage(api_client)            // Add new shared ApiClient
        .manage(Arc::new(commands::notifications::PollingState::default()))
        .invoke_handler(tauri::generate_handler![
            // Auth commands (keep as-is)
            login,
            register,
            get_me,
            
            // Team commands (keep existing until migrated)
            create_team,
            get_all_teams,
            get_team,
            update_team,
            delete_team,
            get_team_users,
            get_team_products,
            get_team_product_types,
            update_user_role,
            remove_user_from_team,
            get_user_role,
            add_user_to_team,
            assign_product_to_team,
            remove_product_from_team,
            assign_product_type_to_team,
            assign_task_order_to_team,
            get_team_tasks,
            remove_task_order_from_team,
            remove_product_type_from_team,
            get_team_notifications,
            get_pending_team_requests,
            approve_team_request,
            reject_team_request,
            send_team_notification,
            
            // User commands (keep existing until migrated)
            get_all_users,
            get_users,
            update_user,
            delete_user,
            lock_user,
            get_user_teams,
            request_team_join,
            change_password,
            get_me_profile,
            
            // Product commands (keep existing until migrated)
            get_all_products,
            get_all_product_types,
            get_user_products,
            create_product,
            create_product_type,
            checkout_product,
            assign_product_to_user,
            get_product_details,
            get_product_reviews,
            delete_product_assignment,
            get_product_assignments,
            update_product,
            update_product_status,
            
            // Review commands (keep existing until migrated)
            save_review_draft,
            load_review_draft,
            convert_image_to_base64,
            create_review,
            get_review,
            update_review,
            get_product_reviews,
            get_user_reviews,
            upload_review_image,
            get_review_images,
            delete_review_image,
            approve_review,
            reject_review,
            submit_review_from_file,
            update_review_from_file,
            sync_review_from_file,
            get_pending_reviews_for_team_lead,
            delete_review,
            
            // Contract commands (keep existing until migrated)
            get_contracts,
            get_contract_details,
            get_contract_task_orders,
            create_contract,
            
            // Task order commands (now unified)
            get_task_order,
            get_taskorder_products,
            create_task_order,
            get_all_taskorders,
            update_task_order,
            check_task_order_edit_permission,
            
            // Notification commands (keep existing until migrated)
            get_notification_count,
            get_notifications,
            dismiss_notification,
            dismiss_all_notifications,
            show_system_notification,
            start_notification_polling,
            stop_notification_polling,
            manual_refresh_notifications,
            
            // Settings commands
            get_settings,
            save_settings,
            reset_settings,
            get_app_info,
            export_settings,
            import_settings,
            apply_font_size,
            apply_display_density,
            update_notification_polling,
            clear_application_cache,
            
            // Add new commands here as you migrate them
            // Example: get_contracts_v2,  // New version using ApiClient
        ])
        .setup(|_app| {
            log::info!("Tauri app initialized successfully!");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}