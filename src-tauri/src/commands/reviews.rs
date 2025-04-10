// src-tauri/src/commands/reviews.rs
use crate::auth::login::AuthState;
use crate::utils::get_auth_header;
use log::{error, info};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

/// Represents the metadata of a review in the system
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Review {
    pub id: i32,
    pub product_id: i32,
    pub reviewer_id: i32,
    pub review_status: String,
    pub product_status: String,
    pub review_path: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Represents a new review being created
#[derive(Debug, Serialize, Deserialize)]
pub struct NewReview {
    pub title: String,
    pub content: String,
    pub product_id: i32,
    pub product_status: String,
    pub review_status: String,
}

/// Represents an update to an existing review
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateReview {
    pub title: Option<String>,
    pub content: Option<String>,
    pub product_status: Option<String>,
    pub review_status: Option<String>,
}

/// Response containing a review with its content
#[derive(Debug, Serialize, Deserialize)]
pub struct ReviewResponse {
    pub review: Review,
    pub content: String,
}

/// Local paths for reviews and images
pub fn get_review_local_path(product_id: i32, review_id: Option<i32>) -> PathBuf {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    let base_dir = home_dir.join(".elevation-manager").join("reviews").join(product_id.to_string());
    
    // Create directories if they don't exist
    fs::create_dir_all(&base_dir).expect("Failed to create review directory");
    
    if let Some(id) = review_id {
        base_dir.join(format!("review_{}.html", id))
    } else {
        base_dir.join("draft.html")
    }
}

pub fn get_review_image_dir(product_id: i32, review_id: Option<i32>) -> PathBuf {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    let base_dir = home_dir.join(".elevation-manager").join("reviews")
        .join(product_id.to_string()).join("images");
    
    if let Some(id) = review_id {
        let dir = base_dir.join(id.to_string());
        fs::create_dir_all(&dir).expect("Failed to create image directory");
        dir
    } else {
        let dir = base_dir.join("draft");
        fs::create_dir_all(&dir).expect("Failed to create image directory");
        dir
    }
}

/// Convert an image file to base64 for embedding in the review
#[tauri::command]
pub fn convert_image_to_base64(path: String) -> Result<String, String> {
    match fs::read(path) {
        Ok(bytes) => {
            let base64 = base64::encode(&bytes);
            Ok(base64)
        },
        Err(e) => {
            error!("Failed to read image file: {}", e);
            Err(format!("Failed to read image file: {}", e))
        }
    }
}

/// Save a draft review locally
#[tauri::command]
pub fn save_review_draft(product_id: i32, content: String) -> Result<String, String> {
    let path = get_review_local_path(product_id, None);
    
    match fs::write(&path, content) {
        Ok(_) => {
            info!("Draft saved to {}", path.display());
            Ok(path.to_string_lossy().to_string())
        },
        Err(e) => {
            error!("Failed to save draft: {}", e);
            Err(format!("Failed to save draft: {}", e))
        }
    }
}

/// Load a draft review from local storage
#[tauri::command]
pub fn load_review_draft(product_id: i32) -> Result<String, String> {
    let path = get_review_local_path(product_id, None);
    
    if !path.exists() {
        return Err("No draft exists for this product".to_string());
    }
    
    match fs::read_to_string(&path) {
        Ok(content) => {
            info!("Draft loaded from {}", path.display());
            Ok(content)
        },
        Err(e) => {
            error!("Failed to load draft: {}", e);
            Err(format!("Failed to load draft: {}", e))
        }
    }
}

/// Create a new review on the server
#[tauri::command]
pub async fn create_review(
    state: State<'_, AuthState>,
    product_id: i32,
    review: NewReview,
) -> Result<Value, String> {
    let client = Client::new();
    let url = "http://localhost:3000/reviews".to_string();
    let auth_header = get_auth_header(&state).await?;
    
    info!("Creating new review for product {}", product_id);
    
    // Create the request payload
    let payload = json!({
        "product_id": product_id,
        "review_status": review.review_status,
        "product_status": review.product_status,
        "content": review.content
    });
    
    let response = client
        .post(&url)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();
    
    if status.is_success() {
        info!("Review created successfully");
        
        // Save a copy locally
        let response_value: Value = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        let review_id = response_value["data"]
            .as_i64()
            .ok_or_else(|| "Failed to extract review ID from response".to_string())?;
        
        // Save the content locally with the official review ID
        let local_path = get_review_local_path(product_id, Some(review_id as i32));
        fs::write(&local_path, &review.content).map_err(|e| format!("Failed to save local copy: {}", e))?;
        
        Ok(response_value)
    } else {
        error!("Failed to create review. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to create review: {}", response_text))
    }
}

