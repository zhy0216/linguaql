import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Select } from 'flowbite-react';
import CodeMirror from '@uiw/react-codemirror';
import { StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import dbService, {
  DatabaseTable,
  TableDataRequest,
  QueryResult,
  DBService,
} from '../services/DBService';
import { aiService } from '../services/AIService';

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

interface QueryProps {}

// SQL Statement highlighting extension
const sqlStatementHighlight = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(_, tr) {
    if (!tr.selection || !tr.state.doc.length) {
      return Decoration.none;
    }

    let cursorPos = tr.selection.main.head;
    const doc = tr.state.doc;
    const text = doc.toString();

    // Special handling: if cursor is after semicolon and rest of line is empty
    if (cursorPos > 0 && text[cursorPos - 1] === ';') {
      const currentLine = doc.lineAt(cursorPos);
      const cursorPosInLine = cursorPos - currentLine.from;

      if (currentLine.text.slice(cursorPosInLine).trim() === '') {
        // Move cursor position back to highlight the previous statement
        cursorPos = cursorPos - 1;
      }
    }

    // Find the current SQL statement boundaries
    let statementStart = 0;
    let statementEnd = text.length;

    // Find the previous semicolon (statement start)
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (text[i] === ';') {
        statementStart = i + 1;
        break;
      }
    }

    // Find the next semicolon (statement end)
    for (let i = cursorPos; i < text.length; i++) {
      if (text[i] === ';') {
        statementEnd = i;
        break;
      }
    }

    // Skip whitespace at the beginning
    while (statementStart < statementEnd && /\s/.test(text[statementStart])) {
      statementStart++;
    }

    // Skip whitespace at the end
    while (statementEnd > statementStart && /\s/.test(text[statementEnd - 1])) {
      statementEnd--;
    }

    // Only highlight if there's actual content
    if (statementStart < statementEnd && text.slice(statementStart, statementEnd).trim()) {
      const decorations = [];

      // Get all lines that are part of this statement
      const startLine = doc.lineAt(statementStart);
      const endLine = doc.lineAt(statementEnd);

      // Add line decorations for each line in the statement
      for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
        const line = doc.line(lineNum);
        const decoration = Decoration.line({
          class: 'cm-sql-statement-highlight',
        }).range(line.from);
        decorations.push(decoration);
      }

      return Decoration.set(decorations);
    }

    return Decoration.none;
  },
  provide: f => EditorView.decorations.from(f),
});

