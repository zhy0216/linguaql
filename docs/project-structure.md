# LinguaQL 项目文档结构

## 当前文档说明

### 核心文档
- **README.md** - 项目概述和快速介绍
- **development-guide.md** - 完整的开发指南和教程
- **project-analysis.md** - 项目分析、市场定位和功能规划

### 实用工具
- **quick-start-simple.sh** - 一键创建项目的脚本
- **tremor-components-example.md** - Tremor UI组件使用示例

## 项目架构总结

### 技术栈
- **前端**: React 18 + TypeScript + Vite
- **桌面**: Tauri 2.0
- **UI**: Tremor (专为数据应用设计)
- **样式**: Tailwind CSS
- **数据库**: Tauri SQL插件 (MySQL/PostgreSQL/SQLite)
- **AI**: OpenAI GPT API

### 项目特点
- **纯前端架构** - 无需后端服务器
- **本地优先** - 数据本地处理，响应快速
- **跨平台** - Windows/macOS/Linux 一套代码
- **现代UI** - 使用专为数据应用设计的Tremor组件库

### 核心功能
1. 自然语言转SQL查询
2. 直接数据库连接和查询
3. 查询历史本地存储
4. 连接配置管理
5. 结果可视化展示

## 快速开始

```bash
# 运行快速启动脚本
chmod +x quick-start-simple.sh
./quick-start-simple.sh

# 或查看详细开发指南
cat development-guide.md
```

## 文档维护

所有文档都已更新为当前的纯前端架构，移除了过时的：
- NX monorepo 相关内容
- 后端服务器架构
- Ant Design UI组件
- 复杂的项目结构

保持文档简洁、实用、与当前架构一致。