/// Get a review from the server
#[tauri::command]
pub async fn get_review(
    state: State<'_, AuthState>,
    review_id: i32,
) -> Result<ReviewResponse, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/reviews/{}", review_id);
    let auth_header = get_auth_header(&state).await?;
    
    info!("Fetching review {}", review_id);
    
    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();
    
    if status.is_success() {
        info!("Review fetched successfully");
        
        let response_value: Value = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        let review_data = response_value["data"].clone();
        
        let review: Review = serde_json::from_value(review_data["review"].clone())
            .map_err(|e| format!("Failed to parse review: {}", e))?;
        
        let content = review_data["content"]
            .as_str()
            .ok_or_else(|| "Failed to extract content from response".to_string())?
            .to_string();
        
        // Save a copy locally
        let local_path = get_review_local_path(review.product_id, Some(review.id));
        fs::write(&local_path, &content).map_err(|e| format!("Failed to save local copy: {}", e))?;
        
        Ok(ReviewResponse { review, content })
    } else {
        error!("Failed to fetch review. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to fetch review: {}", response_text))
    }
}

/// Update an existing review on the server
#[tauri::command]
pub async fn update_review(
    state: State<'_, AuthState>,
    review_id: i32,
    review: UpdateReview,
) -> Result<Value, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/reviews/{}", review_id);
    let auth_header = get_auth_header(&state).await?;
    
    info!("Updating review {}", review_id);
    
    // Create the request payload
    let mut payload = json!({});
    
    if let Some(status) = &review.review_status {
        payload["review_status"] = json!(status);
    }
    
    if let Some(product_status) = &review.product_status {
        payload["product_status"] = json!(product_status);
    }
    
    if let Some(content) = &review.content {
        payload["content"] = json!(content);
        
        // Get the product_id first to save locally
        let get_response = client
            .get(&url)
            .header("Authorization", auth_header.clone())
            .send()
            .await
            .map_err(|e| {
                error!("Request failed: {}", e);
                format!("Request failed: {}", e)
            })?;
        
        if get_response.status().is_success() {
            let get_text = get_response.text().await.unwrap_or_default();
            let get_value: Value = serde_json::from_str(&get_text)
                .map_err(|e| format!("Failed to parse response: {}", e))?;
            
            let product_id = get_value["data"]["review"]["product_id"]
                .as_i64()
                .ok_or_else(|| "Failed to extract product ID from response".to_string())?;
            
            // Save the content locally
            let local_path = get_review_local_path(product_id as i32, Some(review_id));
            fs::write(&local_path, &content).map_err(|e| format!("Failed to save local copy: {}", e))?;
        }
    }
    
    let response = client
        .patch(&url)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();
    
    if status.is_success() {
        info!("Review updated successfully");
        
        let response_value: Value = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        Ok(response_value)
    } else {
        error!("Failed to update review. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to update review: {}", response_text))
    }
}

/// Get all reviews for a product
#[tauri::command(rename_all="snake_case")]
pub async fn get_product_reviews(
    state: State<'_, AuthState>,
    product_id: i32,
) -> Result<Value, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/reviews/product/{}", product_id);
    let auth_header = get_auth_header(&state).await?;
    
    info!("Fetching reviews for product {}", product_id);
    
    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();
    
    if status.is_success() {
        info!("Product reviews fetched successfully");
        
        let response_value: Value = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        Ok(response_value)
    } else {
        error!("Failed to fetch product reviews. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to fetch product reviews: {}", response_text))
    }
}

