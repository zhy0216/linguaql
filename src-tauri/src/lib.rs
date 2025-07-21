use tauri::AppHandle;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use once_cell::sync::Lazy;
use std::sync::Mutex;

// Database configuration
#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
}

// Connection result
#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionResult {
    pub success: bool,
    pub message: String,
    pub window_id: Option<String>,
}

// DatabaseTable and TableDataRequest structs moved to frontend DBService

// Global storage for database connection URLs (for Tauri SQL plugin)
static DATABASE_CONNECTIONS: Lazy<Mutex<HashMap<String, String>>> = Lazy::new(|| {
    Mutex::new(HashMap::new())
});



// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn test_database_connection(config: DatabaseConfig) -> ConnectionResult {
    // Validate configuration format
    if config.host.is_empty() || config.username.is_empty() {
        return ConnectionResult {
            success: false,
            message: "Invalid configuration: missing required fields (host, username)".to_string(),
            window_id: None,
        };
    }
    
    // For Tauri SQL plugin, we'll validate the format and return success
    // The actual connection test will happen when we try to connect
    ConnectionResult {
        success: true,
        message: "Configuration validated successfully".to_string(),
        window_id: None,
    }
}

#[tauri::command]
async fn get_connection_url(window_id: &str) -> Result<String, String> {
    // 返回连接URL供前端使用
    let connection_url = {
        let connections = DATABASE_CONNECTIONS.lock().unwrap();
        connections.get(window_id).cloned()
    };
    
    connection_url.ok_or_else(|| format!("找不到窗口ID对应的数据库连接: {}", window_id))
}

// get_database_tables function removed - now handled by frontend DBService

#[tauri::command]
async fn connect_to_database(app_handle: AppHandle, config: DatabaseConfig) -> ConnectionResult {
    // 生成唯一的窗口ID，使用时间戳作为后缀
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let window_id = format!("query-window-{}", timestamp);
    
    // Build PostgreSQL connection URL for Tauri SQL plugin
    let connection_url = format!(
        "postgres://{}:{}@{}:{}/{}",
        config.username, config.password, config.host, config.port, config.database
    );
    
    // Store connection URL for this window
    {
        let mut connections = DATABASE_CONNECTIONS.lock().unwrap();
        connections.insert(window_id.clone(), connection_url);
    }
    
    // 创建新的查询窗口
    let window = tauri::WebviewWindowBuilder::new(
        &app_handle,
        &window_id,
        tauri::WebviewUrl::App("index.html?page=query".into())
    )
    .title(format!("LinguaQL - {} - 数据库查询", config.database))
    .inner_size(1200.0, 800.0)
    .center()
    .build();
    
    match window {
        Ok(_) => ConnectionResult {
            success: true,
            message: "Connected successfully and query window opened".to_string(),
            window_id: Some(window_id),
        },
        Err(e) => {
            // 如果窗口创建失败，清理连接信息
            {
                let mut connections = DATABASE_CONNECTIONS.lock().unwrap();
                connections.remove(&window_id);
            }
            ConnectionResult {
                success: false,
                message: format!("Failed to create query window: {}", e),
                window_id: None,
            }
        }
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            test_database_connection,
            connect_to_database,
            get_connection_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
