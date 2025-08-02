use crate::services::api_client::ApiClient;
use chrono::{Duration, Utc};
use log::{debug, error, info};
use serde_json::{json, Value};
use tauri::State;

#[tauri::command(rename_all = "snake_case")]
pub async fn request_team_join(
    api_client: State<'_, ApiClient>,
    team_id: i32,
    role: String,
    justification: Option<String>,
) -> Result<String, String> {
    info!("Submitting team join request for team ID: {team_id}");
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
    api_client.post("/requests", &request_payload).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_pending_team_requests(
    api_client: State<'_, ApiClient>,
    team_id: i32,
) -> Result<String, String> {
    let url = format!("/teams/{}/requests", team_id);
    debug!("🔍 Fetching pending requests for team {}", team_id);
    let result = api_client.get(&url).await;
    match result {
        Ok(response_text) => Ok(response_text),
        Err(e) => {
            if e.contains("404") {
                info!("Dedicated endpoint not found, falling back to filtering approach");
                fallback_get_pending_team_requests(api_client, team_id).await
            } else {
                Err(e)
            }
        }
    }
}

async fn fallback_get_pending_team_requests(
    api_client: State<'_, ApiClient>,
    team_id: i32,
) -> Result<String, String> {
    debug!("🔍 Falling back to filtering all pending requests for team {}", team_id);
    let response_text = api_client.get("/requests?status=pending").await?;
    let parsed_response: Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    if let Some(data) = parsed_response["data"].as_array() {
        let team_requests: Vec<Value> = data
            .iter()
            .filter(|req| {
                let is_team_join = req["request_type"].as_str().unwrap_or("") == "TeamJoin";
                let target_matches = req["target_id"].as_i64().unwrap_or(-1) == team_id as i64;
                is_team_join && target_matches
            })
            .cloned()
            .collect();
        let mut enriched_requests = Vec::new();
        for req in team_requests {
            if let Some(user_id) = req["requested_by"].as_i64() {
                let user_url = format!("/users/{}", user_id);
                match api_client.get(&user_url).await {
                    Ok(user_data_str) => {
                        if let Ok(user_data) = serde_json::from_str::<Value>(&user_data_str) {
                            if let Some(username) = user_data["data"]["username"].as_str() {
                                let mut enriched_req = req.clone();
                                enriched_req["username"] = json!(username);
                                enriched_requests.push(enriched_req);
                            } else {
                                enriched_requests.push(req);
                            }
                        } else {
                            enriched_requests.push(req);
                        }
                    }
                    Err(_) => {
                        enriched_requests.push(req);
                    }
                }
            } else {
                enriched_requests.push(req);
            }
        }
        let filtered_response = json!({
            "success": true,
            "status_code": 200,
            "message": "Filtered team requests",
            "data": enriched_requests
        });
        info!("✅ Successfully filtered pending requests for team {}", team_id);
        Ok(filtered_response.to_string())
    } else {
        info!("✅ Retrieved pending requests for team {}", team_id);
        Ok(response_text)
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn approve_team_request(
    api_client: State<'_, ApiClient>,
    request_id: i32,
    team_id: i32,
) -> Result<String, String> {
    info!("👍 Approving request {} for team {}", request_id, team_id);
    let json_payload = "Approved";
    api_client.put(&format!("/requests/{}", request_id), &json_payload).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn reject_team_request(
    api_client: State<'_, ApiClient>,
    request_id: i32,
    team_id: i32,
) -> Result<String, String> {
    info!("👎 Rejecting request {} for team {}", request_id, team_id);
    let json_payload = "Rejected";
    api_client.put(&format!("/requests/{}", request_id), &json_payload).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn send_team_notification(
    api_client: State<'_, ApiClient>,
    team_id: i32,
    title: String,
    body: Option<String>,
    r#type: Option<String>,
    expiry_days: Option<i64>,
) -> Result<String, String> {
    info!("Sending notification to team {}", team_id);
    let mut payload = json!({ "title": title });
    if let Some(body_val) = body { payload["body"] = json!(body_val); }
    if let Some(type_val) = r#type { payload["type"] = json!(type_val); }
    if let Some(expiry) = expiry_days {
        let expiry_date = Utc::now() + Duration::days(expiry);
        payload["expiry"] = json!(expiry_date.to_rfc3339());
    }
    api_client.post(&format!("/teams/{}/notifications", team_id), &payload).await
}
