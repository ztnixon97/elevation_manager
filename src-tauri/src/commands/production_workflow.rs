use crate::services::api_client::ApiClient;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{command, State};
use chrono::{NaiveDate, NaiveDateTime};
use std::collections::HashMap;

// Production workflow data structures
#[derive(Debug, Serialize, Deserialize)]
pub struct ProductionWorkflow {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub product_type_id: Option<i32>,
    pub is_default: bool,
    pub is_active: bool,
    pub created_by: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewProductionWorkflow {
    pub name: String,
    pub description: Option<String>,
    pub product_type_id: Option<i32>,
    pub is_default: Option<bool>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub id: i32,
    pub workflow_id: i32,
    pub step_name: String,
    pub step_order: i32,
    pub description: Option<String>,
    pub is_mandatory: bool,
    pub requires_approval: bool,
    pub approval_role: Option<String>,
    pub estimated_duration_hours: Option<i32>,
    pub sla_hours: Option<i32>,
    pub auto_transition_conditions: Option<Value>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewWorkflowStep {
    pub workflow_id: i32,
    pub step_name: String,
    pub step_order: i32,
    pub description: Option<String>,
    pub is_mandatory: Option<bool>,
    pub requires_approval: Option<bool>,
    pub approval_role: Option<String>,
    pub estimated_duration_hours: Option<i32>,
    pub sla_hours: Option<i32>,
    pub auto_transition_conditions: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductWorkflowInstance {
    pub id: i32,
    pub product_id: i32,
    pub workflow_id: i32,
    pub current_step_id: Option<i32>,
    pub status: String,
    pub priority: String,
    pub assigned_team_id: Option<i32>,
    pub assigned_user_id: Option<i32>,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub estimated_completion: Option<String>,
    pub actual_completion: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewProductWorkflowInstance {
    pub product_id: i32,
    pub workflow_id: i32,
    pub priority: Option<String>,
    pub assigned_team_id: Option<i32>,
    pub assigned_user_id: Option<i32>,
    pub estimated_completion: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProductWorkflowInstance {
    pub current_step_id: Option<i32>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assigned_team_id: Option<i32>,
    pub assigned_user_id: Option<i32>,
    pub estimated_completion: Option<String>,
    pub actual_completion: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductionDashboardData {
    pub total_active_products: i64,
    pub products_by_status: Vec<StatusCount>,
    pub products_by_priority: Vec<PriorityCount>,
    pub throughput_metrics: ThroughputMetrics,
    pub capacity_utilization: CapacityUtilization,
    pub sla_performance: SlaPerformance,
    pub quality_metrics: QualityMetrics,
    pub bottlenecks: Vec<BottleneckItem>,
    pub upcoming_deadlines: Vec<DeadlineItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PriorityCount {
    pub priority: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThroughputMetrics {
    pub products_completed_today: i64,
    pub products_completed_week: i64,
    pub products_completed_month: i64,
    pub average_cycle_time_hours: f64,
    pub throughput_trend: Vec<ThroughputDataPoint>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThroughputDataPoint {
    pub date: String,
    pub completed_count: i64,
    pub average_cycle_time: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CapacityUtilization {
    pub total_capacity: f64,
    pub utilized_capacity: f64,
    pub utilization_percentage: f64,
    pub by_team: Vec<TeamCapacityData>,
    pub by_user: Vec<UserCapacityData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamCapacityData {
    pub team_id: i32,
    pub team_name: String,
    pub capacity: f64,
    pub utilization: f64,
    pub utilization_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserCapacityData {
    pub user_id: i32,
    pub username: String,
    pub capacity: f64,
    pub utilization: f64,
    pub utilization_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlaPerformance {
    pub on_time_percentage: f64,
    pub average_delay_hours: f64,
    pub sla_breaches_today: i64,
    pub sla_breaches_week: i64,
    pub at_risk_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QualityMetrics {
    pub average_quality_score: f64,
    pub quality_trend: Vec<QualityDataPoint>,
    pub defect_rate: f64,
    pub rework_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QualityDataPoint {
    pub date: String,
    pub average_score: f64,
    pub total_inspections: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BottleneckItem {
    pub workflow_step_name: String,
    pub products_waiting: i64,
    pub average_wait_time_hours: f64,
    pub severity: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeadlineItem {
    pub product_id: i32,
    pub product_name: String,
    pub due_date: String,
    pub hours_until_due: f64,
    pub current_status: String,
    pub priority: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductionIssue {
    pub id: i32,
    pub product_id: i32,
    pub workflow_instance_id: Option<i32>,
    pub issue_type: String,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub reported_by: Option<i32>,
    pub assigned_to: Option<i32>,
    pub resolved_by: Option<i32>,
    pub reported_at: String,
    pub due_date: Option<String>,
    pub resolved_at: Option<String>,
    pub resolution_notes: Option<String>,
    pub impact_assessment: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewProductionIssue {
    pub product_id: i32,
    pub workflow_instance_id: Option<i32>,
    pub issue_type: String,
    pub severity: Option<String>,
    pub title: String,
    pub description: String,
    pub assigned_to: Option<i32>,
    pub due_date: Option<String>,
    pub impact_assessment: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProductionIssue {
    pub status: Option<String>,
    pub assigned_to: Option<i32>,
    pub due_date: Option<String>,
    pub resolution_notes: Option<String>,
    pub impact_assessment: Option<String>,
}

// ========================================
// PRODUCTION WORKFLOW COMMANDS
// ========================================

#[command]
pub async fn get_production_workflows(
    api_client: State<'_, ApiClient>,
) -> Result<Vec<ProductionWorkflow>, String> {
    let response = api_client
        .get("/production/workflows")
        .await
        .map_err(|e| format!("Failed to fetch workflows: {}", e))?;

    let response_json: serde_json::Value = serde_json::from_str(&response)
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;
    
    let workflows: Vec<ProductionWorkflow> = serde_json::from_value(response_json["data"].clone())
        .map_err(|e| format!("Failed to parse workflows: {}", e))?;

    Ok(workflows)
}

#[command]
pub async fn create_production_workflow(
    api_client: State<'_, ApiClient>,
    workflow: NewProductionWorkflow,
) -> Result<ProductionWorkflow, String> {
    let response = api_client
        .post("/production/workflows", &workflow)
        .await
        .map_err(|e| format!("Failed to create workflow: {}", e))?;

    let created_workflow: ProductionWorkflow = serde_json::from_value(response["data"].clone())
        .map_err(|e| format!("Failed to parse created workflow: {}", e))?;

    Ok(created_workflow)
}

#[command]
pub async fn get_production_workflow_by_id(
    api_client: State<'_, ApiClient>,
    id: i32,
) -> Result<Option<ProductionWorkflow>, String> {
    let response = api_client
        .get(&format!("/production/workflows/{}", id))
        .await
        .map_err(|e| format!("Failed to fetch workflow: {}", e))?;

    let workflow: Option<ProductionWorkflow> = serde_json::from_value(response["data"].clone())
        .map_err(|e| format!("Failed to parse workflow: {}", e))?;

    Ok(workflow)
}

#[command]
pub async fn get_workflow_steps(
    api_client: State<'_, ApiClient>,
    workflow_id: i32,
) -> Result<Vec<WorkflowStep>, String> {
    let response = api_client
        .get(&format!("/production/workflows/{}/steps", workflow_id))
        .await
        .map_err(|e| format!("Failed to fetch workflow steps: {}", e))?;

    let steps: Vec<WorkflowStep> = serde_json::from_value(response["data"].clone())
        .map_err(|e| format!("Failed to parse workflow steps: {}", e))?;

    Ok(steps)
}

#[command]
pub async fn create_workflow_step(
    api_client: State<'_, ApiClient>,
    step: NewWorkflowStep,
) -> Result<WorkflowStep, String> {
    let response = api_client
        .post(&format!("/production/workflows/{}/steps", step.workflow_id), &step)
        .await
        .map_err(|e| format!("Failed to create workflow step: {}", e))?;

    let created_step: WorkflowStep = serde_json::from_value(response["data"].clone())
        .map_err(|e| format!("Failed to parse created workflow step: {}", e))?;

    Ok(created_step)
}

// ========================================
// PRODUCT WORKFLOW INSTANCE COMMANDS
// ========================================

#[command]
pub async fn get_product_workflow_instances(
    api_client: State<'_, ApiClient>,
    product_id: Option<i32>,
    status: Option<String>,
    priority: Option<String>,
) -> Result<Vec<ProductWorkflowInstance>, String> {
    let mut query_params = HashMap::new();
    
    if let Some(pid) = product_id {
        query_params.insert("product_id", pid.to_string());
    }
    if let Some(s) = status {
        query_params.insert("status", s);
    }
    if let Some(p) = priority {
        query_params.insert("priority", p);
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        "?".to_string() + &query_params
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<String>>()
            .join("&")
    };

    let response = api_client
        .get(&format!("/production/instances{}", query_string))
        .await
        .map_err(|e| format!("Failed to fetch workflow instances: {}", e))?;

    let instances: Vec<ProductWorkflowInstance> = serde_json::from_value(response["data"].clone())
        .map_err(|e| format!("Failed to parse workflow instances: {}", e))?;

    Ok(instances)
}

#[command]
pub async fn create_product_workflow_instance(
    api_client: State<'_, ApiClient>,
    instance: NewProductWorkflowInstance,
) -> Result<ProductWorkflowInstance, String> {
    let response = api_client
        .post("/production/instances", &instance)
        .await
        .map_err(|e| format!("Failed to create workflow instance: {}", e))?;

    let created_instance: ProductWorkflowInstance = serde_json::from_value(response["data"].clone())
        .map_err(|e| format!("Failed to parse created workflow instance: {}", e))?;

    Ok(created_instance)
}

#[command]
pub async fn update_product_workflow_instance(
    api_client: State<'_, ApiClient>,
    id: i32,
    updates: UpdateProductWorkflowInstance,
) -> Result<ProductWorkflowInstance, String> {
    let response = api_client
        .put(&format!("/production/instances/{}", id), &updates)
        .await
        .map_err(|e| format!("Failed to update workflow instance: {}", e))?;

    let updated_instance: ProductWorkflowInstance = serde_json::from_value(response["data"].clone())
        .map_err(|e| format!("Failed to parse updated workflow instance: {}", e))?;

    Ok(updated_instance)
}

// ========================================
// PRODUCTION DASHBOARD COMMANDS
// ========================================

#[command]
pub async fn get_production_dashboard(
    api_client: State<'_, ApiClient>,
    team_id: Option<i32>,
) -> Result<ProductionDashboardData, String> {
    let query_string = if let Some(tid) = team_id {
        format!("?team_id={}", tid)
    } else {
        String::new()
    };

    let response = api_client
        .get(&format!("/production/dashboard{}", query_string))
        .await
        .map_err(|e| format!("Failed to fetch dashboard data: {}", e))?;

    let dashboard: ProductionDashboardData = serde_json::from_value(response["data"].clone())
        .map_err(|e| format!("Failed to parse dashboard data: {}", e))?;

    Ok(dashboard)
}

// ========================================
// PRODUCTION ISSUES COMMANDS
// ========================================

#[command]
pub async fn get_production_issues(
    api_client: State<'_, ApiClient>,
    status: Option<String>,
    severity: Option<String>,
    assigned_to: Option<i32>,
    product_id: Option<i32>,
) -> Result<Vec<ProductionIssue>, String> {
    let mut query_params = HashMap::new();
    
    if let Some(s) = status {
        query_params.insert("status", s);
    }
    if let Some(sev) = severity {
        query_params.insert("severity", sev);
    }
    if let Some(aid) = assigned_to {
        query_params.insert("assigned_to", aid.to_string());
    }
    if let Some(pid) = product_id {
        query_params.insert("product_id", pid.to_string());
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        "?".to_string() + &query_params
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<String>>()
            .join("&")
    };

    let response = api_client
        .get(&format!("/production/issues{}", query_string))
        .await
        .map_err(|e| format!("Failed to fetch production issues: {}", e))?;

    let issues: Vec<ProductionIssue> = serde_json::from_value(response["data"].clone())
        .map_err(|e| format!("Failed to parse production issues: {}", e))?;

    Ok(issues)
}

#[command]
pub async fn create_production_issue(
    api_client: State<'_, ApiClient>,
    issue: NewProductionIssue,
) -> Result<ProductionIssue, String> {
    let response = api_client
        .post("/production/issues", &issue)
        .await
        .map_err(|e| format!("Failed to create production issue: {}", e))?;

    let created_issue: ProductionIssue = serde_json::from_value(response["data"].clone())
        .map_err(|e| format!("Failed to parse created production issue: {}", e))?;

    Ok(created_issue)
}

#[command]
pub async fn update_production_issue(
    api_client: State<'_, ApiClient>,
    id: i32,
    updates: UpdateProductionIssue,
) -> Result<ProductionIssue, String> {
    let response = api_client
        .put(&format!("/production/issues/{}", id), &updates)
        .await
        .map_err(|e| format!("Failed to update production issue: {}", e))?;

    let updated_issue: ProductionIssue = serde_json::from_value(response["data"].clone())
        .map_err(|e| format!("Failed to parse updated production issue: {}", e))?;

    Ok(updated_issue)
}

// ========================================
// WORKFLOW AUTOMATION COMMANDS
// ========================================

#[command]
pub async fn advance_workflow_step(
    api_client: State<'_, ApiClient>,
    workflow_instance_id: i32,
    notes: Option<String>,
) -> Result<ProductWorkflowInstance, String> {
    // This would implement logic to advance a workflow to the next step
    // For now, we'll update the status to indicate progression
    let updates = UpdateProductWorkflowInstance {
        status: Some("in_progress".to_string()),
        notes,
        ..Default::default()
    };

    update_product_workflow_instance(api_client, workflow_instance_id, updates).await
}

#[command]
pub async fn approve_workflow_step(
    api_client: State<'_, ApiClient>,
    workflow_instance_id: i32,
    step_id: i32,
    approval_notes: Option<String>,
) -> Result<bool, String> {
    // This would implement workflow step approval logic
    // For now, we'll just return success
    log::info!("Approving workflow step {} for instance {}", step_id, workflow_instance_id);
    Ok(true)
}

#[command]
pub async fn reject_workflow_step(
    api_client: State<'_, ApiClient>,
    workflow_instance_id: i32,
    step_id: i32,
    rejection_reason: String,
) -> Result<bool, String> {
    // This would implement workflow step rejection logic
    // For now, we'll just return success
    log::info!("Rejecting workflow step {} for instance {}: {}", step_id, workflow_instance_id, rejection_reason);
    Ok(true)
}

// Implement Default for UpdateProductWorkflowInstance to support ..Default::default()
impl Default for UpdateProductWorkflowInstance {
    fn default() -> Self {
        Self {
            current_step_id: None,
            status: None,
            priority: None,
            assigned_team_id: None,
            assigned_user_id: None,
            estimated_completion: None,
            actual_completion: None,
            notes: None,
        }
    }
}