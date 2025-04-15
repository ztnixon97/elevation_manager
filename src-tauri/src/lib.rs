mod auth;
mod commands;
mod state;
mod utils;

use auth::login::{login, register, AuthState};
use commands::admin::*;
use commands::notifications::*;
use commands::products::*;
use commands::reviews::*;
use commands::team::*;
use commands::users::*;
use commands::userteams::*;
use commands::contracts::*;
use std::sync::Arc;
use tauri_plugin_notification;
#[tokio::main]
pub async fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .manage(AuthState::default())
        .manage(Arc::new(commands::notifications::PollingState::default()))
        .invoke_handler(tauri::generate_handler![
            login,
            register,
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
            get_all_users,
            add_user_to_team,
            get_all_products,
            get_all_product_types,
            assign_product_to_team,
            remove_product_from_team,
            assign_product_type_to_team,
            assign_task_order_to_team,
            get_team_tasks,
            remove_task_order_from_team,
            remove_product_type_from_team,
            get_users,
            update_user,
            delete_user,
            lock_user,
            get_user_teams,
            request_team_join,
            get_notification_count,
            get_notifications,
            dismiss_notification,
            dismiss_all_notifications,
            show_system_notification,
            start_notification_polling,
            stop_notification_polling,
            manual_refresh_notifications,
            get_user_products,
            checkout_product,
            assign_product_to_user,
            get_product_details,
            get_product_reviews,
            get_team_notifications,
            get_pending_team_requests,
            approve_team_request,
            reject_team_request,
            send_team_notification,
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
            delete_product_assignment,
            get_product_assignments,
            get_contracts,
            get_contract_task_orders,
            get_contract_details,
        ])
        .setup(|_app| {
            log::info!("Tauri app initialized successfully!");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
