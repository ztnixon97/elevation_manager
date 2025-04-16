use crate::auth::login::AuthState;
use crate::utils::get_auth_header;
use log::{debug, error, info};
use reqwest::Client;
use serde::Serialize;
use tauri::State;
/// API request structure for creating a team
#[derive(Serialize)]
struct NewTeam {
    pub name: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn create_team(state: State<'_, AuthState>, name: String) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/teams".to_string();
    let auth_header = get_auth_header(&state).await?;

    info!("Creating a new team: {name}");

    let response = client
        .post(&url)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&NewTeam { name: name.clone() }) // Clone name to include in response
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {e}");
            format!("Request failed: {e}")
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    info!("Create Team Response: {response_text}");

    if status.is_success() {
        let parsed_response: serde_json::Value =
            serde_json::from_str(&response_text).map_err(|e| e.to_string())?;

        if let Some(team_id) = parsed_response["data"].as_i64() {
            info!("Successfully created team with ID: {team_id}" );

            // ✅ Return a proper JSON response with ID and name
            let response_json = serde_json::json!({
                "success": true,
                "data": {
                    "id": team_id,
                    "name": name
                }
            });

            Ok(response_json.to_string());
        } else {
            error!("Unexpected response format: {response_text}");
            Err("Unexpected response format".to_string());
        }
    } else {
        error!(
            "Failed to create team. Status: {status}, Response: {response_text}");
        Err(format!("Failed to create team: {response_text}"));
    }
}

/// **Get a single team**
#[tauri::command(rename_all = "snake_case")]
pub async fn get_team(state: State<'_, AuthState>, team_id: i32) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{team_id}" );

    let auth_header = get_auth_header(&state).await?;

    info!("Fetching team details for ID: {team_id}" );

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {e}");
            format!("Request failed: {e}")
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retrieved team with ID: {team_id}" );
        debug!("Response: {response_text}" );
        Ok(response_text)
    } else {
        error!(
            "Failed to retrieve team. Status: {status}, Response: {response_text}");
        Err(format!("Failed to retrieve team: {response_text}"))
    }
}

/// **Get all teams**
#[tauri::command(rename_all = "snake_case")]
pub async fn get_all_teams(state: State<'_, AuthState>) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/teams".to_string();

    let auth_header = get_auth_header(&state).await?;

    info!("Fetching all teams...");

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
        info!("Successfully retrieved all teams.");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!(
            "Failed to retrieve teams. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to retrieve teams: {:?}", response_text))
    }
}

/// **Update a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn update_team(
    state: State<'_, AuthState>,
    team_id: i32,
    name: String,
) -> Result<(), String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{}", team_id);

    let auth_header = get_auth_header(&state).await?;

    info!("Updating team ID {} with name: {}", team_id, name);

    let response = client
        .put(&url)
        .header("Authorization", auth_header)
        .json(&NewTeam { name })
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully updated team ID: {}", team_id);
        Ok(())
    } else {
        error!(
            "Failed to update team. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to update team: {:?}", response_text))
    }
}

/// **Delete a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn delete_team(state: State<'_, AuthState>, team_id: i32) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{}", team_id);

    let auth_header = get_auth_header(&state).await?;

    info!("Deleting team ID: {}", team_id);

    let response = client
        .delete(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_else(|_| "{}".to_string());

    if status.is_success() {
        info!("Successfully deleted team ID: {}", team_id);
        Ok(r#"{"success": true, "message": "Team deleted successfully"}"#.to_string())
    } else {
        error!(
            "Failed to delete team ID {}. Status: {:?}, Response: {}",
            team_id, status, response_text
        );
        Err(format!(
            r#"{{"success": false, "message": "Failed to delete team", "details": {}}}"#,
            response_text
        ))
    }
}

/// **Data structures for user management requests**
#[derive(Serialize)]
struct AddUser {
    pub user_id: i32,
    pub role: String,
}

#[derive(Serialize)]
struct UpdateUserRole {
    pub role: String,
}

/// **Get all users in a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn get_team_users(state: State<'_, AuthState>, team_id: i32) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{}/users", team_id);
    let auth_header = get_auth_header(&state).await?;

    info!("Fetching users for team ID: {}", team_id);

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retrieved users for team ID: {}", team_id);
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!(
            "Failed to retrieve team users. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to retrieve team users: {}", response_text))
    }
}

