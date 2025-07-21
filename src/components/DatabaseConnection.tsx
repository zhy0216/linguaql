import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from './ui/button';
import { Input } from './ui/input';
import './DatabaseConnection.css';

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
    <div className="database-connection">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>服务器管理</h3>
        </div>
        
        <div className="sidebar-actions">
          <Button 
            variant="outline"
            className="w-full mb-2"
            onClick={() => setShowNewServerModal(true)}
          >
            + 新建服务器
          </Button>
          <Button 
            variant="outline"
            className="w-full"
            onClick={() => setShowUrlModal(true)}
          >
            + 从 URL 添加
          </Button>
        </div>
        
        <div className="server-list">
          <h4>服务器列表</h4>
          {servers.length === 0 ? (
            <div className="empty-list">暂无服务器</div>
          ) : (
            servers.map(server => (
              <div 
                key={server.id} 
                className={`server-item ${selectedServerId === server.id ? 'selected' : ''}`}
                onClick={() => selectServer(server)}
              >
                <div className="server-info">
                  <div className="server-name">
                    {server.name}
                    {selectedServerId === server.id && isDirty && <span className="dirty-indicator"> *</span>}
                  </div>
                  <div className="server-details">{server.host}:{server.port}</div>
                </div>
                <Button 
                  variant="destructive"
                  size="sm"
                  className="ml-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteServer(server.id);
                  }}
                >
                  ×
                </Button>
              </div>
            ))
          )}
        </div>
        
        <div className="sidebar-footer">
          {selectedServerId && (
            <div className="selection-controls">
              <Button 
                variant="outline"
                size="sm"
                onClick={clearSelection}
              >
                清除选择
              </Button>
              {isDirty && (
                <Button 
                  variant="default"
                  size="sm"
                  onClick={saveCurrentServer}
                >
                  保存更改 (⌘S)
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {selectedServerId && (
        <div className="connection-form">
          <h2>
            PostgreSQL 数据库连接
            {isDirty && <span className="dirty-indicator"> *</span>}
          </h2>
        
        <div className="form-group">
          <label htmlFor="host">主机地址 *</label>
          <Input
            type="text"
            id="host"
            name="host"
            value={config.host}
            onChange={handleInputChange}
            placeholder="localhost"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="port">端口</label>
          <Input
            type="number"
            id="port"
            name="port"
            value={config.port}
            onChange={handleInputChange}
            placeholder="5432"
            min="1"
            max="65535"
          />
        </div>

        <div className="form-group">
          <label htmlFor="username">用户名 *</label>
          <Input
            type="text"
            id="username"
            name="username"
            value={config.username}
            onChange={handleInputChange}
            placeholder="postgres"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">密码</label>
          <Input
            type="password"
            id="password"
            name="password"
            value={config.password}
            onChange={handleInputChange}
            placeholder="请输入密码"
          />
        </div>

        <div className="form-group">
          <label htmlFor="database">数据库名</label>
          <Input
            type="text"
            id="database"
            name="database"
            value={config.database}
            onChange={handleInputChange}
            placeholder="留空则使用默认数据库"
          />
        </div>

        <div className="button-group flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={testConnection}
            disabled={isTestingConnection || isConnecting}
          >
            {isTestingConnection ? '测试中...' : '测试连接'}
          </Button>
          
          <Button
            type="button"
            variant="default"
            onClick={connectToDatabase}
            disabled={isTestingConnection || isConnecting}
          >
            {isConnecting ? '连接中...' : '连接'}
          </Button>
        </div>

        {testResult && (
          <div className={`result-message ${testResult.success ? 'success' : 'error'}`}>
            <div className="result-icon">
              {testResult.success ? '✅' : '❌'}
            </div>
            <div className="result-text">
              {testResult.message}
            </div>
          </div>
        )}
        </div>
      )}
      
      {/* New Server Modal */}
      {showNewServerModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>保存当前服务器配置</h3>
            <div className="form-group">
              <label>服务器名称</label>
              <Input
                type="text"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="输入服务器名称"
              />
            </div>
            <div className="modal-buttons flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewServerModal(false)}>取消</Button>
              <Button onClick={addNewServer} disabled={!newServerName.trim()}>保存</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* URL Modal */}
      {showUrlModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>从 URL 添加服务器</h3>
            <div className="form-group">
              <label>PostgreSQL URL</label>
              <Input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="postgresql://username:password@host:port/database"
              />
            </div>
            <div className="modal-buttons flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUrlModal(false)}>取消</Button>
              <Button onClick={addServerFromUrl} disabled={!serverUrl.trim()}>添加</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseConnection;
