use crate::auth::login::AuthState;
use crate::utils::get_auth_header;
use reqwest::Client;
use log::{error, info, debug};
use serde_json::{Value, json};
use tauri::State;

#[tauri::command(rename_all="snake_case")]
pub async fn request_team_join(
    state: State<'_, AuthState>,
    team_id: i32,
    role: String,
    justification: Option<String>
) -> Result<String, String> {
    let client = Client::new();
    let auth_header =get_auth_header(&state).await?;

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
    
    if status.is_success()    {
        info!("Successfully submitted team join request");
        Ok(response_text)
    } else {
        error!("Failed to submit team join request Status: {:?}, Response: {}", status, response_text);
        Err(format!("Failed to submit team join request: {response_text}"))
    }
}