/// **Add a user to a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn add_user_to_team(
    state: State<'_, AuthState>,
    team_id: i32,
    user_id: i32,
    role: String,
) -> Result<(), String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{}/users", team_id);
    let auth_header = get_auth_header(&state).await?;

    info!(
        "Adding user {} to team {} with role: {}",
        user_id, team_id, role
    );

    let response = client
        .post(&url)
        .header("Authorization", auth_header)
        .json(&AddUser { user_id, role })
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        info!("User {} added to team {} successfully.", user_id, team_id);
        Ok(())
    } else {
        let status = response.status(); // Extract status before calling .text()
        let response_text = response.text().await.unwrap_or_default(); // Now safe to move
        error!(
            "Failed to add user. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to add user: {}", response_text))
    }
}

/// **Remove a user from a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn remove_user_from_team(
    state: State<'_, AuthState>,
    team_id: i32,
    user_id: i32,
) -> Result<(), String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{}/users/{}", team_id, user_id);
    let auth_header = get_auth_header(&state).await?;

    info!("Removing user {} from team {}", user_id, team_id);

    let response = client
        .delete(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        info!(
            "User {} removed from team {} successfully.",
            user_id, team_id
        );
        Ok(())
    } else {
        let status = response.status(); // Extract status before calling .text()
        let response_text = response.text().await.unwrap_or_default(); // Now safe to move
        error!(
            "Failed to remove user. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to remove user: {}", response_text))
    }
}

/// **Update a user's role in a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn update_user_role(
    state: State<'_, AuthState>,
    team_id: i32,
    user_id: i32,
    role: String,
) -> Result<(), String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{}/users/{}", team_id, user_id);
    let auth_header = get_auth_header(&state).await?;

    info!(
        "Updating role for user {} in team {} to {}",
        user_id, team_id, role
    );

    let response = client
        .put(&url)
        .header("Authorization", auth_header)
        .json(&UpdateUserRole { role })
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        info!(
            "Successfully updated user role for user {} in team {}.",
            user_id, team_id
        );
        Ok(())
    } else {
        let status = response.status();
        let response_text = response.text().await.unwrap_or_default();
        error!(
            "Failed to update user role. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to update user role: {}", response_text))
    }
}

#[derive(Serialize)]
struct AssignProduct {
    pub site_id: String,
}

/// **Get all products assigned to a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn get_team_products(
    state: State<'_, AuthState>,
    team_id: i32,
) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{}/products", team_id);
    let auth_header = get_auth_header(&state).await?;

    info!("Fetching products assigned to team ID: {}", team_id);

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retrieved products for team ID: {}", team_id);
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!(
            "Failed to retrieve team products. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!(
            "Failed to retrieve team products: {}",
            response_text
        ))
    }
}

