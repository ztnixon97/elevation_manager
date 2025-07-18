use std::env;

use crate::services::api_client;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub api_base_url: String,
    pub api_timeout_seconds: u64,
}

impl AppConfig {
    pub fn new() -> Self {
        Self {
            api_base_url: env::var("API_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string()),
            api_timeout_seconds: env::var("API_TIMEOUT_SECONDS")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .unwrap_or(30),
        }
    }
}
