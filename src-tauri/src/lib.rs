mod auth;
mod commands;
mod state;
mod utils;

use auth::login::{login, register, AuthState}; 
use commands::team::*;
use commands::admin::*;
use commands::products::*;
use commands::users::*;
use commands::userteams::*;
use log::info;
use tauri::State;
use tokio::sync::Mutex;
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_notification;
#[tokio::main]
pub async fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .manage(AuthState {
            token: Mutex::new(None),
        })
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
        ])
        .setup(|_app| {
            log::info!("Tauri app initialized successfully!");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