/// **Assign a product to a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn assign_product_to_team(
    state: State<'_, AuthState>,
    team_id: i32,
    site_id: String,
) -> Result<(), String> {
    let client = Client::new();
    let auth_header = get_auth_header(&state)
        .await
        .map_err(|e| format!("Authentication error: {}", e))?;

    // ✅ 1. Fetch product_id using site_id
    let query_url = format!("http://localhost:3000/products/id/{}", site_id);
    info!("Fetching product_id for site_id: {}", site_id);

    let product_response = client
        .get(&query_url)
        .header("Authorization", &auth_header)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch product_id: {}", e))?;

    let status = product_response.status();
    let product_json = product_response
        .text()
        .await
        .unwrap_or_else(|_| "No response".to_string());

    if !status.is_success() {
        error!(
            "Failed to fetch product_id for site_id {}. Status: {:?}, Response: {}",
            site_id, status, product_json
        );
        return Err(format!(
            "Failed to fetch product_id: HTTP {} - {}",
            status, product_json
        ));
    }

    // ✅ 2. Extract product_id from response
    let product_data: serde_json::Value = serde_json::from_str(&product_json)
        .map_err(|e| format!("Failed to parse product response: {}", e))?;

    let product_id = product_data["data"]["id"]
        .as_i64()
        .ok_or_else(|| format!("Missing product_id in response: {}", product_json))?;

    info!(
        "Resolved site_id '{}' to product_id '{}'",
        site_id, product_id
    );

    // ✅ 3. Assign product_id to team
    let assign_url = format!("http://localhost:3000/teams/{}/products", team_id);
    let response = client
        .post(&assign_url)
        .header("Authorization", auth_header)
        .json(&serde_json::json!({ "product_id": product_id }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let assign_status = response.status();
    let response_text = response
        .text()
        .await
        .unwrap_or_else(|_| "No response body".to_string());

    if assign_status.is_success() {
        info!(
            "Successfully assigned product {} to team {}",
            product_id, team_id
        );
        Ok(())
    } else {
        error!(
            "Failed to assign product. Status: {:?}, Response: {}",
            assign_status, response_text
        );
        Err(format!(
            "Failed to assign product: HTTP {} - {}",
            assign_status, response_text
        ))
    }
}

/// **Remove a product from a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn remove_product_from_team(
    state: State<'_, AuthState>,
    team_id: i32,
    product_id: i32,
) -> Result<(), String> {
    let client = Client::new();
    let url = format!(
        "http://localhost:3000/teams/{}/products/{}",
        team_id, product_id
    );
    let auth_header = get_auth_header(&state).await?;

    info!("Removing product {} from team {}", product_id, team_id);

    let response = client
        .delete(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        info!(
            "Successfully removed product {} from team {}",
            product_id, team_id
        );
        Ok(())
    } else {
        let status = response.status();
        let response_text = response.text().await.unwrap_or_default();
        error!(
            "Failed to remove product. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to remove product: {}", response_text))
    }
}

/// **Data structures for product type management requests**
#[derive(Serialize)]
struct AssignProductType {
    pub product_type_id: i32,
}

/// **Get all product types assigned to a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn get_team_product_types(
    state: State<'_, AuthState>,
    team_id: i32,
) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{}/product_types", team_id);
    let auth_header = get_auth_header(&state).await?;

    info!("Fetching product types assigned to team ID: {}", team_id);

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!(
            "Successfully retrieved product types for team ID: {}",
            team_id
        );
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!(
            "Failed to retrieve team product types. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!(
            "Failed to retrieve team product types: {}",
            response_text
        ))
    }
}

/// **Assign a product type to a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn assign_product_type_to_team(
    state: State<'_, AuthState>,
    team_id: i32,
    product_type_id: i32,
) -> Result<(), String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{}/product_types", team_id);
    let auth_header = get_auth_header(&state).await?;

    info!(
        "Assigning product type {} to team {}",
        product_type_id, team_id
    );

    let response = client
        .post(&url)
        .header("Authorization", auth_header)
        .json(&AssignProductType { product_type_id })
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        info!(
            "Successfully assigned product type {} to team {}",
            product_type_id, team_id
        );
        Ok(())
    } else {
        let status = response.status();
        let response_text = response.text().await.unwrap_or_default();
        error!(
            "Failed to assign product type. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to assign product type: {}", response_text))
    }
}

/// **Remove a product type from a team**
#[tauri::command(rename_all = "snake_case")]
pub async fn remove_product_type_from_team(
    state: State<'_, AuthState>,
    team_id: i32,
    product_type_id: i32,
) -> Result<(), String> {
    let client = Client::new();
    let url = format!(
        "http://localhost:3000/teams/{}/product_types/{}",
        team_id, product_type_id
    );
    let auth_header = get_auth_header(&state).await?;

    info!(
        "Removing product type {} from team {}",
        product_type_id, team_id
    );

    let response = client
        .delete(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        info!(
            "Successfully removed product type {} from team {}",
            product_type_id, team_id
        );
        Ok(())
    } else {
        let status = response.status();
        let response_text = response.text().await.unwrap_or_default();
        error!(
            "Failed to remove product type. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to remove product type: {}", response_text))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_all_users(state: State<'_, AuthState>) -> Result<String, String> {
    let client = Client::new();
    let url = "http://localhost:3000/users".to_string();

    let auth_header = get_auth_header(&state).await?;

    info!("Fetching all users...");

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
        info!("Successfully retrieved all users.");
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!(
            "Failed to retrieve users. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to retrieve users: {:?}", response_text))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_team_tasks(state: State<'_, AuthState>, team_id: i32) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{team_id}/taskorders");
    let auth_header = get_auth_header(&state).await?;

    info!("fetching task orders assigned to team ID: {}", team_id);

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request Failed: {e}"))?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!(
            "Successfully retrieved task orders for team ID: {}",
            team_id
        );
        debug!("Response: {}", response_text);
        Ok(response_text)
    } else {
        error!(
            "Failed to retrieve team teask orders. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!(
            "Failed to retrieve team task orders: {}",
            response_text
        ))
    }
}

