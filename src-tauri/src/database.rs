use serde::{Deserialize, Serialize};
use tokio_postgres::NoTls;

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

pub async fn establish_postgres_connection(config: &DatabaseConfig) -> ConnectionResult {
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
        Ok((_client, connection)) => {
            // Store the connection for later use
            tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("connection error: {}", e);
                }
            });

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
