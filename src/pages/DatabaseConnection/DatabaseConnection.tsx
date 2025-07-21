import React, { useState, useEffect } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { Button, TextInput as Input, Label, Badge, Modal } from 'flowbite-react';
import { useServerConfigStore } from '../../stores/serverConfigStore';
import { DatabaseConfig, ConnectionResult, ServerConfig } from '../../types/database';
import dbService from '../../services/DBService';

interface Props {
  onDatabaseConnected: () => void;
  onOpenSettings: () => void;
}

const DatabaseConnection: React.FC<Props> = ({ onDatabaseConnected, onOpenSettings }) => {
  // Zustand store
  const {
    servers,
    selectedServerId,
    currentConfig: config,
    addServer,
    updateServer,
    deleteServer,
    setSelectedServer,
    setCurrentConfig: setConfig,
  } = useServerConfigStore();

  // Local component state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionResult | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [showNewServerModal, setShowNewServerModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<DatabaseConfig | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newConfig = {
      ...config,
      [name]: name === 'port' ? parseInt(value) || 5432 : value,
    };
    setConfig(newConfig);

    // Check if config has changed from original
    if (selectedServerId && originalConfig) {
      const hasChanged = Object.keys(newConfig).some(
        key =>
          newConfig[key as keyof DatabaseConfig] !== originalConfig[key as keyof DatabaseConfig]
      );
      setIsDirty(hasChanged);
    }
  };

  const testConnection = async () => {
    if (!config.host || !config.username) {
      setTestResult({
        success: false,
        message: '请填写所有必需的字段（主机、用户名）',
      });
      setTestSuccess(false);
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);
    setTestSuccess(false);

    try {
      const result = await dbService.testDatabaseConnection(config);
      setTestResult(result);
      setTestSuccess(result.success);
    } catch (error) {
      setTestResult({
        success: false,
        message: `测试连接时发生错误: ${error}`,
      });
      setTestSuccess(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const connectToDatabase = async () => {
    if (!config.host || !config.username) {
      setTestResult({
        success: false,
        message: '请填写所有必需的字段（主机、用户名）',
      });
      return;
    }

    setIsConnecting(true);
    setTestResult(null);

    try {
      const result = await dbService.testDatabaseConnection(config);
      setTestResult(result);
      saveCurrentServer();
      await getCurrentWindow().setSize(new LogicalSize(1200, 600));
      onDatabaseConnected();
    } catch (error) {
      setTestResult({
        success: false,
        message: `连接数据库时发生错误: ${error}`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedServerId && isDirty) {
          saveCurrentServer();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedServerId, isDirty, config]);

  const addNewServer = () => {
    if (!newServerName.trim()) return;

    const newServer: ServerConfig = {
      id: Date.now().toString(),
      name: newServerName,
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      createdAt: new Date().toISOString(),
    };

    addServer(newServer);
    setNewServerName('');
    setShowNewServerModal(false);
  };

  const addServerFromUrl = () => {
    if (!serverUrl.trim()) return;

    try {
      // Parse PostgreSQL URL format: postgresql://username:password@host:port/database
      const url = new URL(serverUrl);
      if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
        throw new Error('Invalid PostgreSQL URL');
      }

      const newServer: ServerConfig = {
        id: Date.now().toString(),
        name: `${url.hostname}:${url.port || 5432}`,
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        username: url.username || '',
        password: url.password || '',
        database: url.pathname.slice(1) || '',
        createdAt: new Date().toISOString(),
      };

      addServer(newServer);
      setServerUrl('');
      setShowUrlModal(false);
    } catch (error) {
      alert('无效的 PostgreSQL URL 格式');
    }
  };

  const selectServer = (server: ServerConfig) => {
    const newConfig = {
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      database: server.database,
    };
    setConfig(newConfig);
    setOriginalConfig(newConfig);
    setSelectedServer(server.id);
    setIsDirty(false);
    setTestResult(null);
  };

  const saveCurrentServer = () => {
    if (!selectedServerId) return;

    updateServer(selectedServerId, config);
    setOriginalConfig(config);
    setIsDirty(false);
  };

  const clearSelection = () => {
    setSelectedServer(null);
    setOriginalConfig(null);
    setIsDirty(false);
    setTestResult(null);
    setTestSuccess(false);
    setConfig({
      host: 'localhost',
      port: 5432,
      username: '',
      password: '',
      database: '',
    });
  };

  const handleDeleteServer = (serverId: string) => {
    deleteServer(serverId);
    if (selectedServerId === serverId) {
      setSelectedServer(null);
    }
  };

  return (
    <div className="flex h-full w-full">
      <div className="w-64 border-r border-indigo-100 p-3 overflow-y-auto flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">服务器管理</h3>
          {onOpenSettings && (
            <Button size="xs" outline color="light" onClick={onOpenSettings} title="Settings">
              ⚙️
            </Button>
          )}
        </div>

        <div className="mb-3 flex flex-col gap-1">
          <Button className="w-full" onClick={() => setShowNewServerModal(true)}>
            + 新建服务器
          </Button>
          <Button color="light" className="w-full" onClick={() => setShowUrlModal(true)}>
            + 从 URL 添加
          </Button>
        </div>

        <div className="max-h-52 overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-500 mb-2">服务器列表</h4>
          {servers.length === 0 ? (
            <div className="text-sm text-gray-500">暂无服务器</div>
          ) : (
            <div className="flex flex-col gap-1">
              {servers.map(server => (
                <div
                  key={server.id}
                  className={`p-1.5 mb-1 rounded border shadow-sm cursor-pointer transition-all hover:bg-blue-50 ${selectedServerId === server.id ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-slate-200'}`}
                  onClick={() => selectServer(server)}
                >
                  <div className="flex justify-between items-center">
                    <div className="overflow-hidden">
                      <div className="flex h-6">
                        <span className="font-medium text-sm truncate">{server.name}</span>
                        {selectedServerId === server.id && isDirty && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {server.host}:{server.port}
                      </div>
                    </div>
                    <Button
                      color="failure"
                      size="xs"
                      className="ml-1 h-6 w-6 min-w-6 p-0 flex items-center justify-center"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleDeleteServer(server.id);
                      }}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-indigo-100">
          <div className="flex gap-2 w-full">
            <Button
              color="light"
              size="sm"
              onClick={clearSelection}
              disabled={!selectedServerId}
              className="flex justify-center items-center"
            >
              清除选择
            </Button>
            <Button
              color="blue"
              size="sm"
              onClick={saveCurrentServer}
              disabled={!selectedServerId || !isDirty}
              className="flex justify-center items-center"
            >
              保存更改 (⌘S)
            </Button>
          </div>
        </div>
      </div>

      {selectedServerId && (
        <div className="flex-1 p-6 pt-2 flex flex-col">
          <div className="max-w-3xl mx-auto flex flex-col w-full">
            <h2 className="text-2xl font-bold mb-4 flex items-center justify-between">
              PostgreSQL 数据库连接
              {isDirty && (
                <Badge color="warning" className="ml-2">
                  未保存
                </Badge>
              )}
            </h2>

            <div className="mb-4 flex items-center">
              <Label htmlFor="host" className="flex items-center w-24">
                主机地址 <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                id="host"
                name="host"
                value={config.host}
                onChange={handleInputChange}
                placeholder="localhost"
                required
                className="w-full"
              />
            </div>

            <div className="mb-4 flex items-center">
              <Label htmlFor="port" className="flex items-center w-24">
                端口
              </Label>
              <Input
                type="number"
                id="port"
                name="port"
                value={config.port}
                onChange={handleInputChange}
                placeholder="5432"
                min="1"
                max="65535"
                className="w-full"
              />
            </div>

            <div className="mb-4 flex items-center">
              <Label htmlFor="username" className="flex items-center w-24">
                用户名 <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                id="username"
                name="username"
                value={config.username}
                onChange={handleInputChange}
                placeholder="postgres"
                required
                className="w-full"
              />
            </div>

            <div className="mb-4 flex items-center">
              <Label htmlFor="password" className="flex items-center w-24">
                密码
              </Label>
              <Input
                type="password"
                id="password"
                name="password"
                value={config.password}
                onChange={handleInputChange}
                placeholder="请输入密码"
                className="w-full"
              />
            </div>

            <div className="mb-4 flex items-center">
              <Label htmlFor="database" className="flex items-center w-24">
                数据库名称
              </Label>
              <Input
                type="text"
                id="database"
                name="database"
                value={config.database}
                onChange={handleInputChange}
                placeholder="留空则使用默认数据库"
                className="w-full"
              />
            </div>

            <div className="flex space-x-2 mt-3">
              <Button
                color="light"
                onClick={testConnection}
                disabled={isTestingConnection || isConnecting}
                className="flex items-center"
              >
                {isTestingConnection ? '测试中...' : '测试连接'}
                {testSuccess && !isTestingConnection && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
              </Button>

              <Button
                color="blue"
                onClick={connectToDatabase}
                disabled={isTestingConnection || isConnecting}
              >
                {isConnecting ? '连接中...' : '连接'}
              </Button>
            </div>

            {testResult && !testResult.success && (
              <div className="mt-4 p-4 rounded-md bg-gradient-to-r from-red-50 to-red-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="mr-3 flex items-center justify-center text-red-700">✗</div>
                  <div className="flex-1 text-red-700">{testResult.message}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Server Modal */}
      <Modal show={showNewServerModal} onClose={() => setShowNewServerModal(false)}>
        <div className="p-4 border-b border-indigo-100 bg-gradient-to-r from-slate-50 to-blue-50">
          <h3 className="text-xl font-semibold">保存当前服务器配置</h3>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <div className="block mb-2">
              <Label htmlFor="serverName">服务器名称</Label>
            </div>
            <Input
              id="serverName"
              type="text"
              value={newServerName}
              onChange={e => setNewServerName(e.target.value)}
              placeholder="输入服务器名称"
            />
          </div>
        </div>
        <div className="p-4 border-t border-indigo-100 bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex gap-2 justify-end w-full">
            <Button color="light" onClick={() => setShowNewServerModal(false)}>
              取消
            </Button>
            <Button color="blue" onClick={addNewServer} disabled={!newServerName.trim()}>
              保存
            </Button>
          </div>
        </div>
      </Modal>

      {/* URL Modal */}
      <Modal show={showUrlModal} onClose={() => setShowUrlModal(false)}>
        <div className="p-4 border-b border-indigo-100 bg-gradient-to-r from-slate-50 to-blue-50">
          <h3 className="text-xl font-semibold">从 URL 添加服务器</h3>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <div className="block mb-2">
              <Label htmlFor="serverUrl">PostgreSQL URL</Label>
            </div>
            <Input
              id="serverUrl"
              type="text"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              placeholder="postgresql://username:password@host:port/database"
            />
          </div>
        </div>
        <div className="p-4 border-t border-indigo-100 bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex gap-2 justify-end w-full">
            <Button color="light" onClick={() => setShowUrlModal(false)}>
              取消
            </Button>
            <Button color="blue" onClick={addServerFromUrl} disabled={!serverUrl.trim()}>
              添加
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DatabaseConnection;
