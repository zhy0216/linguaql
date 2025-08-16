import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useServerConfigStore } from '../../stores/serverConfigStore';
import { DatabaseConfig, ConnectionResult, ServerConfig } from '../../types/database';
import dbService from '../../services/DBService';

interface Props {
  onDatabaseConnected: () => void;
  onOpenSettings: () => void;
}

const DatabaseConnection: React.FC<Props> = ({ onDatabaseConnected, onOpenSettings }) => {
  const { t } = useTranslation();
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

  const currentServer = servers.find(s => s.id === selectedServerId);
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
        message: t('database.fillRequiredFields'),
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
        message: t('database.connectionTestError', { error }),
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
        message: t('database.fillRequiredFields'),
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
        message: t('database.connectionError', { error }),
      });
    } finally {
      setIsConnecting(false);
    }
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
        throw new Error(t('database.invalidPostgreSQLUrl'));
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
      alert(t('database.invalidPostgreSQLUrl'));
    }
  };

  const selectServer = (server: ServerConfig) => {
    setSelectedServer(server.id);
    setConfig({
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      database: server.database,
    });
    setOriginalConfig({
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      database: server.database,
    });
    setIsDirty(false);
    setTestResult(null);
    setTestSuccess(false);
  };

  // Handle double click to connect and open query page
  const handleServerDoubleClick = async (server: ServerConfig) => {
    // First select the server
    selectServer(server);

    // Then connect to the database
    const newConfig = {
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      database: server.database,
    };

    setIsConnecting(true);
    try {
      const result = await dbService.testDatabaseConnection(newConfig);
      if (result.success) {
        // Connection successful, navigate to query page
        await getCurrentWindow().setSize(new LogicalSize(1200, 600));
        onDatabaseConnected();
      } else {
        // Show connection error
        setTestResult(result);
        setTestSuccess(false);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      setTestSuccess(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const saveCurrentServer = () => {
    if (!selectedServerId) return;

    if (!currentServer) return;

    updateServer(selectedServerId, { ...currentServer, ...config });
    setOriginalConfig(config);
    setIsDirty(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentServer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveCurrentServer]);

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
          <h3 className="text-lg font-semibold">{t('database.serverManagement')}</h3>
          {onOpenSettings && (
            <Button size="sm" variant="outline" onClick={onOpenSettings} title="Settings">
              ⚙️
            </Button>
          )}
        </div>

        <div className="mb-3 flex flex-col gap-1">
          <Button className="w-full" onClick={() => setShowNewServerModal(true)}>
            + {t('database.addServer')}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setShowUrlModal(true)}>
            + {t('database.addFromUrl')}
          </Button>
        </div>

        <div className="max-h-52 overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-500 mb-2">{t('database.serverList')}</h4>
          {servers.length === 0 ? (
            <div className="text-sm text-gray-500">{t('database.noServersConfigured')}</div>
          ) : (
            <div className="flex flex-col gap-1">
              {servers.map(server => (
                <div
                  key={server.id}
                  className={`p-1.5 mb-1 rounded border shadow-sm cursor-pointer transition-all hover:bg-blue-50 ${selectedServerId === server.id ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-slate-200'}`}
                  onClick={() => selectServer(server)}
                  onDoubleClick={() => handleServerDoubleClick(server)}
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
                      variant="ghost"
                      size="sm"
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
          <div className="flex flex-col gap-2 w-full">
            <Button
              color="light"
              size="sm"
              onClick={clearSelection}
              disabled={!selectedServerId}
              className="flex justify-center items-center"
            >
              {t('database.clearSelection')}
            </Button>
            <Button
              color="blue"
              size="sm"
              onClick={saveCurrentServer}
              disabled={!selectedServerId || !isDirty}
              className="flex justify-center items-center"
            >
              {t('database.saveChanges')} (⌘S)
            </Button>
          </div>
        </div>
      </div>

      {selectedServerId && (
        <div className="flex-1 p-6 pt-2 flex flex-col">
          <div className="max-w-3xl mx-auto flex flex-col w-full">
            <h2 className="text-2xl font-bold mb-4 flex items-center justify-between">
              {t('database.postgresqlConnection')}
              {isDirty && (
                <Badge color="warning" className="ml-2">
                  {t('database.unsaved')}
                </Badge>
              )}
            </h2>

            <div className="mb-4 flex items-center">
              <Label htmlFor="serverName" className="flex items-center w-40">
                {t('database.serverName')}
              </Label>
              <Input
                type="text"
                id="serverName"
                name="serverName"
                value={currentServer?.name || ''}
                onChange={e => {
                  if (currentServer) {
                    updateServer(selectedServerId, { ...currentServer, name: e.target.value });
                    setIsDirty(true);
                  }
                }}
                placeholder={t('database.enterServerName')}
                className="w-full"
                disabled={!selectedServerId}
              />
            </div>

            <div className="mb-4 flex items-center">
              <Label htmlFor="host" className="flex items-center w-40">
                {t('database.hostAddress')} <span className="text-red-500">*</span>
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
              <Label htmlFor="port" className="flex items-center w-40">
                {t('database.port')}
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
              <Label htmlFor="username" className="flex items-center w-40">
                {t('database.username')} <span className="text-red-500">*</span>
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
              <Label htmlFor="password" className="flex items-center w-40">
                {t('database.password')}
              </Label>
              <Input
                type="password"
                id="password"
                name="password"
                value={config.password}
                onChange={handleInputChange}
                placeholder={t('database.passwordPlaceholder')}
                className="w-full"
              />
            </div>

            <div className="mb-4 flex items-center">
              <Label htmlFor="database" className="flex items-center w-40">
                {t('database.database')}
              </Label>
              <Input
                type="text"
                id="database"
                name="database"
                value={config.database}
                onChange={handleInputChange}
                placeholder={t('database.databasePlaceholder')}
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
                {isTestingConnection ? t('database.testing') : t('database.testConnection')}
                {testSuccess && !isTestingConnection && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
              </Button>

              <Button
                color="blue"
                onClick={connectToDatabase}
                disabled={isTestingConnection || isConnecting}
              >
                {isConnecting ? t('database.connecting') : t('database.connect')}
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
      <Dialog open={showNewServerModal} onOpenChange={setShowNewServerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('database.saveCurrentServerConfig')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="serverName">{t('database.serverName')}</Label>
              <Input
                id="serverName"
                type="text"
                value={newServerName}
                onChange={e => setNewServerName(e.target.value)}
                placeholder={t('database.enterServerName')}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowNewServerModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={addNewServer} disabled={!newServerName.trim()}>
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* URL Modal */}
      <Dialog open={showUrlModal} onOpenChange={setShowUrlModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('database.addFromPostgreSQLUrl')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="postgresUrl">{t('database.postgreSQLUrl')}</Label>
              <Input
                id="postgresUrl"
                type="text"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="postgresql://username:password@host:port/database"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowUrlModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={addServerFromUrl} disabled={!serverUrl.trim()}>
              {t('common.add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabaseConnection;