#[derive(Serialize)]
struct AssignTaskOrder {
    pub task_id: i32,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn assign_task_order_to_team(
    state: State<'_, AuthState>,
    team_id: i32,
    task_name: String,
) -> Result<(), String> {
    let client = Client::new();
    let auth_header = get_auth_header(&state)
        .await
        .map_err(|e| format!("Authentication error: {}", e))?;

    let query_url = format!("http://localhost:3000/taskorders/id/{task_name}");
    info!("Fetching Task Order ID for task: {task_name}");

    let task_response = client
        .get(&query_url)
        .header("Authorization", &auth_header)
        .send()
        .await
        .map_err(|e| format!("Faileed to fetch task order id: {e}"))?;

    let status = task_response.status();
    let task_json = task_response
        .text()
        .await
        .unwrap_or_else(|_| "No response".to_string());

    if !status.is_success() {
        error!(
            "Failed to fetch task_id for task {}. Status: {:?}, Response: {}",
            task_name, status, task_json
        );
        return Err(format!(
            "Failed to fetch task_id : HTTP {} - {}",
            status, task_json
        ));
    }

    let task_data: serde_json::Value = serde_json::from_str(&task_json)
        .map_err(|e| format!("Failed to parse task order response: {}", e))?;

    let task_id = task_data["data"]["id"]
        .as_i64()
        .ok_or_else(|| format!("Missing task_id in response: {}", task_json))?;

    info!(
        "Resolved task_name '{}' to task_id '{}'",
        task_name, task_id
    );

    let assign_url = format!("http://localhost:3000/teams/{team_id}/taskorders");
    let response = client
        .post(&assign_url)
        .header("Authorization", auth_header)
        .json(&serde_json::json!({ "id": task_id}))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let assign_status = response.status();
    let response_text = response
        .text()
        .await
        .unwrap_or_else(|_| "No response body".to_string());

    if assign_status.is_success() {
        info!(
            "Successfully assigned task order {} to team {}",
            task_id, team_id
        );
        Ok(())
    } else {
        error!(
            "Failed to assign task order. Status: {:?}, Response: {}",
            assign_status, response_text
        );
        Err(format!(
            "Failed to assign task_order: HTTP {} - {}",
            assign_status, response_text
        ))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_task_order_from_team(
    state: State<'_, AuthState>,
    team_id: i32,
    task_id: i32,
) -> Result<(), String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{team_id}/taskorders/{task_id}");
    let auth_header = get_auth_header(&state).await?;

    info!("Removing Task Order {task_id} from team {team_id}");

    let response = client
        .delete(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        info!(
            "Successfully removed Task Order {} from team {}",
            task_id, team_id
        );
        Ok(())
    } else {
        let status = response.status();
        let response_text = response.text().await.unwrap_or_default();
        error!(
            "Failed to remove Task Order. Status: {:?}, Response: {}",
            status, response_text
        );
        Err(format!("Failed to remove Task Order: {}", response_text))
    }
}

/// Tauri command that fetches notifications for a specific team.
#[tauri::command(rename_all = "snake_case")]
pub async fn get_team_notifications(
    state: State<'_, AuthState>,
    team_id: i32,
) -> Result<String, String> {
    let client = Client::new();
    let url = format!("http://localhost:3000/teams/{}/notifications", team_id);

    let auth_header = get_auth_header(&state).await?;

    info!("Fetching notifications for team {team_id}...");

    let response = client
        .get(&url)
        .header("Authorization", auth_header)
        .send()
        .await
        .map_err(|e| {
            error!("Request failed: {e}");
            format!("Request failed: {e}")
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully retrieved team notifications");
        debug!("Response: {response_text}");
        Ok(response_text)
    } else {
        error!(
            "Failed to retrieve team notifications. Status: {status:?}, Response: {response_text}"
        );
        Err(format!(
            "Failed to retrieve team notifications: {response_text}"
        ))
    }
}
