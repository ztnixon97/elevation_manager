use crate::auth::login::AuthState;
use crate::services::config::AppConfig;
use crate::utils::get_auth_header_internal;
use log::{debug, error};
use reqwest::{Client, Method};
use serde::Serialize;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;

pub struct ApiClient {
    client: Client,
    config: AppConfig,
    auth_state: Arc<Mutex<AuthState>>,
}

impl ApiClient {
    pub fn new(config: AppConfig, auth_state: Arc<Mutex<AuthState>>) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.api_timeout_seconds))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            config,
            auth_state,
        }
    }

    // GET request - returns raw string
    pub async fn get(&self, endpoint: &str) -> Result<String, String> {
        self.request(Method::GET, endpoint, None::<&()>).await
    }

    // POST request - returns raw string
    pub async fn post<T: Serialize>(&self, endpoint: &str, body: &T) -> Result<String, String> {
        self.request(Method::POST, endpoint, Some(body)).await
    }

    // PUT request - returns raw string
    pub async fn put<T: Serialize>(&self, endpoint: &str, body: &T) -> Result<String, String> {
        self.request(Method::PUT, endpoint, Some(body)).await
    }

    // DELETE request - returns raw string
    pub async fn delete(&self, endpoint: &str) -> Result<String, String> {
        self.request(Method::DELETE, endpoint, None::<&()>).await
    }

    // Multipart form upload
    pub async fn post_multipart(
        &self,
        endpoint: &str,
        form: reqwest::multipart::Form,
    ) -> Result<String, String> {
        let auth_header = {
            let auth_state = self.auth_state.lock().await;
            get_auth_header_internal(&*auth_state).await?
        };
        let url = format!("{}{}", self.config.api_base_url, endpoint);
        
        debug!("POST (multipart) request to: {}", url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", auth_header)
            .multipart(form)
            .send()
            .await
            .map_err(|e| {
                error!("Request failed: {}", e);
                format!("Request failed: {}", e)
            })?;

        self.handle_response(response).await
    }

    // GET request without auth
    pub async fn get_no_auth(&self, endpoint: &str) -> Result<String, String> {
        self.request_no_auth(Method::GET, endpoint, None::<&()>).await
    }

    // POST request without auth
    pub async fn post_no_auth<T: Serialize>(&self, endpoint: &str, body: &T) -> Result<String, String> {
        self.request_no_auth(Method::POST, endpoint, Some(body)).await
    }

    // PUT request without auth
    pub async fn put_no_auth<T: Serialize>(&self, endpoint: &str, body: &T) -> Result<String, String> {
        self.request_no_auth(Method::PUT, endpoint, Some(body)).await
    }

    // DELETE request without auth
    pub async fn delete_no_auth(&self, endpoint: &str) -> Result<String, String> {
        self.request_no_auth(Method::DELETE, endpoint, None::<&()>).await
    }

    pub async fn set_token(&self, token: String) {
        let mut auth_state = self.auth_state.lock().await;
        let mut token_guard = auth_state.token.lock().await;
        *token_guard = Some(token);
    }

    // Internal method to handle all HTTP requests
    async fn request<T: Serialize>(
        &self,
        method: Method,
        endpoint: &str,
        body: Option<&T>,
    ) -> Result<String, String> {
        let auth_header = {
            let auth_state = self.auth_state.lock().await;
            get_auth_header_internal(&*auth_state).await?
        };
        let url = format!("{}{}", self.config.api_base_url, endpoint);
        
        debug!("{} request to: {}", method, url);
        
        let mut request = self.client
            .request(method, &url)
            .header("Authorization", auth_header)
            .header("Content-Type", "application/json");

        if let Some(body) = body {
            request = request.json(body);
        }

        let response = request.send().await.map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;

        self.handle_response(response).await
    }

    async fn request_no_auth<T: Serialize>(
        &self,
        method: Method,
        endpoint: &str,
        body: Option<&T>,
    ) -> Result<String, String> {
        let url = format!("{}{}", self.config.api_base_url, endpoint);
        debug!("{} request (no auth) to: {}", method, url);

        let mut request = self.client
            .request(method, &url)
            .header("Content-Type", "application/json");

        if let Some(body) = body {
            request = request.json(body);
        }

        let response = request.send().await.map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;

        self.handle_response(response).await
    }

    // Internal method to handle all responses consistently
    async fn handle_response(&self, response: reqwest::Response) -> Result<String, String> {
        let status = response.status();
        let response_text = response.text().await.map_err(|e| {
            error!("Failed to read response: {}", e);
            format!("Failed to read response: {}", e)
        })?;

        if status.is_success() {
            debug!("Request successful");
            Ok(response_text)
        } else {
            error!("Request failed. Status: {:?}, Response: {}", status, response_text);
            Err(response_text)
        }
    }
}