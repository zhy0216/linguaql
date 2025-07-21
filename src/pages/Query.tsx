import React, { useState, useEffect } from 'react';
import { Button } from 'flowbite-react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface QuerySession {
  id: string;
  name: string;
  createdAt: string;
}

interface DatabaseTable {
  name: string;
  schema: string;
}

interface QueryResult {
  columns: string[];
  rows: any[][];
}

const Query: React.FC = () => {
  // State for managing query sessions
  const [querySessions, setQuerySessions] = useState<QuerySession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // State for database tables
  const [databaseTables, setDatabaseTables] = useState<DatabaseTable[]>([]);
  
  // State for query input and results
  const [queryInput, setQueryInput] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Initialize with a default session on component mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('linguaql-query-sessions');
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions);
      setQuerySessions(sessions);
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      }
    } else {
      createNewSession();
    }
    
    // Fetch database tables
    fetchDatabaseTables();
  }, []);
  
  // Save sessions to localStorage when they change
  useEffect(() => {
    if (querySessions.length > 0) {
      localStorage.setItem('linguaql-query-sessions', JSON.stringify(querySessions));
    }
  }, [querySessions]);

  // Create a new query session
  const createNewSession = () => {
    const newSession: QuerySession = {
      id: Date.now().toString(),
      name: `Query ${querySessions.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    
    setQuerySessions([...querySessions, newSession]);
    setActiveSessionId(newSession.id);
    setQueryInput('');
    setQueryResult(null);
  };
  
  // Fetch database tables
  const fetchDatabaseTables = async () => {
    try {
      // Get the current window's label (ID)
      const currentWindow = getCurrentWindow();
      const windowId = currentWindow.label;
      
      // Pass the window ID to the backend command
      const tables = await invoke<DatabaseTable[]>('get_database_tables', { windowId: windowId });
      setDatabaseTables(tables);
    } catch (error) {
      console.error('Failed to fetch database tables:', error);
    }
  };
  
  // Execute query
  const executeQuery = async () => {
    if (!queryInput.trim()) return;
    
    setIsExecuting(true);
    setQueryResult(null);
    
    try {
      // Get the current window's label (ID)
      const currentWindow = getCurrentWindow();
      const windowId = currentWindow.label;
      
      const result = await invoke<string>('execute_query', { windowId: windowId, query: queryInput });
      
      // Parse the JSON string result
      const parsedResult = JSON.parse(result);
      const columns = parsedResult.length > 0 ? Object.keys(parsedResult[0]) : [];
      const rows = parsedResult.map((row: any) => columns.map(col => row[col]));
      
      setQueryResult({ columns, rows });
      
      // Add to history
      setQueryHistory(prev => [queryInput, ...prev].slice(0, 20)); // Keep last 20 queries
    } catch (error: unknown) {
      console.error('Failed to execute query:', error);
      setQueryResult({
        columns: ['Error'],
        rows: [[error instanceof Error ? error.message : String(error)]],
      });
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Cancel query execution
  const cancelQuery = async () => {
    try {
      await invoke('cancel_query');
      setIsExecuting(false);
    } catch (error) {
      console.error('Failed to cancel query:', error);
    }
  };
  
  // Select a query from history
  const selectHistoryQuery = (query: string) => {
    setQueryInput(query);
    setShowHistory(false);
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col h-full">
        {/* Query Sessions */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Query Sessions</h3>
            <Button size="xs" onClick={createNewSession}>New</Button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {querySessions.map(session => (
              <div
                key={session.id}
                className={`p-1.5 text-sm rounded cursor-pointer 
                  ${activeSessionId === session.id ? 'bg-blue-100 font-medium' : 'hover:bg-gray-100'}`}
                onClick={() => setActiveSessionId(session.id)}
              >
                {session.name}
              </div>
            ))}
          </div>
        </div>
        
        {/* Database Tables */}
        <div className="p-3 flex-grow overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2">Database Tables</h3>
          {databaseTables.length === 0 ? (
            <div className="text-sm text-gray-500">No tables found</div>
          ) : (
            <div className="space-y-1">
              {databaseTables.map((table, index) => (
                <div key={index} className="p-1.5 text-xs hover:bg-gray-100 cursor-pointer rounded">
                  <span className="text-gray-500">{table.schema}.</span>
                  <span>{table.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Right Content Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Query Input */}
        <div className="p-3 border-b border-gray-200">
          <textarea
            id="query-input"
            placeholder="Enter your SQL query here..."
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            className="w-full font-mono p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            rows={5}
          />
        </div>
        
        {/* Toolbar */}
        <div className="p-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <div className="relative">
              <Button size="xs" onClick={() => setShowHistory(!showHistory)}>
                History
              </Button>
              
              {showHistory && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white shadow-lg rounded-lg z-10 border border-gray-200">
                  <div className="p-1 max-h-60 overflow-y-auto">
                    {queryHistory.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No query history</div>
                    ) : (
                      queryHistory.map((query, idx) => (
                        <div 
                          key={idx} 
                          className="p-2 text-xs hover:bg-gray-100 cursor-pointer truncate"
                          onClick={() => selectHistoryQuery(query)}
                        >
                          {query}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="xs"
              color="failure"
              onClick={cancelQuery}
              disabled={!isExecuting}
            >
              Cancel
            </Button>
            <Button
              size="xs"
              color="success"
              onClick={executeQuery}
              disabled={isExecuting || !queryInput.trim()}
            >
              Execute
            </Button>
          </div>
        </div>
        
        {/* Results Table */}
        <div className="flex-grow p-3 overflow-auto">
          {isExecuting ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-500">Executing query...</div>
              </div>
            </div>
          ) : queryResult ? (
            <div className="overflow-x-auto relative">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    {queryResult.columns.map((col, idx) => (
                      <th key={idx} scope="col" className="py-3 px-6">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="bg-white border-b hover:bg-gray-50">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="py-4 px-6">
                          {cell === null ? <span className="text-gray-400">null</span> : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-500">No results to display</div>
                <p className="text-sm text-gray-400">Execute a query to see results</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Query;