const Query: React.FC<QueryProps> = () => {
  const { t } = useTranslation();
  // CodeMirror ref for dynamic query extraction
  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);

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

  // Modal state for SQL confirmation
  const [showSQLConfirmModal, setShowSQLConfirmModal] = useState(false);
  const [generatedSQL, setGeneratedSQL] = useState('');

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
      name: `${t('query.querySession')} ${querySessions.length + 1}`,
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

  // Get SQL statement boundaries for current cursor position
  const getCurrentSqlStatement = (text: string, cursorPos: number): string => {
    // Find the current SQL statement boundaries
    let statementStart = 0;
    let statementEnd = text.length;

    // Find the previous semicolon (statement start)
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (text[i] === ';') {
        statementStart = i + 1;
        break;
      }
    }

    // Find the next semicolon (statement end)
    for (let i = cursorPos; i < text.length; i++) {
      if (text[i] === ';') {
        statementEnd = i;
        break;
      }
    }

    // Extract and trim the statement
    return text.slice(statementStart, statementEnd).trim();
  };

  // Get SQL statement from current line (search forward then backward)
  const getCurrentLineStatement = (text: string, cursorPos: number): string => {
    const lines = text.split('\n');
    let currentPos = 0;
    let currentLineIndex = 0;

    // Find which line the cursor is on
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (currentPos + lineLength > cursorPos) {
        currentLineIndex = i;
        break;
      }
      currentPos += lineLength;
    }

    const currentLine = lines[currentLineIndex];
    if (!currentLine.trim()) {
      return ''; // Empty line
    }

    // Special handling: if cursor is after semicolon and rest of line is empty
    const cursorPosInLine = cursorPos - currentPos;
    if (
      cursorPosInLine > 0 &&
      currentLine[cursorPosInLine - 1] === ';' &&
      currentLine.slice(cursorPosInLine).trim() === ''
    ) {
      // Use the previous statement instead
      return getCurrentSqlStatement(text, cursorPos - 1);
    }

    // Start from current line and search forward for semicolon
    let statementEnd = text.length;
    let searchPos = currentPos; // Start of current line in full text

    for (let i = currentLineIndex; i < lines.length; i++) {
      const line = lines[i];
      const semicolonIndex = line.indexOf(';');

      if (semicolonIndex !== -1) {
        // Found semicolon, calculate position in full text
        statementEnd = searchPos + semicolonIndex;
        break;
      }

      searchPos += line.length + 1; // +1 for newline
    }

    // Search backward from current line for statement start
    let statementStart = 0;
    searchPos = currentPos; // Start of current line

    for (let i = currentLineIndex - 1; i >= 0; i--) {
      const line = lines[i];
      searchPos -= line.length + 1; // Move to start of previous line

      const semicolonIndex = line.lastIndexOf(';');
      if (semicolonIndex !== -1) {
        // Found semicolon, statement starts after it
        statementStart = searchPos + semicolonIndex + 1;
        break;
      }
    }

    // Extract and trim the statement
    return text.slice(statementStart, statementEnd).trim();
  };

  // Dynamic query extraction with priority
  const getQueryToExecute = (): string => {
    const editor = codeMirrorRef.current;
    if (!editor || !editor.view) {
      return queryInput; // Fallback to state
    }

    const view = editor.view;
    const doc = view.state.doc;
    const text = doc.toString();
    const selection = view.state.selection.main;

    // Priority 1: If there's a selection, use it
    if (!selection.empty) {
      const selectedText = text.slice(selection.from, selection.to).trim();
      if (selectedText) {
        return selectedText;
      }
    }

    // Priority 2: Get current SQL statement based on cursor position (full statement detection)
    const cursorPos = selection.head;
    const currentStatement = getCurrentSqlStatement(text, cursorPos);
    if (currentStatement) {
      return currentStatement;
    }

    // Priority 3: Get statement from current line (search forward then backward)
    const currentLineStatement = getCurrentLineStatement(text, cursorPos);
    if (currentLineStatement) {
      return currentLineStatement;
    }

    // Priority 4: Use entire content
    return text.trim();
  };

  // Execute query with SQL validation and AI generation
  const executeQuery = async () => {
    const queryToExecute = getQueryToExecute();

    if (!queryToExecute) return;

    setIsExecuting(true);
    setQueryResult(null);

    try {
      let finalSQL = queryToExecute;

      // Step 1: Check if the query is valid SQL
      if ((dbService.constructor as any).isValidSQL(queryToExecute)) {
        // Valid SQL - execute directly
        await executeValidatedSQL(finalSQL);
      } else {
        // Invalid SQL - use AI service to generate SQL
        try {
          if (!aiService.isConfigured()) {
            throw new Error('AI service is not configured. Please check your settings.');
          }

          // Get database schema for AI context
          const tableSchemas = await Promise.all(
            databaseTables.map(async table => {
              const columns = await dbService.getTableColumns(table.schema, table.name);
              // console.log("columns:", columns);
              return {
                name: table.name,
                columns: columns.map(col => ({
                  name: col.column_name,
                  type: col.data_type,
                  nullable: col.is_nullable === 'YES',
                  default: col.column_default,
                })),
              };
            })
          );

          console.log('tableSchemas:', tableSchemas);

          // Generate SQL using AI service
          const aiGeneratedSQL = await aiService.convertToSQL(queryToExecute, tableSchemas);

          // Step 2: Check if generated SQL is safe
          if (DBService.isSafeSQL(aiGeneratedSQL)) {
            // Safe SQL - execute directly
            finalSQL = aiGeneratedSQL;
            await executeValidatedSQL(finalSQL);
          } else {
            // Unsafe SQL - show confirmation modal
            setGeneratedSQL(aiGeneratedSQL);
            setShowSQLConfirmModal(true);
            setIsExecuting(false);
            return;
          }
        } catch (aiError: unknown) {
          console.error('Failed to generate SQL with AI:', aiError);
          setQueryResult({
            columns: ['AI Error'],
            rows: [[aiError instanceof Error ? aiError.message : String(aiError)]],
          });
          setIsExecuting(false);
          return;
        }
      }
    } catch (error: unknown) {
      console.error('Failed to execute query:', error);
      setQueryResult({
        columns: ['Error'],
        rows: [[error instanceof Error ? error.message : String(error)]],
      });
      setIsExecuting(false);
    }
  };

  // Helper function to execute validated SQL
  const executeValidatedSQL = async (sql: string) => {
    try {
      const result = await dbService.executeQuery(sql);

      setQueryResult({
        columns: result.columns,
        rows: result.rows,
      });

      // Add to history
      setQueryHistory(prev => [sql, ...prev].slice(0, 20)); // Keep last 20 queries
    } catch (error: unknown) {
      console.error('Failed to execute validated SQL:', error);
      setQueryResult({
        columns: ['Execution Error'],
        rows: [[error instanceof Error ? error.message : String(error)]],
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Execute confirmed SQL from modal
  const executeConfirmedSQL = async () => {
    setShowSQLConfirmModal(false);
    setIsExecuting(true);
    await executeValidatedSQL(generatedSQL);
  };

  // Cancel SQL execution from modal
  const cancelSQLExecution = () => {
    setShowSQLConfirmModal(false);
    setGeneratedSQL('');
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
            <h3 className="text-sm font-semibold">{t('query.sessions')}</h3>
            <div className="flex gap-1">
              <Button size="xs" onClick={createNewSession}>
                {t('query.newSession')}
              </Button>
            </div>
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
          <h3 className="text-sm font-semibold mb-2">{t('database.databaseTables')}</h3>
          {databaseTables.length === 0 ? (
            <div className="text-sm text-gray-500">{t('database.noTablesFound')}</div>
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
            <div className="border border-gray-300 rounded overflow-hidden">
              <CodeMirror
                ref={codeMirrorRef}
                value={queryInput}
                onChange={value => setQueryInput(value)}
                extensions={[sql(), sqlStatementHighlight]}
                placeholder={t('query.enterQuery')}
                theme="light"
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: false,
                  highlightSelectionMatches: false,
                  // highlightActiveLineGutter: true,
                  highlightActiveLine: false,
                }}
                style={{
                  minHeight: '200px',
                  fontSize: '14px',
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                }}
              />
            </div>
          </div>

          {/* Toolbar */}
          <div className="p-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Button size="xs" onClick={() => setShowHistory(!showHistory)}>
                  {t('query.history')}
                </Button>
              </div>
            </div>
            <div>
              <div className="relative">
                {showHistory && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white shadow-lg rounded-lg z-10 border border-gray-200">
                    <div className="p-1 max-h-60 overflow-y-auto">
                      {queryHistory.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">{t('query.noQueryHistory')}</div>
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
                {t('common.cancel')}
              </Button>
              <Button
                size="xs"
                color="success"
                onClick={executeQuery}
                disabled={isExecuting || !queryInput.trim()}
              >
                {t('query.execute')}
              </Button>
            </div>
          </div>

          {/* Filter Controls */}
          {(tableData || queryResult) && (
            <div className="p-2 border-b border-gray-200 bg-gray-100">
              <div className="flex gap-2 items-center mb-2">
                <span className="text-xs font-medium">{t('query.filters')}:</span>
                <Button size="xs" color="light" onClick={addFilter} outline>
                  {t('query.addFilter')}
                </Button>
                {filterConfigs.length > 0 && (
                  <Button size="xs" color="gray" onClick={clearAllFilters}>
                    {t('query.clearAll')}
                  </Button>
                )}
              </div>

              {filterConfigs.length === 0 ? (
                <div className="text-xs text-gray-500">{t('query.noFiltersApplied')}</div>
              ) : (
                <div className="space-y-2">
                  {filterConfigs.map((filter, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Select
                        sizing="sm"
                        value={filter.column}
                        onChange={e => updateFilter(index, { column: e.target.value })}
                      >
                        <option value="">{t('query.selectColumn')}</option>
                        {(filteredAndSortedData || tableData || queryResult)?.columns.map(
                          (column, colIndex) => (
                            <option key={colIndex} value={column}>
                              {column}
                            </option>
                          )
                        )}
                      </Select>
                      <input
                        type="text"
                        placeholder={t('query.filterValue')}
                        className="text-xs border border-gray-300 rounded px-2 py-1 flex-1 max-w-xs"
                        value={filter.value}
                        onChange={e => updateFilter(index, { value: e.target.value })}
                        disabled={!filter.column}
                      />
                      <Button size="xs" color="failure" onClick={() => removeFilter(index)}>
                        {t('common.remove')}
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
                    <span className="ml-2 text-xs text-gray-500">({t('common.loading')}...)</span>
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
                      ? t('query.noDataMatchesFilters')
                      : t('query.tableHasNoData')}
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
                                  {cell === null ? t('common.null') : String(cell)}
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
                        {t('query.showingRows', { count: filteredAndSortedData.rows.length })}
                        {filterConfigs.some(f => f.column && f.value) && tableData && (
                          <span className="ml-2 text-gray-500">
                            ({t('query.filteredFromTotal', { total: tableData.rows.length })})
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
                          {t('common.previous')}
                        </Button>
                        <span>
                          {t('common.page')} {pagination.page}
                        </span>
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
                          {t('common.next')}
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
                  <div className="text-sm text-gray-500">{t('query.executingQuery')}...</div>
                </div>
              </div>
            ) : queryResult ? (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {t('query.queryResults')}
                  {filterConfigs.length > 0 && filterConfigs.some(f => f.column && f.value) && (
                    <span className="ml-2 text-xs text-blue-600">
                      ({filterConfigs.filter(f => f.column && f.value).length} filter
                      {filterConfigs.filter(f => f.column && f.value).length > 1 ? 's' : ''}{' '}
                      applied)
                    </span>
                  )}
                  {sortConfig && (
                    <span className="ml-2 text-xs text-green-600">
                      ({t('query.sortedBy')} {sortConfig.column} {sortConfig.direction})
                    </span>
                  )}
                </h3>
                {(() => {
                  const processedResult = applyFilterAndSort(queryResult);
                  return processedResult.rows.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      {filterConfigs.some(f => f.column && f.value)
                        ? t('query.noResultsMatchFilters')
                        : t('query.noResultsFound')}
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
                                  {cell === null ? t('common.null') : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 text-xs text-gray-500">
                        {t('query.showingRows', { count: processedResult.rows.length })}
                        {filterConfigs.some(f => f.column && f.value) && (
                          <span className="ml-2">
                            ({t('query.filteredFromTotal', { total: queryResult.rows.length })})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-sm text-gray-500">{t('query.enterQueryInstructions')}</div>
            )}
          </div>
        </div>
      </div>

      {/* SQL Confirmation Modal */}
      {showSQLConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('query.confirmSQLExecution')}
              </h3>
              <button onClick={cancelSQLExecution} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">{t('query.aiGeneratedSQLWarning')}</p>

              <div className="bg-gray-50 border rounded-md p-3">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {generatedSQL}
                </pre>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button color="gray" onClick={cancelSQLExecution}>
                {t('common.cancel')}
              </Button>
              <Button color="failure" onClick={executeConfirmedSQL}>
                {t('query.executeAnyway')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Query;
