#!/bin/bash

# LinguaQL 简化版快速启动脚本
echo "🚀 开始创建 LinguaQL 项目 (纯前端版本)..."

# 检查必需工具
echo "📋 检查环境依赖..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

if ! command -v rustc &> /dev/null; then
    echo "❌ Rust 未安装，请先安装 Rust"
    echo "运行: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

echo "✅ 环境检查通过"

# 创建React项目
echo "📦 创建 React + TypeScript 项目..."
npm create vite@latest . -- --template react-ts


# 安装依赖
echo "📦 安装项目依赖..."
npm install

# 安装UI库
echo "🎨 安装 Tremor UI..."
npm install @tremor/react
npm install lucide-react
npm install dayjs lodash
npm install --save-dev @types/lodash

# 安装Tauri
echo "🖥️ 安装 Tauri..."
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api tauri-plugin-sql-api

# 初始化Tauri
echo "🔧 初始化 Tauri..."
npx tauri init --app-name "LinguaQL" --window-title "LinguaQL" --dist-dir "../dist" --dev-path "http://localhost:5173"

# 配置Tauri SQL插件
echo "🔌 配置 SQL 插件..."
cat >> src-tauri/Cargo.toml << 'EOF'

# SQL插件依赖
tauri-plugin-sql = { version = "2.0", features = ["sqlite", "mysql", "postgres"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
EOF

# 更新package.json脚本
echo "📝 更新构建脚本..."
npm pkg set scripts.tauri="tauri"
npm pkg set scripts.dev="tauri dev"
npm pkg set scripts.build="tauri build"

# 创建项目结构
echo "📁 创建项目结构..."

# 创建类型定义
mkdir -p src/types
cat > src/types/database.ts << 'EOF'
export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  executionTime: number;
  rowCount: number;
}

export interface NaturalLanguageQuery {
  input: string;
  generatedSql: string;
  confidence: number;
  explanation: string;
}

export interface QueryHistory {
  id: number;
  naturalLanguage: string;
  generatedSql: string;
  executedAt: string;
  executionTime: number;
  rowCount: number;
}
EOF

# 创建数据库服务
mkdir -p src/services
cat > src/services/database.ts << 'EOF'
import Database from 'tauri-plugin-sql-api';
import { DatabaseConnection, QueryResult } from '../types/database';

export class DatabaseService {
  private connections: Map<string, Database> = new Map();

  async testConnection(config: DatabaseConnection): Promise<boolean> {
    try {
      const connectionString = this.buildConnectionString(config);
      const db = await Database.load(connectionString);
      await db.select('SELECT 1');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async connect(config: DatabaseConnection): Promise<Database> {
    const connectionString = this.buildConnectionString(config);
    const db = await Database.load(connectionString);
    this.connections.set(config.id, db);
    return db;
  }

  async executeQuery(connectionId: string, sql: string): Promise<QueryResult> {
    const db = this.connections.get(connectionId);
    if (!db) throw new Error('Connection not found');
    
    const startTime = Date.now();
    const result = await db.select(sql);
    const executionTime = Date.now() - startTime;
    
    return {
      rows: result,
      columns: result.length > 0 ? Object.keys(result[0]) : [],
      rowCount: result.length,
      executionTime
    };
  }

  private buildConnectionString(config: DatabaseConnection): string {
    const { type, host, port, database, username, password } = config;
    
    switch (type) {
      case 'mysql':
        return `mysql://${username}:${password}@${host}:${port}/${database}`;
      case 'postgresql':
        return `postgres://${username}:${password}@${host}:${port}/${database}`;
      case 'sqlite':
        return `sqlite:${database}`;
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
}

export const databaseService = new DatabaseService();
EOF

# 创建AI服务
cat > src/services/ai.ts << 'EOF'
import { NaturalLanguageQuery } from '../types/database';

export class AIService {
  constructor(private apiKey: string) {}

  async generateSQL(
    naturalLanguage: string,
    schema?: any
  ): Promise<NaturalLanguageQuery> {
    if (!this.apiKey) {
      throw new Error('OpenAI API Key 未配置');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `你是一个SQL专家。根据用户的自然语言描述生成准确的SQL查询语句。

${schema ? `数据库结构：\n${JSON.stringify(schema, null, 2)}\n` : ''}

请返回JSON格式：
{
  "sql": "生成的SQL语句",
  "confidence": 0.95,
  "explanation": "查询说明"
}`
          },
          {
            role: 'user',
            content: naturalLanguage
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      return {
        input: naturalLanguage,
        generatedSql: parsed.sql,
        confidence: parsed.confidence,
        explanation: parsed.explanation,
      };
    } catch (error) {
      throw new Error('AI响应解析失败');
    }
  }
}
EOF

# 创建存储服务
cat > src/services/storage.ts << 'EOF'
import Database from 'tauri-plugin-sql-api';
import { DatabaseConnection, QueryHistory } from '../types/database';

export class StorageService {
  private db: Database | null = null;

  async init() {
    if (this.db) return this.db;
    
    this.db = await Database.load('sqlite:linguaql.db');
    
    // 创建查询历史表
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS query_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        natural_language TEXT NOT NULL,
        generated_sql TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER,
        row_count INTEGER
      )
    `);

    // 创建连接配置表
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    return this.db;
  }

  async saveQueryHistory(history: {
    naturalLanguage: string;
    generatedSql: string;
    executionTime: number;
    rowCount: number;
  }) {
    const db = await this.init();
    
    return await db.execute(
      'INSERT INTO query_history (natural_language, generated_sql, execution_time, row_count) VALUES (?, ?, ?, ?)',
      [history.naturalLanguage, history.generatedSql, history.executionTime, history.rowCount]
    );
  }

  async getQueryHistory(limit = 50): Promise<QueryHistory[]> {
    const db = await this.init();
    
    const rows = await db.select(
      'SELECT * FROM query_history ORDER BY executed_at DESC LIMIT ?',
      [limit]
    );

    return rows.map(row => ({
      id: row.id,
      naturalLanguage: row.natural_language,
      generatedSql: row.generated_sql,
      executedAt: row.executed_at,
      executionTime: row.execution_time,
      rowCount: row.row_count,
    }));
  }

  async saveConnection(connection: DatabaseConnection) {
    const db = await this.init();
    
    return await db.execute(
      'INSERT OR REPLACE INTO connections (id, name, config) VALUES (?, ?, ?)',
      [connection.id, connection.name, JSON.stringify(connection)]
    );
  }

  async getConnections(): Promise<DatabaseConnection[]> {
    const db = await this.init();
    
    const rows = await db.select('SELECT * FROM connections ORDER BY created_at DESC');
    return rows.map(row => JSON.parse(row.config));
  }
}

export const storageService = new StorageService();
EOF

# 创建主要组件
mkdir -p src/components/QueryBuilder
cat > src/components/QueryBuilder/QueryBuilder.tsx << 'EOF'
import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Textarea, 
  Table, 
  TableHead, 
  TableRow, 
  TableHeaderCell, 
  TableBody, 
  TableCell,
  Callout,
  Badge,
  Flex,
  Text,
  Title
} from '@tremor/react';
import { Play, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { databaseService } from '../../services/database';
import { AIService } from '../../services/ai';
import { storageService } from '../../services/storage';
import { QueryResult } from '../../types/database';

export const QueryBuilder: React.FC = () => {
  const [naturalQuery, setNaturalQuery] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 这里应该从设置中获取API Key
  const aiService = new AIService(localStorage.getItem('openai_api_key') || '');

  const handleGenerateSQL = async () => {
    if (!naturalQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await aiService.generateSQL(naturalQuery);
      setGeneratedSQL(result.generatedSql);
      setSuccess('SQL生成成功！');
    } catch (error) {
      setError(`SQL生成失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSQL = async () => {
    if (!generatedSQL.trim()) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // 这里需要选择的连接ID，暂时使用默认连接
      const result = await databaseService.executeQuery('default', generatedSQL);
      setResult(result);
      
      // 保存查询历史
      await storageService.saveQueryHistory({
        naturalLanguage: naturalQuery,
        generatedSql: generatedSQL,
        executionTime: result.executionTime,
        rowCount: result.rowCount,
      });

      setSuccess(`查询执行成功！返回 ${result.rowCount} 行数据`);
    } catch (error) {
      setError(`查询执行失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 自然语言查询卡片 */}
      <Card>
        <Flex justifyContent="between" alignItems="center" className="mb-4">
          <Title>🗣️ 自然语言查询</Title>
          <Text className="text-gray-500">用自然语言描述你的查询需求</Text>
        </Flex>
        
        <div className="space-y-4">
          <Textarea
            placeholder="例如：查看昨天的订单数量和金额、统计本月新用户注册情况、分析不同渠道的转化率"
            value={naturalQuery}
            onValueChange={setNaturalQuery}
            rows={3}
            className="w-full"
          />
          
          <Button 
            icon={Zap}
            onClick={handleGenerateSQL}
            loading={loading}
            disabled={!naturalQuery.trim()}
            size="lg"
          >
            生成SQL
          </Button>
        </div>
      </Card>

      {/* 生成的SQL卡片 */}
      {generatedSQL && (
        <Card>
          <Flex justifyContent="between" alignItems="center" className="mb-4">
            <Title>📝 生成的SQL</Title>
            <Text className="text-gray-500">可以手动编辑SQL语句</Text>
          </Flex>
          
          <div className="space-y-4">
            <Textarea
              value={generatedSQL}
              onValueChange={setGeneratedSQL}
              rows={6}
              className="font-mono text-sm"
            />
            
            <Button 
              icon={Play}
              onClick={handleExecuteSQL}
              loading={loading}
              disabled={!generatedSQL.trim()}
              size="lg"
            >
              执行查询
            </Button>
          </div>
        </Card>
      )}

      {/* 错误提示 */}
      {error && (
        <Callout
          title="执行错误"
          icon={AlertCircle}
          color="red"
        >
          {error}
        </Callout>
      )}

      {/* 成功提示 */}
      {success && (
        <Callout
          title="操作成功"
          icon={CheckCircle}
          color="green"
        >
          {success}
        </Callout>
      )}

      {/* 加载状态 */}
      {loading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <Text>正在处理中...</Text>
          </div>
        </Card>
      )}

      {/* 查询结果 */}
      {result && (
        <Card>
          <Flex justifyContent="between" alignItems="center" className="mb-4">
            <Title>📊 查询结果</Title>
            <Flex className="space-x-2">
              <Badge color="blue">{result.rowCount} 行</Badge>
              <Badge color="green">{result.executionTime}ms</Badge>
            </Flex>
          </Flex>
          
          <Table>
            <TableHead>
              <TableRow>
                {result.columns.map(col => (
                  <TableHeaderCell key={col}>{col}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {result.rows.slice(0, 100).map((row, index) => (
                <TableRow key={index}>
                  {result.columns.map(col => (
                    <TableCell key={col}>
                      {String(row[col] || '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {result.rowCount > 100 && (
            <div className="mt-4 text-center">
              <Text className="text-gray-500">
                显示前100行，共{result.rowCount}行数据
              </Text>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
EOF

# 更新主App组件
cat > src/App.tsx << 'EOF'
import React from 'react';
import { QueryBuilder } from './components/QueryBuilder/QueryBuilder';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-blue-600">
            LinguaQL
          </h1>
          <span className="ml-4 text-gray-600">
            自然语言数据查询工具
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <QueryBuilder />
      </main>
    </div>
  );
}

export default App;
EOF

# 更新样式和Tailwind配置
cat > src/App.css << 'EOF'
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  line-height: 1.5;
  color: #374151;
  background-color: #f9fafb;
}

#root {
  min-height: 100vh;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 代码字体 */
.font-mono {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
EOF

# 安装和配置Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 配置Tailwind
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
EOF

# 更新index.css
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# 更新Tauri配置
cat > src-tauri/tauri.conf.json << 'EOF'
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "LinguaQL",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "fs": {
        "all": true,
        "scope": ["$APPDATA/linguaql/*"]
      },
      "dialog": {
        "all": true
      },
      "http": {
        "all": true,
        "request": true
      }
    },
    "bundle": {
      "active": true,
      "targets": ["msi", "dmg", "deb"],
      "identifier": "com.linguaql.app",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "LinguaQL",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
EOF

echo "✅ LinguaQL 项目创建完成！"
echo ""
echo "🎯 下一步操作："
echo "1. cd linguaql"
echo "2. npm run dev          # 启动开发模式"
echo "3. npm run build        # 构建应用"
echo ""
echo "🎨 UI 框架："
echo "- 使用 Tremor UI (专为数据应用设计)"
echo "- 基于 Tailwind CSS"
echo "- 现代简洁的设计风格"
echo ""
echo "📝 重要提醒："
echo "- 需要配置 OpenAI API Key 才能使用AI功能"
echo "- 需要配置数据库连接才能执行查询"
echo ""
echo "📚 查看文档："
echo "- simple-architecture.md - 项目架构说明"
echo "- tremor-components-example.md - UI组件示例"
echo "- development-guide.md - 开发指南"
echo "- README.md - 项目概述"