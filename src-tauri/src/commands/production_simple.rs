use crate::services::api_client::ApiClient;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductionDashboardData {
    pub total_active_products: i64,
    pub products_by_status: Vec<StatusCount>,
    pub products_by_priority: Vec<PriorityCount>,
    pub throughput_metrics: ThroughputMetrics,
    pub capacity_utilization: CapacityUtilization,
    pub sla_performance: SlaPerformance,
    pub quality_metrics: QualityMetrics,
    pub bottlenecks: Vec<Value>,
    pub upcoming_deadlines: Vec<Value>,
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
    pub throughput_trend: Vec<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CapacityUtilization {
    pub total_capacity: f64,
    pub utilized_capacity: f64,
    pub utilization_percentage: f64,
    pub by_team: Vec<Value>,
    pub by_user: Vec<Value>,
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
    pub quality_trend: Vec<Value>,
    pub defect_rate: f64,
    pub rework_rate: f64,
}

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

    let response_json: serde_json::Value = serde_json::from_str(&response)
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;

    let dashboard: ProductionDashboardData = serde_json::from_value(response_json["data"].clone())
        .map_err(|e| format!("Failed to parse dashboard data: {}", e))?;

    Ok(dashboard)
}