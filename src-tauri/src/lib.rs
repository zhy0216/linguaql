use tauri::AppHandle;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_query_page(app_handle: AppHandle) -> String {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let window_id = format!("query-window-{}", timestamp);

    tauri::WebviewWindowBuilder::new(
        &app_handle,
        &window_id,
        tauri::WebviewUrl::App("index.html?page=query".into())
    )
    .inner_size(1200.0, 800.0)
    .center()
    .build();

    // return the window id
    window_id
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            open_query_page,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
