import Database from '@tauri-apps/plugin-sql';
import { DatabaseConfig, ConnectionResult, TableColumnInfo } from '../types/database';
import { Parser } from 'node-sql-parser';
import { useSettingsStore } from '../stores/settingsStore';
import i18n from 'i18next';

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

export interface TableFilter {
  column: string;
  operator:
    | 'equals'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'notEquals'
    | 'isEmpty'
    | 'isNotEmpty';
  value: string;
}

export interface TableSort {
  column: string;
  direction: 'asc' | 'desc';
}

export interface PaginatedTableRequest {
  schema: string;
  tableName: string;
  page: number;
  pageSize: number;
  filters?: TableFilter[];
  sort?: TableSort;
}

export interface PaginatedTableResult {
  columns: string[];
  rows: any[][];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowsAffected?: number;
  error?: string;
}

export class DBService {
  private connection: Database | null = null;

  static dbConfigToUrl(config: DatabaseConfig): string {
    return `postgres://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
  }

  public static isValidSQL(sql: string): boolean {
    if (!sql || typeof sql !== 'string') {
      return false;
    }

    const trimmedSql = sql.trim();
    if (trimmedSql.length === 0) {
      return false;
    }

    try {
      // Create parser instance with PostgreSQL dialect
      const parser = new Parser();

      // Parse the SQL - this will throw an error if invalid
      const ast = parser.astify(trimmedSql, {
        database: 'postgresql',
      });

      // Additional validation: ensure we have a valid AST
      if (!ast) {
        return false;
      }

      // Get enabled statement types from settings
      const validStatementTypes = useSettingsStore.getState().getEnabledStatementTypes();

      // Handle both single statements and arrays of statements
      const statements = Array.isArray(ast) ? ast : [ast];

      for (const statement of statements) {
        if (!statement || !statement.type) {
          return false;
        }

        const statementType = statement.type.toLowerCase();
        if (!validStatementTypes.includes(statementType)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      // If parsing fails, the SQL is invalid
      console.debug('SQL validation failed:', error);
      return false;
    }
  }

  public static isSafeSQL(sql: string): boolean {
    if (!sql || typeof sql !== 'string') {
      return false;
    }

    const trimmedSql = sql.trim().toLowerCase();
    if (trimmedSql.length === 0) {
      return false;
    }

    // First check if the SQL is syntactically valid
    if (!this.isValidSQL(sql)) {
      return false;
    }

    try {
      const parser = new Parser();
      const ast = parser.astify(sql, {
        database: 'postgresql',
      });

      const statements = Array.isArray(ast) ? ast : [ast];

      // 获取不需要安全检查的语句类型
      const statementTypesWithoutSafetyCheck = useSettingsStore
        .getState()
        .getStatementTypesWithoutSafetyCheck();

      for (const statement of statements) {
        const statementType = statement.type.toLowerCase();

        // 如果语句类型不需要安全检查，则直接允许（但仍然检查可疑模式）
        if (statementTypesWithoutSafetyCheck.includes(statementType)) {
          // 仍然检查可疑模式，即使是安全的读操作
          if (this.containsSuspiciousPatterns(sql)) {
            return false;
          }
          continue;
        }

        // 其他需要安全检查的语句类型都被认为是危险的
        console.warn(`Blocked potentially dangerous SQL statement: ${statementType}`);
        return false;
      }

      return true;
    } catch (error) {
      console.debug('SQL safety check failed:', error);
      return false;
    }
  }

  private static containsSuspiciousPatterns(sql: string): boolean {
    const suspiciousPatterns = [
      // SQL injection patterns
      /;\s*(drop|truncate|alter|delete|update)\s+/i,
      /union\s+select/i,
      /\bor\s+1\s*=\s*1\b/i,
      /\band\s+1\s*=\s*1\b/i,
      /\bor\s+'.*'\s*=\s*'.*'/i,
      /\band\s+'.*'\s*=\s*'.*'/i,
      // System function calls
      /\b(pg_|information_schema|pg_catalog)/i,
      // File operations
      /\b(copy|\\copy)\s+/i,
      // Multiple statements (basic check)
      /;\s*\w+/,
      // Comments that might hide malicious code
      /\/\*.*\*\//s,
      /--.*$/m,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sql)) {
        return true;
      }
    }

    return false;
  }

  async connect(config: DatabaseConfig): Promise<Database> {
    try {
      const db = await Database.load(DBService.dbConfigToUrl(config));
      return db;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }
  /**
   * 获取数据库连接
   */
  async getConnection(config?: DatabaseConfig): Promise<Database> {
    // 如果已经有连接，直接返回
    if (this.connection) {
      return this.connection;
    }

    if (!config) {
      throw new Error(`need to connect to database first`);
    }

    this.connection = await this.connect(config);
    return this.connection;
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

      const result = (await db.select(query)) as any[];

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

      const result = (await db.select(query, [request.pageSize, offset])) as any[];
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
        const result = (await db.select(query)) as any[];

        // 提取列名（从第一行数据中获取）
        const columns = result.length > 0 ? Object.keys(result[0]) : [];

        // 转换为行数组格式
        const rows = result.map((row: any) => columns.map(col => row[col]));

        return {
          columns,
          rows,
          rowsAffected: result.length,
          error: result.length === 0 ? i18n.t('query.noResultsFound') : undefined,
        };
      } else {
        // INSERT, UPDATE, DELETE 等修改操作
        const result = (await db.execute(query)) as any;

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
  async getTableColumns(schema: string, tableName: string): Promise<TableColumnInfo[]> {
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

      const result = (await db.select(query, [schema, tableName])) as TableColumnInfo[];
      console.log('result:', result);
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
      const result = (await db.select(query)) as any[];

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Failed to get table row count:', error);
      return 0;
    }
  }

  /**
   * Get paginated table data with filtering and sorting
   */
  async getPaginatedTableData(request: PaginatedTableRequest): Promise<PaginatedTableResult> {
    try {
      const db = await this.getConnection();
      const { schema, tableName, page, pageSize, filters, sort } = request;

      // Build WHERE clause from filters
      const { whereClause, params } = this.buildWhereClause(filters || []);

      // Build ORDER BY clause from sort
      const orderByClause = sort ? `ORDER BY "${sort.column}" ${sort.direction.toUpperCase()}` : '';

      // Calculate offset
      const offset = (page - 1) * pageSize;

      // Build count query
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM "${schema}"."${tableName}"
        ${whereClause}
      `;

      // Build data query
      const dataQuery = `
        SELECT * 
        FROM "${schema}"."${tableName}"
        ${whereClause}
        ${orderByClause}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      // Execute count query
      const countResult = (await db.select(countQuery, params)) as any[];
      const totalCount = countResult[0]?.count || 0;

      // Execute data query
      const dataParams = [...params, pageSize, offset];
      const dataResult = (await db.select(dataQuery, dataParams)) as any[];

      // Get column names from the first row or from table schema
      let columns: string[] = [];
      if (dataResult.length > 0) {
        columns = Object.keys(dataResult[0]);
      } else {
        // If no data, get columns from table schema
        const columnInfo = await this.getTableColumns(schema, tableName);
        columns = columnInfo.map(col => col.column_name);
      }

      // Convert rows to array format
      const rows = dataResult.map(row => columns.map(col => row[col]));

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        columns,
        rows,
        totalCount,
        totalPages,
        currentPage: page,
        pageSize,
      };
    } catch (error) {
      console.error('Failed to get paginated table data:', error);
      throw new Error(`Failed to get paginated table data: ${error}`);
    }
  }

  /**
   * Build WHERE clause from filters
   */
  private buildWhereClause(filters: TableFilter[]): { whereClause: string; params: any[] } {
    if (!filters || filters.length === 0) {
      return { whereClause: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const filter of filters) {
      const { column, operator, value } = filter;
      const columnRef = `"${column}"`;

      switch (operator) {
        case 'equals':
          conditions.push(`${columnRef} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'notEquals':
          conditions.push(`${columnRef} != $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'contains':
          conditions.push(`${columnRef}::text ILIKE $${paramIndex}`);
          params.push(`%${value}%`);
          paramIndex++;
          break;
        case 'startsWith':
          conditions.push(`${columnRef}::text ILIKE $${paramIndex}`);
          params.push(`${value}%`);
          paramIndex++;
          break;
        case 'endsWith':
          conditions.push(`${columnRef}::text ILIKE $${paramIndex}`);
          params.push(`%${value}`);
          paramIndex++;
          break;
        case 'gt':
          conditions.push(`${columnRef} > $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'gte':
          conditions.push(`${columnRef} >= $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'lt':
          conditions.push(`${columnRef} < $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'lte':
          conditions.push(`${columnRef} <= $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'isEmpty':
          conditions.push(`(${columnRef} IS NULL OR ${columnRef}::text = '')`);
          break;
        case 'isNotEmpty':
          conditions.push(`(${columnRef} IS NOT NULL AND ${columnRef}::text != '')`);
          break;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
  }

  /**
   * 测试数据库连接
   */
  async testDatabaseConnection(config: DatabaseConfig): Promise<ConnectionResult> {
    // using Database.load
    try {
      await this.getConnection(config);
      return {
        success: true,
        message: '连接测试成功',
      };
    } catch (error) {
      return {
        success: false,
        message: `测试连接时发生错误: ${error}`,
      };
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
