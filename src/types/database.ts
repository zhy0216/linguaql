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
