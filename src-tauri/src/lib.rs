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
async fn connect_to_database(app_handle: AppHandle, config: DatabaseConfig) -> ConnectionResult {
    let result = database::establish_postgres_connection(&config).await;
    
    if result.success {
        // Create a new window for the database query interface
        let _window = tauri::WebviewWindowBuilder::new(
            &app_handle,
            "query-window",
            tauri::WebviewUrl::App("query.html".into())
        )
        .title("LinguaQL - 数据库查询")
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
            connect_to_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
