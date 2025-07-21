import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button, TextInput as Input, Label, Badge, Modal } from 'flowbite-react';

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

interface ConnectionResult {
  success: boolean;
  message: string;
}

interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  createdAt: string;
}

const DatabaseConnection: React.FC = () => {
  const [config, setConfig] = useState<DatabaseConfig>({
    host: 'localhost',
    port: 5432,
    username: '',
    password: '',
    database: ''
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionResult | null>(null);
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [showNewServerModal, setShowNewServerModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<DatabaseConfig | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newConfig = {
      ...config,
      [name]: name === 'port' ? parseInt(value) || 5432 : value
    };
    setConfig(newConfig);
    
    // Check if config has changed from original
    if (selectedServerId && originalConfig) {
      const hasChanged = Object.keys(newConfig).some(key => 
        newConfig[key as keyof DatabaseConfig] !== originalConfig[key as keyof DatabaseConfig]
      );
      setIsDirty(hasChanged);
    }
  };

  const testConnection = async () => {
    if (!config.host || !config.username) {
      setTestResult({
        success: false,
        message: '请填写所有必需的字段（主机、用户名）'
      });
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const result = await invoke<ConnectionResult>('test_database_connection', { config });
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `测试连接时发生错误: ${error}`
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const connectToDatabase = async () => {
    if (!config.host || !config.username) {
      setTestResult({
        success: false,
        message: '请填写所有必需的字段（主机、用户名）'
      });
      return;
    }

    setIsConnecting(true);
    setTestResult(null);

    try {
      const result = await invoke<ConnectionResult>('connect_to_database', { config });
      setTestResult(result);
      
      if (result.success) {
        // Connection successful, new window should open automatically
        console.log('数据库连接成功，新窗口已打开');
        // Auto-save on successful connection
        if (selectedServerId && isDirty) {
          saveCurrentServer();
        }
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `连接数据库时发生错误: ${error}`
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Load servers from localStorage
  useEffect(() => {
    const savedServers = localStorage.getItem('linguaql-servers');
    if (savedServers) {
      setServers(JSON.parse(savedServers));
    }
  }, []);

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

  // Save servers to localStorage
  const saveServers = (newServers: ServerConfig[]) => {
    setServers(newServers);
    localStorage.setItem('linguaql-servers', JSON.stringify(newServers));
  };

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
      createdAt: new Date().toISOString()
    };
    
    const updatedServers = [...servers, newServer];
    saveServers(updatedServers);
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
        createdAt: new Date().toISOString()
      };
      
      const updatedServers = [...servers, newServer];
      saveServers(updatedServers);
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
      database: server.database
    };
    setConfig(newConfig);
    setOriginalConfig(newConfig);
    setSelectedServerId(server.id);
    setIsDirty(false);
    setTestResult(null);
  };

  const saveCurrentServer = () => {
    if (!selectedServerId) return;
    
    const updatedServers = servers.map(server => 
      server.id === selectedServerId 
        ? { ...server, ...config }
        : server
    );
    saveServers(updatedServers);
    setOriginalConfig(config);
    setIsDirty(false);
  };

  const clearSelection = () => {
    setSelectedServerId(null);
    setOriginalConfig(null);
    setIsDirty(false);
    setTestResult(null);
    setConfig({
      host: 'localhost',
      port: 5432,
      username: '',
      password: '',
      database: ''
    });
  };

  const deleteServer = (serverId: string) => {
    const updatedServers = servers.filter(s => s.id !== serverId);
    saveServers(updatedServers);
    if (selectedServerId === serverId) {
      setSelectedServerId(null);
    }
  };

  return (
    <div className="flex h-full w-full">
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-3 overflow-y-auto flex flex-col">
              <div className="mb-4 flex items-center">
                <h3 className="text-lg font-semibold">服务器管理</h3>
              </div>
              
              <div className="mb-4 flex flex-col gap-2">
                <Button 
                  className="w-full"
                  onClick={() => setShowNewServerModal(true)}
                >
                  + 新建服务器
                </Button>
                <Button 
                  color="light"
                  className="w-full"
                  onClick={() => setShowUrlModal(true)}
                >
                  + 从 URL 添加
                </Button>
              </div>
        
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">服务器列表</h4>
                {servers.length === 0 ? (
                  <div className="text-sm text-gray-500">暂无服务器</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {servers.map(server => (
                      <div 
                        key={server.id} 
                        className={`p-3 mb-2 rounded-md border cursor-pointer hover:bg-gray-100 ${selectedServerId === server.id ? 'border-blue-500 bg-blue-50' : ''}`}
                        onClick={() => selectServer(server)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">
                              {server.name}
                              {selectedServerId === server.id && isDirty && <Badge color="warning" className="ml-2">*</Badge>}
                            </div>
                            <div className="text-xs text-gray-500">{server.host}:{server.port}</div>
                          </div>
                          <Button 
                            color="failure"
                            size="xs"
                            className="ml-2"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              deleteServer(server.id);
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
        
              <div className="mt-4 pt-4 border-t">
                {selectedServerId && (
                  <div className="flex flex-col gap-2 w-full">
                  <Button 
                    color="light"
                    size="sm"
                    onClick={clearSelection}
                    className="flex justify-center items-center"
                  >
                    清除选择
                  </Button>
                  {isDirty && (
                    <Button 
                      color="blue"
                      size="sm"
                      onClick={saveCurrentServer}
                      className="flex justify-center items-center"
                    >
                      保存更改 (⌘S)
                    </Button>
                  )}
                </div>
                )}
              </div>
      </div>
      
      {selectedServerId && (
        <div className="flex-1 p-6 flex flex-col">
          <div className="max-w-3xl mx-auto flex flex-col w-full">
            <h2 className="text-2xl font-bold mb-6 flex items-center justify-between">
              PostgreSQL 数据库连接
              {isDirty && <Badge color="warning" className="ml-2">未保存</Badge>}
            </h2>
          
            <div className="mb-4 flex flex-col">
              <div className="flex mb-2">
                <Label htmlFor="host" className="flex items-center">主机地址 *</Label>
              </div>
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
  
            <div className="mb-4 flex flex-col">
              <div className="flex mb-2">
                <Label htmlFor="port" className="flex items-center">端口</Label>
              </div>
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
  
            <div className="mb-4 flex flex-col">
              <div className="flex mb-2">
                <Label htmlFor="username" className="flex items-center">用户名 *</Label>
              </div>
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
  
            <div className="mb-4 flex flex-col">
              <div className="flex mb-2">
                <Label htmlFor="password" className="flex items-center">密码</Label>
              </div>
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
  
            <div className="mb-4">
              <div className="block mb-2">
                <Label htmlFor="database">数据库名称</Label>
              </div>
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

            <div className="flex space-x-2 mt-6">
              <Button
                color="light"
                onClick={testConnection}
                disabled={isTestingConnection || isConnecting}
              >
                {isTestingConnection ? '测试中...' : '测试连接'}
              </Button>
              
              <Button
                color="blue"
                onClick={connectToDatabase}
                disabled={isTestingConnection || isConnecting}
              >
                {isConnecting ? '连接中...' : '连接'}
              </Button>
            </div>
  
            {testResult && (
              <div className={`mt-4 p-4 rounded-md ${testResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="flex items-center justify-between">
                  <div className={`mr-3 flex items-center justify-center ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.success ? '✓' : '✗'}
                  </div>
                  <div className={`flex-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* New Server Modal */}
            <Modal show={showNewServerModal} onClose={() => setShowNewServerModal(false)}>
        <div className="p-4 border-b">
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
              onChange={(e) => setNewServerName(e.target.value)}
              placeholder="输入服务器名称"
            />
          </div>
        </div>
        <div className="p-4 border-t">
          <div className="flex gap-2 justify-end w-full">
            <Button color="light" onClick={() => setShowNewServerModal(false)}>取消</Button>
            <Button color="blue" onClick={addNewServer} disabled={!newServerName.trim()}>保存</Button>
          </div>
        </div>
      </Modal>
      
      {/* URL Modal */}
            <Modal show={showUrlModal} onClose={() => setShowUrlModal(false)}>
        <div className="p-4 border-b">
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
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="postgresql://username:password@host:port/database"
            />
          </div>
        </div>
        <div className="p-4 border-t">
          <div className="flex gap-2 justify-end w-full">
            <Button color="light" onClick={() => setShowUrlModal(false)}>取消</Button>
            <Button color="blue" onClick={addServerFromUrl} disabled={!serverUrl.trim()}>添加</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DatabaseConnection;
