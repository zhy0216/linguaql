import { useState, useEffect } from 'react';
import DatabaseConnection from './pages/DatabaseConnection/DatabaseConnection';
import Query from './pages/Query';

function App() {
  // 检查URL参数以确定初始页面
  const getInitialPage = (): 'connection' | 'query' => {
    // 当在Tauri环境中通过窗口打开时，检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');

    return pageParam === 'query' ? 'query' : 'connection';
  };

  const [currentPage, setCurrentPage] = useState<'connection' | 'query'>(getInitialPage());

  // 监听URL参数变化
  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentPage(getInitialPage());
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  return (
    <div className="App">
      {currentPage === 'connection' ? (
        <DatabaseConnection onDatabaseConnected={() => setCurrentPage('query')} />
      ) : (
        <Query />
      )}
    </div>
  );
}

export default App;
