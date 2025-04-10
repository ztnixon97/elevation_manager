use crate::{auth::login::AuthState, NotificationTarget};
use crate::utils::get_auth_header;
use reqwest::Client;
use log::{error, info, debug};
use serde_json::{json, Value};
use tauri::State;
use chrono::{Duration, Utc};


#[tauri::command(rename_all="snake_case")]
pub async fn request_team_join(
    state: State<'_, AuthState>,
    team_id: i32,
    role: String,
    justification: Option<String>
) -> Result<String, String> {
    // This function remains unchanged as it works well
    let client = Client::new();
    let auth_header = get_auth_header(&state).await?;

    info!("Submitting team join request for team ID: {team_id}");

    // Create request payload with justification if provided
    let mut request_payload = json!({
        "request_type": "TeamJoin",
        "target_id": team_id,
        "details": {
            "role": role
        }
    });

    if let Some(justification_text) = justification {
        if let Some(details) = request_payload["details"].as_object_mut() {
            details.insert("justification".to_string(), json!(justification_text));
        }
    }

    let response = client
        .post("http://localhost:3000/requests")
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&request_payload)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {e}");
            format!("Request failed: {e}")
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();
    
    if status.is_success() {
        info!("Successfully submitted team join request");
        Ok(response_text)
    } else {
        error!("Failed to submit team join request Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to submit team join request: {response_text}"))
    }
}

#[tauri::command(rename_all="snake_case")]
pub async fn get_pending_team_requests(
    state: State<'_, AuthState>,
    team_id: i32,
) -> Result<String, String> {
    let client = Client::new();
    // Use the dedicated endpoint for team requests - this URL will need to be updated
    // once you implement the endpoint on your backend
    let url = format!("http://localhost:3000/teams/{team_id}/requests");

    let auth_header = get_auth_header(&state).await?;
    debug!("🔍 Fetching pending requests for team {}", team_id);

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("✅ Successfully retrieved pending requests for team {}", team_id);
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        // If the endpoint is not yet implemented, fall back to the original filtering approach
        if status.as_u16() == 404 {
            info!("Dedicated endpoint not found, falling back to filtering approach");
            return fallback_get_pending_team_requests(state, team_id).await;
        }
        
        error!("❌ Failed to retrieve pending requests. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to retrieve pending requests: {}", response_text))
    }
}

// Keeping the original implementation as a fallback in case the endpoint is not yet implemented
async fn fallback_get_pending_team_requests(
    state: State<'_, AuthState>,
    team_id: i32,
) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/requests?status=pending";

    let auth_header = get_auth_header(&state).await?;
    debug!("🔍 Falling back to filtering all pending requests for team {}", team_id);

    let response = client
        .get(url)
        .header("Authorization", auth_header.clone())
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        // Parse the response to filter only team requests for this team
        let parsed_response: Value = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        // Extract the data array from the response
        if let Some(data) = parsed_response["data"].as_array() {
            // Filter the data for TeamJoin requests with target_id matching team_id
            let team_requests: Vec<Value> = data.iter()
                .filter(|req| {
                    let is_team_join = req["request_type"].as_str().unwrap_or("") == "TeamJoin";
                    let target_matches = req["target_id"].as_i64().unwrap_or(-1) == team_id as i64;
                    is_team_join && target_matches
                })
                .cloned()
                .collect();
            
            // Add username information for each request
            let mut enriched_requests = Vec::new();
            for req in team_requests {
                if let Some(user_id) = req["requested_by"].as_i64() {
                    // Fetch username for this user
                    let user_url = format!("http://localhost:3000/users/{}", user_id);
                    match client
                        .get(&user_url)
                        .header("Authorization", auth_header.clone())
                        .send()
                        .await {
                            Ok(user_response) => {
                                if user_response.status().is_success() {
                                    if let Ok(user_data) = user_response.json::<Value>().await {
                                        if let Some(username) = user_data["data"]["username"].as_str() {
                                            // Create an enriched request with username added
                                            let mut enriched_req = req.clone();
                                            enriched_req["username"] = json!(username);
                                            enriched_requests.push(enriched_req);
                                        } else {
                                            // Just add the original request if username not found
                                            enriched_requests.push(req);
                                        }
                                    } else {
                                        enriched_requests.push(req);
                                    }
                                } else {
                                    enriched_requests.push(req);
                                }
                            },
                            Err(_) => {
                                enriched_requests.push(req);
                            }
                        }
                } else {
                    enriched_requests.push(req);
                }
            }
            
            // Create a new response with the filtered and enriched requests
            let filtered_response = json!({
                "success": true,
                "status_code": 200,
                "message": "Filtered team requests",
                "data": enriched_requests
            });
            
            info!("✅ Successfully filtered pending requests for team {}", team_id);
            return Ok(filtered_response.to_string());
        }
        
        // If we couldn't extract the data array, return the original response
        info!("✅ Retrieved pending requests for team {}", team_id);
        Ok(response_text)
    } else {
        error!("❌ Failed to retrieve pending requests. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to retrieve pending requests: {}", response_text))
    }
}

// These functions remain unchanged
#[tauri::command(rename_all="snake_case")]
pub async fn approve_team_request(
    state: State<'_, AuthState>,
    request_id: i32,
    team_id: i32,
) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/requests/{request_id}");

    let auth_header = get_auth_header(&state).await?;
    info!("👍 Approving request {} for team {}", request_id, team_id);

    // Create the request payload with approved status
    
    let json_payload = "Approved";

    let response = client
        .patch(&url)
        .header("Authorization", auth_header.clone())
        .header("Content-Type", "application/json")
        .json(&json_payload)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("✅ Successfully approved request {}", request_id);
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!("❌ Failed to approve request. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to approve request: {}", response_text))
    }
}

#[tauri::command(rename_all="snake_case")]
pub async fn reject_team_request(
    state: State<'_, AuthState>,
    request_id: i32,
    team_id: i32,
) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/requests/{request_id}");

    let auth_header = get_auth_header(&state).await?;
    info!("👎 Rejecting request {} for team {}", request_id, team_id);

    // Create the request payload with rejected status
    let json_payload = "Rejected";

    let response = client
        .patch(&url)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&json_payload)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("✅ Successfully rejected request {}", request_id);
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!("❌ Failed to reject request. Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to reject request: {}", response_text))
    }
}



#[tauri::command(rename_all = "snake_case")]
pub async fn send_team_notification(
    state: State<'_, AuthState>,
    team_id: i32,
    title: String,
    body: Option<String>,
    r#type: Option<String>,
    expiry_days: Option<i64>,
) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/notifications";
    let auth_header = get_auth_header(&state).await?;

    // Convert expiry_days to RFC3339 timestamp string (ISO8601)
    let expires_at = expiry_days.map(|days| {
        (Utc::now() + Duration::days(days)).naive_utc().to_string()
    });

    let payload = json!({
        "title": title,
        "body": body,
        "type": r#type.unwrap_or("info".to_string()),
        "action_type": null,
        "action_data": null,
        "global": false,
        "dismissible": true,
        "expires_at": expires_at,
        "targets": [
            {
                "scope": "team",
                "target_id": team_id
            }
        ]
    });

    info!("Sending notification to team {}", team_id);

    let response = client
        .post(url)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to send request: {}", e);
            format!("Request failed: {}", e)
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Notification sent successfully.");
        Ok(response_text)
    } else {
        error!(
            "Failed to send notification. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to send notification: {}", response_text))
    }
}
