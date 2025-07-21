import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';

export interface DatabaseTable {
  name: string;
  schema: string;
}

export interface TableDataRequest {
  schema: string;
  name: string;
  page: number;
  pageSize: number;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowsAffected?: number;
  error?: string;
}

class DBService {
  private connection: Database | null = null;

  /**
   * 获取数据库连接
   */
  async getConnection(): Promise<Database> {
    // 如果已经有连接，直接返回
    if (this.connection) {
      return this.connection;
    }

    // 从后端获取连接URL
    try {
      // TODO
      const db = await Database.load("");
      this.connection = db;
      return db;
    } catch (error) {
      throw new Error(`Failed to get database connection: ${error}`);
    }
  }

  /**
   * 获取数据库表列表
   */
  async getDatabaseTables(): Promise<DatabaseTable[]> {
    try {
      const db = await this.getConnection();
      
      const query = `
        SELECT 
          table_schema, 
          table_name 
        FROM 
          information_schema.tables 
        WHERE 
          table_schema NOT IN ('pg_catalog', 'information_schema') 
          AND table_type = 'BASE TABLE' 
        ORDER BY 
          table_schema, 
          table_name
      `;

      const result = await db.select(query) as any[];
      
      return result.map((row: any) => ({
        schema: row.table_schema,
        name: row.table_name,
      }));
    } catch (error) {
      console.error('Failed to get database tables:', error);
      throw new Error(`Failed to get database tables: ${error}`);
    }
  }

  /**
   * 获取表数据（分页）
   */
  async getTableData(request: TableDataRequest): Promise<any[]> {
    try {
      const db = await this.getConnection();
      
      const offset = (request.page - 1) * request.pageSize;
      const query = `
        SELECT * FROM "${request.schema}"."${request.name}" 
        LIMIT $1 OFFSET $2
      `;

      const result = await db.select(query, [request.pageSize, offset]) as any[];
      return result;
    } catch (error) {
      console.error('Failed to get table data:', error);
      throw new Error(`Failed to get table data: ${error}`);
    }
  }

  /**
   * 执行SQL查询
   */
  async executeQuery(query: string): Promise<QueryResult> {
    try {
      const db = await this.getConnection();
      
      // 判断查询类型
      const trimmedQuery = query.trim().toUpperCase();
      
      if (trimmedQuery.startsWith('SELECT')) {
        // SELECT 查询
        const result = await db.select(query) as any[];
        
        // 提取列名（从第一行数据中获取）
        const columns = result.length > 0 ? Object.keys(result[0]) : [];
        
        // 转换为行数组格式
        const rows = result.map((row: any) => columns.map(col => row[col]));
        
        return {
          columns,
          rows,
          rowsAffected: result.length,
        };
      } else {
        // INSERT, UPDATE, DELETE 等修改操作
        const result = await db.execute(query) as any;
        
        return {
          columns: [],
          rows: [],
          rowsAffected: result.rowsAffected || 0,
        };
      }
    } catch (error) {
      console.error('Failed to execute query:', error);
      return {
        columns: ['Error'],
        rows: [[`Query execution failed: ${error}`]],
        error: `Query execution failed: ${error}`,
      };
    }
  }

  /**
   * 获取表的列信息
   */
  async getTableColumns(schema: string, tableName: string): Promise<any[]> {
    try {
      const db = await this.getConnection();
      
      const query = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM 
          information_schema.columns 
        WHERE 
          table_schema = $1 
          AND table_name = $2
        ORDER BY 
          ordinal_position
      `;

      const result = await db.select(query, [schema, tableName]) as any[];
      return result;
    } catch (error) {
      console.error('Failed to get table columns:', error);
      throw new Error(`Failed to get table columns: ${error}`);
    }
  }

  /**
   * 获取表的行数
   */
  async getTableRowCount(schema: string, tableName: string): Promise<number> {
    try {
      const db = await this.getConnection();
      
      const query = `SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`;
      const result = await db.select(query) as any[];
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Failed to get table row count:', error);
      return 0;
    }
  }

  /**
   * 关闭连接
   */
  async closeConnection(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.close();
        this.connection = null;
      } catch (error) {
        console.error('Failed to close connection:', error);
      }
    }
  }
}

// 导出单例实例
export const dbService = new DBService();
export default dbService;
