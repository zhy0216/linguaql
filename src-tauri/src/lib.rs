mod database;

use database::{DatabaseConfig, ConnectionResult};
use tauri::AppHandle;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn test_database_connection(config: DatabaseConfig) -> ConnectionResult {
    database::test_postgres_connection(&config).await
}

#[tauri::command]
async fn execute_query(window_id: &str, query: &str) -> Result<String, String> {
    // 根据窗口ID获取数据库连接
    if let Some(client) = database::get_connection(window_id) {
        // 执行查询
        match client.query(query, &[]).await {
            Ok(rows) => {
                // 简单转换结果为JSON格式
                let mut result = Vec::new();
                for row in rows {
                    let mut row_data = serde_json::Map::new();
                    for i in 0..row.len() {
                        let col_name = row.columns()[i].name().to_owned();
                        // 处理不同类型的列
                        if let Ok(val) = row.try_get::<_, String>(i) {
                            row_data.insert(col_name, serde_json::Value::String(val));
                        } else if let Ok(val) = row.try_get::<_, i32>(i) {
                            row_data.insert(col_name, serde_json::Value::Number(serde_json::Number::from(val)));
                        } else if let Ok(val) = row.try_get::<_, i64>(i) {
                            row_data.insert(col_name, serde_json::Value::Number(serde_json::Number::from(val)));
                        } else if let Ok(val) = row.try_get::<_, f64>(i) {
                            if let Some(num) = serde_json::Number::from_f64(val) {
                                row_data.insert(col_name, serde_json::Value::Number(num));
                            }
                        } else if let Ok(val) = row.try_get::<_, bool>(i) {
                            row_data.insert(col_name, serde_json::Value::Bool(val));
                        } else {
                            // 对于其他类型，尝试转换为字符串
                            row_data.insert(col_name, serde_json::Value::String("得到值".to_string()));
                        }
                    }
                    result.push(serde_json::Value::Object(row_data));
                }
                Ok(serde_json::to_string(&result).unwrap_or_else(|_| "[]".to_string()))
            }
            Err(e) => Err(format!("查询执行错误: {}", e))
        }
    } else {
        Err(format!("找不到窗口ID对应的数据库连接: {}", window_id))
    }
}

#[tauri::command]
async fn connect_to_database(app_handle: AppHandle, config: DatabaseConfig) -> ConnectionResult {
    // 生成唯一的窗口ID，使用时间戳作为后缀
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let window_id = format!("query-window-{}", timestamp);
    
    // 使用唯一的窗口ID建立连接
    let result = database::establish_postgres_connection(&config, &window_id).await;
    
    if result.success {
        // 使用相同的窗口ID创建窗口，以便后续可以通过此ID获取对应的数据库连接
        let _window = tauri::WebviewWindowBuilder::new(
            &app_handle,
            &window_id,
            tauri::WebviewUrl::App("query.html".into())
        )
        .title(format!("LinguaQL - {} - 数据库查询", config.database))
        .inner_size(1200.0, 800.0)
        .center()
        .build();
    }
    
    result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            test_database_connection,
            connect_to_database,
            execute_query
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
