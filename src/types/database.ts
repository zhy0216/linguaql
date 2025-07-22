export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface ServerConfig extends DatabaseConfig {
  id: string;
  name: string;
  createdAt: string;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
}

export interface TableColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string; // 'YES' or 'NO'
  column_default: string | null;
}