/// Get all reviews for a user
#[tauri::command]
pub async fn get_user_reviews(
    state: State<'_, AuthState>,
) -> Result<Value, String> {
    let client = Client::new();
    let auth_header = get_auth_header(&state).await?;
    
    // First get the user ID from the auth state
    let token_guard = state.token.lock().await;
    
    if token_guard.is_none() {
        return Err("Not authenticated".to_string());
    }
    
    // Get user ID from the me endpoint
    let user_url = "http://localhost:3000/users/me".to_string();
    let user_response = client
        .get(&user_url)
        .header("Authorization", auth_header.clone())
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;
    
    if !user_response.status().is_success() {
        return Err("Failed to get user information".to_string());
    }
    
    let user_response_text = user_response.text().await.unwrap_or_default();
    let user_value: Value = serde_json::from_str(&user_response_text)
        .map_err(|e| format!("Failed to parse user response: {}", e))?;
    
    let user_id = user_value["data"]["id"]
        .as_i64()
        .ok_or_else(|| "Failed to extract user ID from response".to_string())?;
    
    // Now get the reviews
    let url = format!("http://localhost:3000/reviews/user/{}", user_id);
    
    info!("Fetching reviews for user {}", user_id);
    
    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();
    
    if status.is_success() {
        info!("User reviews fetched successfully");
        
        let response_value: Value = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        Ok(response_value)
    } else {
        error!("Failed to fetch user reviews. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to fetch user reviews: {}", response_text))
    }
}

/// Upload an image for a review
#[tauri::command]
pub async fn upload_review_image(
    state: State<'_, AuthState>,
    review_id: i32,
    image_path: String,
) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/reviews/{}/images", review_id);
    let auth_header = get_auth_header(&state).await?;
    
    info!("Uploading image for review {}", review_id);
    
    // Create a multipart form
    let form = reqwest::multipart::Form::new()
        .file("file", &image_path)
        .await
        .map_err(|e| format!("Failed to create form: {}", e))?;
    
    let response = client
        .post(&url)
        .header("Authorization", auth_header)
        .multipart(form)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();
    
    if status.is_success() {
        info!("Image uploaded successfully");
        
        let response_value: Value = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        // The response should contain the image URL or ID
        let filename = response_value["data"][0]
            .as_str()
            .ok_or_else(|| "Failed to extract image filename from response".to_string())?;
        
        Ok(filename.to_string())
    } else {
        error!("Failed to upload image. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to upload image: {}", response_text))
    }
}

/// Get all images for a review
#[tauri::command]
pub async fn get_review_images(
    state: State<'_, AuthState>,
    review_id: i32,
) -> Result<Vec<String>, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/reviews/{}/images", review_id);
    let auth_header = get_auth_header(&state).await?;
    
    info!("Fetching images for review {}", review_id);
    
    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;
    
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();
    
    if status.is_success() {
        info!("Review images fetched successfully");
        
        let response_value: Value = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        let filenames = response_value["data"]
            .as_array()
            .ok_or_else(|| "Failed to extract image filenames from response".to_string())?
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect();
        
        Ok(filenames)
    } else {
        error!("Failed to fetch review images. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to fetch review images: {}", response_text))
    }
}

/// Delete an image from a review
#[tauri::command]
pub async fn delete_review_image(
    state: State<'_, AuthState>,
    review_id: i32,
    filename: String,
) -> Result<(), String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/reviews/{}/image/{}", review_id, filename);
    let auth_header = get_auth_header(&state).await?;
    
    info!("Deleting image {} from review {}", filename, review_id);
    
    let response = client
        .delete(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;
    
    let status = response.status();
    
    if status.is_success() {
        info!("Image deleted successfully");
        Ok(())
    } else {
        let response_text = response.text().await.unwrap_or_default();
        error!("Failed to delete image. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to delete image: {}", response_text))
    }
}

/// Team Lead functions to approve or reject reviews
#[tauri::command]
pub async fn approve_review(
    state: State<'_, AuthState>,
    review_id: i32,
) -> Result<Value, String> {
    let update = UpdateReview {
        review_status: Some("approved".to_string()),
        product_status: None,
        content: None,
        title: None,
    };
    
    update_review(state, review_id, update).await
}

#[tauri::command]
pub async fn reject_review(
    state: State<'_, AuthState>,
    review_id: i32,
) -> Result<Value, String> {
    let update = UpdateReview {
        review_status: Some("rejected".to_string()),
        product_status: None,
        content: None,
        title: None,
    };
    
    update_review(state, review_id, update).await
}
