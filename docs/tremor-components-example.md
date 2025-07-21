# Tremor UI 组件使用示例

## 为什么选择 Tremor？

Tremor 是专门为数据密集型应用设计的React组件库，非常适合LinguaQL这样的数据查询工具：

- **数据优先设计**：专为数据展示和分析而生
- **现代美观**：基于Tailwind CSS，设计简洁现代
- **开箱即用**：内置图表、表格、指标卡等数据组件
- **TypeScript支持**：完整的类型定义
- **轻量级**：相比Ant Design更轻量

## 核心组件示例

### 1. 连接管理器
```typescript
// src/components/ConnectionManager/ConnectionManager.tsx
import React, { useState } from 'react';
import {
  Card,
  Title,
  Text,
  Button,
  TextInput,
  Select,
  SelectItem,
  Badge,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Flex
} from '@tremor/react';
import { Database, Plus, Trash2, TestTube } from 'lucide-react';

export const ConnectionManager: React.FC = () => {
  const [connections, setConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title>数据库连接</Title>
            <Text className="mt-1">管理你的数据库连接</Text>
          </div>
          <Button 
            icon={Plus} 
            onClick={() => setShowForm(true)}
          >
            添加连接
          </Button>
        </Flex>
      </Card>

      {/* 连接列表 */}
      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>名称</TableHeaderCell>
              <TableHeaderCell>类型</TableHeaderCell>
              <TableHeaderCell>主机</TableHeaderCell>
              <TableHeaderCell>状态</TableHeaderCell>
              <TableHeaderCell>操作</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                <Flex alignItems="center" className="space-x-2">
                  <Database className="h-4 w-4" />
                  <Text>生产数据库</Text>
                </Flex>
              </TableCell>
              <TableCell>
                <Badge color="blue">MySQL</Badge>
              </TableCell>
              <TableCell>localhost:3306</TableCell>
              <TableCell>
                <Badge color="green">已连接</Badge>
              </TableCell>
              <TableCell>
                <Flex className="space-x-2">
                  <Button size="xs" variant="secondary" icon={TestTube}>
                    测试
                  </Button>
                  <Button size="xs" variant="secondary" icon={Trash2} color="red">
                    删除
                  </Button>
                </Flex>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* 添加连接表单 */}
      {showForm && (
        <Card>
          <Title className="mb-4">添加新连接</Title>
          <div className="grid grid-cols-2 gap-4">
            <TextInput placeholder="连接名称" />
            <Select>
              <SelectItem value="mysql">MySQL</SelectItem>
              <SelectItem value="postgresql">PostgreSQL</SelectItem>
              <SelectItem value="sqlite">SQLite</SelectItem>
            </Select>
            <TextInput placeholder="主机地址" />
            <TextInput placeholder="端口" />
            <TextInput placeholder="数据库名" />
            <TextInput placeholder="用户名" />
            <TextInput type="password" placeholder="密码" />
          </div>
          <Flex justifyContent="end" className="mt-4 space-x-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              取消
            </Button>
            <Button>保存连接</Button>
          </Flex>
        </Card>
      )}
    </div>
  );
};
```

### 2. 查询历史
```typescript
// src/components/QueryHistory/QueryHistory.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Title,
  Text,
  Badge,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Button,
  Flex
} from '@tremor/react';
import { History, Play, Copy } from 'lucide-react';
import { storageService } from '../../services/storage';

export const QueryHistory: React.FC = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await storageService.getQueryHistory();
    setHistory(data);
  };

  const copyToClipboard = (sql: string) => {
    navigator.clipboard.writeText(sql);
  };

  return (
    <Card>
      <Flex alignItems="center" className="mb-4">
        <History className="h-5 w-5 mr-2" />
        <Title>查询历史</Title>
      </Flex>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>自然语言</TableHeaderCell>
            <TableHeaderCell>SQL语句</TableHeaderCell>
            <TableHeaderCell>执行时间</TableHeaderCell>
            <TableHeaderCell>结果行数</TableHeaderCell>
            <TableHeaderCell>执行日期</TableHeaderCell>
            <TableHeaderCell>操作</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map((item, index) => (
            <TableRow key={index}>
              <TableCell>
                <Text className="max-w-xs truncate">
                  {item.naturalLanguage}
                </Text>
              </TableCell>
              <TableCell>
                <Text className="font-mono text-xs max-w-xs truncate">
                  {item.generatedSql}
                </Text>
              </TableCell>
              <TableCell>
                <Badge color="blue">{item.executionTime}ms</Badge>
              </TableCell>
              <TableCell>
                <Badge color="green">{item.rowCount} 行</Badge>
              </TableCell>
              <TableCell>
                <Text className="text-xs">
                  {new Date(item.executedAt).toLocaleString()}
                </Text>
              </TableCell>
              <TableCell>
                <Flex className="space-x-1">
                  <Button 
                    size="xs" 
                    variant="secondary" 
                    icon={Copy}
                    onClick={() => copyToClipboard(item.generatedSql)}
                  >
                    复制
                  </Button>
                  <Button 
                    size="xs" 
                    variant="secondary" 
                    icon={Play}
                  >
                    重新执行
                  </Button>
                </Flex>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
```

