use serde::{Deserialize, Serialize};
use tokio_postgres::{NoTls, Client};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use once_cell::sync::Lazy;

// 全局连接池，将窗口ID映射到数据库连接
static DB_CONNECTIONS: Lazy<Arc<Mutex<HashMap<String, Arc<Client>>>>> = 
    Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

// 存储连接到客户端的映射
pub fn store_connection(window_id: &str, client: Client) -> Arc<Client> {
    let client = Arc::new(client);
    DB_CONNECTIONS.lock().unwrap().insert(window_id.to_string(), client.clone());
    client
}

// 获取指定窗口ID的数据库连接
pub fn get_connection(window_id: &str) -> Option<Arc<Client>> {
    DB_CONNECTIONS.lock().unwrap().get(window_id).cloned()
}

// Helper function to get the first available database
async fn get_first_database(config: &DatabaseConfig) -> Result<String, Box<dyn std::error::Error>> {
    // Connect to postgres database (default system database) to query available databases
    let connection_string = format!(
        "host={} port={} user={} password={} dbname=postgres",
        config.host, config.port, config.username, config.password
    );

    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls).await?;
    
    // Spawn the connection to run in the background
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    // Query for available databases, excluding system databases
    let rows = client.query(
        "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres', 'template0', 'template1') ORDER BY datname LIMIT 1",
        &[]
    ).await?;

    if let Some(row) = rows.first() {
        let db_name: String = row.get(0);
        Ok(db_name)
    } else {
        // If no user databases found, fall back to 'postgres'
        Ok("postgres".to_string())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub database: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionResult {
    pub success: bool,
    pub message: String,
}

pub async fn test_postgres_connection(config: &DatabaseConfig) -> ConnectionResult {
    let database_name = if config.database.is_empty() {
        // If no database specified, try to get the first available database
        match get_first_database(config).await {
            Ok(db_name) => db_name,
            Err(e) => return ConnectionResult {
                success: false,
                message: format!("无法获取默认数据库: {}", e),
            },
        }
    } else {
        config.database.clone()
    };

    let connection_string = format!(
        "host={} port={} user={} password={} dbname={}",
        config.host, config.port, config.username, config.password, database_name
    );

    match tokio_postgres::connect(&connection_string, NoTls).await {
        Ok((client, connection)) => {
            // The connection object performs the actual communication with the database,
            // so spawn it off to run on its own.
            tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("connection error: {}", e);
                }
            });

            // Test a simple query
            match client.query("SELECT 1", &[]).await {
                Ok(_) => ConnectionResult {
                    success: true,
                    message: format!("连接成功！已连接到数据库: {}", database_name),
                },
                Err(e) => ConnectionResult {
                    success: false,
                    message: format!("查询测试失败: {}", e),
                },
            }
        }
        Err(e) => ConnectionResult {
            success: false,
            message: format!("连接失败: {}", e),
        },
    }
}

pub async fn establish_postgres_connection(config: &DatabaseConfig, window_id: &str) -> ConnectionResult {
    let database_name = if config.database.is_empty() {
        // If no database specified, try to get the first available database
        match get_first_database(config).await {
            Ok(db_name) => db_name,
            Err(e) => return ConnectionResult {
                success: false,
                message: format!("无法获取默认数据库: {}", e),
            },
        }
    } else {
        config.database.clone()
    };

    let connection_string = format!(
        "host={} port={} user={} password={} dbname={}",
        config.host, config.port, config.username, config.password, database_name
    );

    match tokio_postgres::connect(&connection_string, NoTls).await {
        Ok((client, connection)) => {
            // Store the connection for later use
            tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("connection error: {}", e);
                }
            });
            
            // 存储窗口ID和连接的映射
            store_connection(window_id, client);

            ConnectionResult {
                success: true,
                message: format!("数据库连接已建立，已连接到: {}，正在打开查询窗口...", database_name),
            }
        }
        Err(e) => ConnectionResult {
            success: false,
            message: format!("连接建立失败: {}", e),
        },
    }
}
