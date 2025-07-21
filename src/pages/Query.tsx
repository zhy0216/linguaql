import React, { useState, useEffect } from 'react';
import { Button } from 'flowbite-react';
import dbService, { DatabaseTable, TableDataRequest, QueryResult } from '../services/DBService';

interface QuerySession {
  id: string;
  name: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total?: number;
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  column: string;
  value: string;
}

const Query: React.FC = () => {
  // State for managing query sessions
  const [querySessions, setQuerySessions] = useState<QuerySession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // State for database tables
  const [databaseTables, setDatabaseTables] = useState<DatabaseTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<DatabaseTable | null>(null);

  // State for table data pagination
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 100,
  });
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [isLoadingTableData, setIsLoadingTableData] = useState(false);

  // State for query input and results
  const [queryInput, setQueryInput] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // State for sorting and filtering
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterConfigs, setFilterConfigs] = useState<FilterConfig[]>([]);
  const [filteredAndSortedData, setFilteredAndSortedData] = useState<QueryResult | null>(null);

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
      // Use DBService to get database tables
      const tables = await dbService.getDatabaseTables();
      setDatabaseTables(tables);
    } catch (error) {
      console.error('Failed to fetch database tables:', error);
    }
  };

  // Load table data with pagination when a table is clicked
  const loadTableData = async (table: DatabaseTable, page: number = 1, pageSize: number = 100) => {
    if (!table) return;

    setSelectedTable(table);
    setIsLoadingTableData(true);
    setTableData(null); // Clear previous data

    try {
      // Create the request object
      const request: TableDataRequest = {
        schema: table.schema,
        name: table.name,
        page: page,
        pageSize: pageSize,
      };

      // Use DBService to get table data
      const result = await dbService.getTableData(request);

      // Extract column names from the first row
      const columns = result.length > 0 ? Object.keys(result[0]) : [];

      // Convert rows to array format expected by QueryResult
      const rows = result.map((row: any) => columns.map(col => row[col]));

      setTableData({
        columns,
        rows,
      });

      setPagination({
        page,
        pageSize,
        // We don't have total count in this implementation yet
      });
    } catch (error) {
      console.error('Failed to load table data:', error);
      setTableData(null);
    } finally {
      setIsLoadingTableData(false);
    }
  };

  // Execute query
  const executeQuery = async () => {
    if (!queryInput.trim()) return;

    setIsExecuting(true);
    setQueryResult(null);

    try {
      const result = await dbService.executeQuery(queryInput);

      setQueryResult({
        columns: result.columns,
        rows: result.rows,
      });

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
    // For now, just set executing to false
    // In a real implementation, we might need to implement query cancellation
    setIsExecuting(false);
  };

  // Select a query from history
  const selectHistoryQuery = (query: string) => {
    setQueryInput(query);
    setShowHistory(false);
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.column === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ column, direction });
  };

  // Apply filtering and sorting to data
  const applyFilterAndSort = (data: QueryResult) => {
    if (!data) return data;

    let processedData = { ...data };

    // Apply filtering - support multiple filters
    filterConfigs.forEach(filterConfig => {
      if (filterConfig.column && filterConfig.value) {
        const columnIndex = data.columns.indexOf(filterConfig.column);
        if (columnIndex !== -1) {
          processedData.rows = processedData.rows.filter(row => {
            const cellValue = row[columnIndex];
            return (
              cellValue !== null &&
              String(cellValue).toLowerCase().includes(filterConfig.value.toLowerCase())
            );
          });
        }
      }
    });

    // Apply sorting
    if (sortConfig) {
      const columnIndex = data.columns.indexOf(sortConfig.column);
      if (columnIndex !== -1) {
        processedData.rows = [...processedData.rows].sort((a, b) => {
          const aVal = a[columnIndex];
          const bVal = b[columnIndex];

          // Handle null values
          if (aVal === null && bVal === null) return 0;
          if (aVal === null) return sortConfig.direction === 'asc' ? -1 : 1;
          if (bVal === null) return sortConfig.direction === 'asc' ? 1 : -1;

          // Convert to strings for comparison
          const aStr = String(aVal);
          const bStr = String(bVal);

          // Try numeric comparison first
          const aNum = Number(aVal);
          const bNum = Number(bVal);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
          }

          // String comparison
          const comparison = aStr.localeCompare(bStr);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
      }
    }

    return processedData;
  };

  // Add a new filter
  const addFilter = () => {
    setFilterConfigs([...filterConfigs, { column: '', value: '' }]);
  };

  // Update a specific filter
  const updateFilter = (index: number, updates: Partial<FilterConfig>) => {
    const newFilters = [...filterConfigs];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilterConfigs(newFilters);
  };

  // Remove a specific filter
  const removeFilter = (index: number) => {
    setFilterConfigs(filterConfigs.filter((_, i) => i !== index));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilterConfigs([]);
  };

  // Update filtered and sorted data when tableData, sortConfig, or filterConfigs changes
  useEffect(() => {
    if (tableData) {
      const processed = applyFilterAndSort(tableData);
      setFilteredAndSortedData(processed);
    } else {
      setFilteredAndSortedData(null);
    }
  }, [tableData, sortConfig, filterConfigs]);

  return (
    <div className="flex h-screen w-full">
      {/* Left Sidebar - Fixed Width */}
      <div className="w-80 min-w-80 max-w-80 border-r border-gray-200 flex flex-col h-full bg-gray-50">
        {/* Query Sessions */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Query Sessions</h3>
            <Button size="xs" onClick={createNewSession}>
              New
            </Button>
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
                <div
                  key={index}
                  className={`p-1.5 text-xs hover:bg-gray-100 cursor-pointer rounded ${selectedTable && selectedTable.name === table.name && selectedTable.schema === table.schema ? 'bg-blue-100' : ''}`}
                  onClick={() => loadTableData(table)}
                >
                  <span className="text-gray-500">{table.schema}.</span>
                  <span>{table.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content Area - With Max Width */}
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
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
              <Button size="xs" color="failure" onClick={cancelQuery} disabled={!isExecuting}>
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

          {/* Filter Controls */}
          {(tableData || queryResult) && (
            <div className="p-2 border-b border-gray-200 bg-gray-100">
              <div className="flex gap-2 items-center mb-2">
                <span className="text-xs font-medium">Filters:</span>
                <Button size="xs" color="blue" onClick={addFilter}>
                  Add Filter
                </Button>
                {filterConfigs.length > 0 && (
                  <Button size="xs" color="gray" onClick={clearAllFilters}>
                    Clear All
                  </Button>
                )}
              </div>

              {filterConfigs.length === 0 ? (
                <div className="text-xs text-gray-500">No filters applied</div>
              ) : (
                <div className="space-y-2">
                  {filterConfigs.map((filter, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                        value={filter.column}
                        onChange={e => updateFilter(index, { column: e.target.value })}
                      >
                        <option value="">Select column</option>
                        {(filteredAndSortedData || tableData || queryResult)?.columns.map(
                          (column, colIndex) => (
                            <option key={colIndex} value={column}>
                              {column}
                            </option>
                          )
                        )}
                      </select>
                      <input
                        type="text"
                        placeholder="Filter value"
                        className="text-xs border border-gray-300 rounded px-2 py-1 flex-1 max-w-xs"
                        value={filter.value}
                        onChange={e => updateFilter(index, { value: e.target.value })}
                        disabled={!filter.column}
                      />
                      <Button size="xs" color="failure" onClick={() => removeFilter(index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Query Results */}
          <div className="flex-1 p-3 overflow-auto max-w-4xl">
            {/* Show table data when a table is selected */}
            {filteredAndSortedData && selectedTable ? (
              <div className="max-w-4xl">
                <h3 className="text-sm font-semibold mb-2">
                  {selectedTable.schema}.{selectedTable.name}
                  {isLoadingTableData && (
                    <span className="ml-2 text-xs text-gray-500">(Loading...)</span>
                  )}
                  {filterConfigs.length > 0 && filterConfigs.some(f => f.column && f.value) && (
                    <span className="ml-2 text-xs text-blue-600">
                      ({filterConfigs.filter(f => f.column && f.value).length} filter
                      {filterConfigs.filter(f => f.column && f.value).length > 1 ? 's' : ''}{' '}
                      applied)
                    </span>
                  )}
                </h3>

                {filteredAndSortedData.rows.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    {filterConfigs.some(f => f.column && f.value)
                      ? 'No data matches the filters'
                      : 'Table has no data'}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-gray-700">
                        <thead className="text-xs text-gray-700 bg-gray-50">
                          <tr>
                            {filteredAndSortedData.columns.map((column, index) => (
                              <th
                                key={index}
                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort(column)}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{column}</span>
                                  <span className="ml-1">
                                    {sortConfig?.column === column
                                      ? sortConfig.direction === 'asc'
                                        ? '↑'
                                        : '↓'
                                      : '↕'}
                                  </span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedData.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b hover:bg-gray-50">
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-4 py-2">
                                  {cell === null ? 'NULL' : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center mt-4 text-xs">
                      <div>
                        Showing {filteredAndSortedData.rows.length} rows
                        {filterConfigs.some(f => f.column && f.value) && tableData && (
                          <span className="ml-2 text-gray-500">
                            (filtered from {tableData.rows.length} total)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="xs"
                          disabled={pagination.page === 1 || isLoadingTableData}
                          onClick={() =>
                            loadTableData(selectedTable, pagination.page - 1, pagination.pageSize)
                          }
                        >
                          Previous
                        </Button>
                        <span>Page {pagination.page}</span>
                        <Button
                          size="xs"
                          disabled={
                            (tableData && tableData.rows.length < pagination.pageSize) ||
                            isLoadingTableData
                          }
                          onClick={() =>
                            loadTableData(selectedTable, pagination.page + 1, pagination.pageSize)
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : isExecuting ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center">
                  <div className="spinner mb-2"></div>
                  <div className="text-sm text-gray-500">Executing query...</div>
                </div>
              </div>
            ) : queryResult ? (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Query Results
                  {filterConfigs.length > 0 && filterConfigs.some(f => f.column && f.value) && (
                    <span className="ml-2 text-xs text-blue-600">
                      ({filterConfigs.filter(f => f.column && f.value).length} filter
                      {filterConfigs.filter(f => f.column && f.value).length > 1 ? 's' : ''}{' '}
                      applied)
                    </span>
                  )}
                  {sortConfig && (
                    <span className="ml-2 text-xs text-green-600">
                      (Sorted by {sortConfig.column} {sortConfig.direction})
                    </span>
                  )}
                </h3>
                {(() => {
                  const processedResult = applyFilterAndSort(queryResult);
                  return processedResult.rows.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      {filterConfigs.some(f => f.column && f.value)
                        ? 'No results match the filters'
                        : 'No results found'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-gray-700">
                        <thead className="text-xs text-gray-700 bg-gray-50">
                          <tr>
                            {processedResult.columns.map((column, index) => (
                              <th
                                key={index}
                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort(column)}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{column}</span>
                                  <span className="ml-1">
                                    {sortConfig?.column === column
                                      ? sortConfig.direction === 'asc'
                                        ? '↑'
                                        : '↓'
                                      : '↕'}
                                  </span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {processedResult.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b hover:bg-gray-50">
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-4 py-2">
                                  {cell === null ? 'NULL' : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 text-xs text-gray-500">
                        Showing {processedResult.rows.length} rows
                        {filterConfigs.some(f => f.column && f.value) && (
                          <span className="ml-2">
                            (filtered from {queryResult.rows.length} total)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Enter a query and click Run to see results, or click on a table to view its data
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Query;
