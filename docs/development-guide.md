# LinguaQL 开发指南

## 快速开始

### 1. 环境准备
```bash
# 安装 Node.js 18+
node --version

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustc --version

# macOS 需要安装 Xcode Command Line Tools
xcode-select --install
```

### 2. 创建项目
```bash
# 运行快速启动脚本
chmod +x quick-start-simple.sh
./quick-start-simple.sh

# 或者手动创建
npm create vite@latest linguaql -- --template react-ts
cd linguaql
npm install
```

### 3. 安装依赖
```bash
# UI库和样式
npm install @tremor/react lucide-react
npm install -D tailwindcss postcss autoprefixer

# 工具库
npm install dayjs lodash
npm install --save-dev @types/lodash

# Tauri
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api tauri-plugin-sql-api
```

### 4. 初始化Tauri
```bash
npx tauri init --app-name "LinguaQL" --window-title "LinguaQL"
```

### 5. 配置SQL插件
在 `src-tauri/Cargo.toml` 中添加：
```toml
tauri-plugin-sql = { version = "2.0", features = ["sqlite", "mysql", "postgres"] }
```

## 开发流程

### 启动开发服务器
```bash
npm run dev
# 或
npm run tauri dev
```

### 构建应用
```bash
npm run build
npm run tauri build
```

## 项目结构详解

### 前端代码结构
```
src/
├── components/           # React组件
│   ├── QueryBuilder/     # 查询构建器
│   ├── ConnectionManager/ # 连接管理
│   ├── QueryHistory/     # 查询历史
│   └── Settings/         # 设置页面
├── services/             # 服务层
│   ├── database.ts       # 数据库服务
│   ├── ai.ts             # AI服务
│   └── storage.ts        # 本地存储
├── types/                # 类型定义
│   ├── database.ts       # 数据库类型
│   └── query.ts          # 查询类型
├── hooks/                # 自定义Hooks
│   ├── useDatabase.ts    # 数据库Hook
│   └── useLocalStorage.ts # 存储Hook
└── utils/                # 工具函数
    ├── sql-parser.ts     # SQL解析
    └── validation.ts     # 数据验证
```

### Tauri后端结构
```
src-tauri/
├── src/
│   ├── main.rs           # 主程序
│   ├── commands/         # Tauri命令
│   └── database/         # 数据库操作
├── Cargo.toml            # Rust依赖
└── tauri.conf.json       # Tauri配置
```

## 核心功能实现

### 1. 数据库连接
```typescript
// src/services/database.ts
import Database from 'tauri-plugin-sql-api';

export class DatabaseService {
  async connect(config: DatabaseConnection) {
    const connectionString = this.buildConnectionString(config);
    return await Database.load(connectionString);
  }

  async executeQuery(connectionId: string, sql: string) {
    const db = this.connections.get(connectionId);
    const result = await db.select(sql);
    return {
      rows: result,
      columns: Object.keys(result[0] || {}),
      rowCount: result.length
    };
  }
}
```

### 2. AI服务集成
```typescript
// src/services/ai.ts
export class AIService {
  async generateSQL(naturalLanguage: string) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'SQL专家提示词' },
          { role: 'user', content: naturalLanguage }
        ]
      })
    });
    
    return await response.json();
  }
}
```

### 3. 本地存储
```typescript
// src/services/storage.ts
import Database from 'tauri-plugin-sql-api';

export class StorageService {
  async saveQueryHistory(history: QueryHistory) {
    const db = await Database.load('sqlite:linguaql.db');
    return await db.execute(
      'INSERT INTO query_history (...) VALUES (...)',
      [history.naturalLanguage, history.generatedSql]
    );
  }
}
```

## 配置说明

### Tauri配置 (tauri.conf.json)
```json
{
  "tauri": {
    "allowlist": {
      "http": { "all": true },
      "fs": { "all": true }
    },
    "windows": [{
      "title": "LinguaQL",
      "width": 1200,
      "height": 800
    }]
  }
}
```

### Vite配置 (vite.config.ts)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true
  }
});
```

## 调试技巧

### 1. 开发者工具
在开发模式下，可以使用浏览器开发者工具调试前端代码。

### 2. Rust日志
在 `src-tauri/src/main.rs` 中添加日志：
```rust
use tauri::Manager;

#[tauri::command]
fn my_command() {
    println!("Debug info");
}
```

### 3. 前端调试
```typescript
// 在组件中添加调试信息
console.log('Database result:', result);
```

## 常见问题

### 1. SQL插件连接失败
- 检查数据库服务是否启动
- 验证连接字符串格式
- 确认网络连接

### 2. AI API调用失败
- 检查API Key是否正确
- 验证网络连接
- 查看API配额限制

### 3. 构建失败
- 清理缓存：`npm run clean`
- 重新安装依赖：`rm -rf node_modules && npm install`
- 检查Rust工具链版本

## 部署发布

### 1. 构建应用
```bash
npm run tauri build
```

### 2. 生成安装包
构建完成后，安装包位于：
- Windows: `src-tauri/target/release/bundle/msi/`
- macOS: `src-tauri/target/release/bundle/dmg/`
- Linux: `src-tauri/target/release/bundle/deb/`

### 3. 代码签名 (可选)
为了避免安全警告，建议对应用进行代码签名。

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 许可证

MIT License