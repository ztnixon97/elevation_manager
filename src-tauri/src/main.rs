// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod auth;
mod services;
mod utils;


fn main() {
    elevation_manager_lib::run()
}