### 3. 数据可视化仪表板
```typescript
// src/components/Dashboard/Dashboard.tsx
import React from 'react';
import {
  Card,
  Title,
  Text,
  Metric,
  Flex,
  Grid,
  AreaChart,
  BarChart,
  DonutChart
} from '@tremor/react';
import { Database, Zap, Clock, TrendingUp } from 'lucide-react';

export const Dashboard: React.FC = () => {
  // 模拟数据
  const queryStats = [
    { date: '2024-01', queries: 45 },
    { date: '2024-02', queries: 52 },
    { date: '2024-03', queries: 48 },
    { date: '2024-04', queries: 61 },
    { date: '2024-05', queries: 55 },
    { date: '2024-06', queries: 67 },
  ];

  const dbTypes = [
    { name: 'MySQL', value: 45 },
    { name: 'PostgreSQL', value: 30 },
    { name: 'SQLite', value: 25 },
  ];

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6">
        <Card>
          <Flex alignItems="center">
            <Database className="h-6 w-6 text-blue-500" />
            <div className="ml-3">
              <Text>总连接数</Text>
              <Metric>12</Metric>
            </div>
          </Flex>
        </Card>

        <Card>
          <Flex alignItems="center">
            <Zap className="h-6 w-6 text-green-500" />
            <div className="ml-3">
              <Text>今日查询</Text>
              <Metric>28</Metric>
            </div>
          </Flex>
        </Card>

        <Card>
          <Flex alignItems="center">
            <Clock className="h-6 w-6 text-yellow-500" />
            <div className="ml-3">
              <Text>平均响应时间</Text>
              <Metric>245ms</Metric>
            </div>
          </Flex>
        </Card>

        <Card>
          <Flex alignItems="center">
            <TrendingUp className="h-6 w-6 text-purple-500" />
            <div className="ml-3">
              <Text>成功率</Text>
              <Metric>98.5%</Metric>
            </div>
          </Flex>
        </Card>
      </Grid>

      {/* 图表 */}
      <Grid numItems={1} numItemsLg={2} className="gap-6">
        <Card>
          <Title>查询趋势</Title>
          <AreaChart
            className="mt-4 h-72"
            data={queryStats}
            index="date"
            categories={["queries"]}
            colors={["blue"]}
            yAxisWidth={40}
          />
        </Card>

        <Card>
          <Title>数据库类型分布</Title>
          <DonutChart
            className="mt-4 h-72"
            data={dbTypes}
            category="value"
            index="name"
            colors={["blue", "green", "yellow"]}
          />
        </Card>
      </Grid>
    </div>
  );
};
```

### 4. 设置页面
```typescript
// src/components/Settings/Settings.tsx
import React, { useState } from 'react';
import {
  Card,
  Title,
  Text,
  TextInput,
  Button,
  Switch,
  Select,
  SelectItem,
  Divider,
  Callout
} from '@tremor/react';
import { Settings as SettingsIcon, Key, Palette, Database } from 'lucide-react';

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [autoSave, setAutoSave] = useState(true);
  const [theme, setTheme] = useState('light');

  return (
    <div className="space-y-6">
      <Card>
        <Flex alignItems="center" className="mb-4">
          <SettingsIcon className="h-5 w-5 mr-2" />
          <Title>应用设置</Title>
        </Flex>

        {/* AI设置 */}
        <div className="space-y-4">
          <div>
            <Text className="font-medium mb-2">🤖 AI 配置</Text>
            <TextInput
              icon={Key}
              placeholder="输入 OpenAI API Key"
              value={apiKey}
              onValueChange={setApiKey}
              type="password"
            />
            <Text className="text-xs text-gray-500 mt-1">
              API Key 将安全存储在本地，不会上传到服务器
            </Text>
          </div>

          <Divider />

          {/* 界面设置 */}
          <div>
            <Text className="font-medium mb-2">🎨 界面设置</Text>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Text>主题模式</Text>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectItem value="light">浅色</SelectItem>
                  <SelectItem value="dark">深色</SelectItem>
                  <SelectItem value="auto">跟随系统</SelectItem>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Text>自动保存查询历史</Text>
                <Switch checked={autoSave} onChange={setAutoSave} />
              </div>
            </div>
          </div>

          <Divider />

          {/* 数据库设置 */}
          <div>
            <Text className="font-medium mb-2">💾 数据库设置</Text>
            <Callout
              title="本地存储"
              icon={Database}
              color="blue"
            >
              查询历史和连接配置存储在本地 SQLite 数据库中，
              数据不会离开你的设备。
            </Callout>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="secondary">重置设置</Button>
            <Button>保存设置</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
```

## 主应用布局

```typescript
// src/App.tsx
import React, { useState } from 'react';
import { 
  TabGroup, 
  TabList, 
  Tab, 
  TabPanels, 
  TabPanel,
  Card 
} from '@tremor/react';
import { QueryBuilder } from './components/QueryBuilder/QueryBuilder';
import { ConnectionManager } from './components/ConnectionManager/ConnectionManager';
import { QueryHistory } from './components/QueryHistory/QueryHistory';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Settings } from './components/Settings/Settings';

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
      <main className="p-6">
        <Card>
          <TabGroup>
            <TabList className="mt-2">
              <Tab>🗣️ 查询</Tab>
              <Tab>🔗 连接</Tab>
              <Tab>📊 仪表板</Tab>
              <Tab>📝 历史</Tab>
              <Tab>⚙️ 设置</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <QueryBuilder />
              </TabPanel>
              <TabPanel>
                <ConnectionManager />
              </TabPanel>
              <TabPanel>
                <Dashboard />
              </TabPanel>
              <TabPanel>
                <QueryHistory />
              </TabPanel>
              <TabPanel>
                <Settings />
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </Card>
      </main>
    </div>
  );
}

export default App;
```

## Tremor 的优势

1. **专为数据而生**：内置图表、表格、指标卡等数据组件
2. **现代设计**：基于 Tailwind CSS，设计简洁美观
3. **TypeScript 友好**：完整的类型支持
4. **轻量级**：相比传统UI库更轻量
5. **易于定制**：基于 Tailwind，容易自定义样式

这样的UI设计更适合LinguaQL这样的数据分析工具！