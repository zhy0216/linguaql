import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import DatabaseConnection from './pages/DatabaseConnection/DatabaseConnection';
import Query from './pages/Query';
import Settings from './pages/Settings';
import { useTheme } from './hooks/useTheme';
import './i18n';

function App() {
  // Initialize theme system
  useTheme();

  // 检查URL参数以确定初始页面
  const getInitialPage = (): 'connection' | 'query' | 'settings' => {
    // 当在Tauri环境中通过窗口打开时，检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');

    if (pageParam === 'query') return 'query';
    if (pageParam === 'settings') return 'settings';
    return 'connection';
  };

  const [currentPage, setCurrentPage] = useState<'connection' | 'query' | 'settings'>(
    getInitialPage()
  );

  // 监听URL参数变化
  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentPage(getInitialPage());
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // // 设置关闭到启动栏功能和dock图标点击处理
  // useEffect(() => {
  //   const setupWindowHandlers = async () => {
  //     const appWindow = getCurrentWindow();

  //     // 设置关闭请求处理器
  //     const unlistenClose = await appWindow.onCloseRequested((event) => {
  //       event.preventDefault();
  //       // 隐藏窗口而不是关闭应用
  //       appWindow.hide();
  //     });

  //     return unlistenClose
  //   };

  //   const unlistenPromise = setupWindowHandlers();

  //   return () => {
  //     if (unlistenPromise) {
  //       unlistenPromise.then(unlisten => unlisten());
  //     }
  //   };
  // }, []);

  return (
    <div className="App">
      {currentPage === 'connection' ? (
        <DatabaseConnection
          onDatabaseConnected={() => setCurrentPage('query')}
          onOpenSettings={() => setCurrentPage('settings')}
        />
      ) : currentPage === 'settings' ? (
        <Settings onBack={() => setCurrentPage('connection')} />
      ) : (
        <Query />
      )}
    </div>
  );
}

export default App;
