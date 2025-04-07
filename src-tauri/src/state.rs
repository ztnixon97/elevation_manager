use reqwest::Client;
use std::sync::Arc;

#[derive(Clone)]
pub struct TeamAPIState {
    pub client: Arc<Client>,
    pub api_url: String, // Base URL of Axum API
}

impl TeamAPIState {
    pub fn new(api_url: &str) -> Self {
        Self {
            client: Arc::new(Client::new()),
            api_url: api_url.to_string(),
        }
    }
}
