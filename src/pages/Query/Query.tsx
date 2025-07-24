import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import CodeMirror from '@uiw/react-codemirror';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import dbService, {
  DatabaseTable,
  TableDataRequest,
  QueryResult,
  DBService,
} from '../../services/DBService';
import { TableColumnInfo } from '../../types/database';
import { aiService } from '../../services/AIService';
import { useQuerySessionStore } from '../../stores/querySessionStore';
import { useServerConfigStore } from '../../stores/serverConfigStore';
import QuerySidebar from './components/QuerySidebar';
import TableBrowserView from './components/TableBrowserView';
import QueryResultsView from './components/QueryResultsView';
import QueryToolbar from './components/QueryToolbar';
import SQLConfirmationModal from './components/SQLConfirmationModal';
import {
  sqlStatementHighlight,
  getCurrentSqlStatement,
  getCurrentLineStatement,
} from './queryUtils';
import { useTableFiltering, useProcessedData } from './useTableFiltering';

interface QueryProps {}

const Query: React.FC<QueryProps> = () => {
  const { t } = useTranslation();
  // CodeMirror ref for dynamic query extraction
  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);

  // Get current server info
  const { selectedServerId } = useServerConfigStore();

  // Query session management
  const {
    getSessionsForServer,
    getActiveSessionForServer,
    createSession,
    updateSession,
    setActiveSession,
    deleteSession,
  } = useQuerySessionStore();

  // Get sessions for current server
  const querySessions = selectedServerId ? getSessionsForServer(selectedServerId) : [];
  const activeSession = selectedServerId ? getActiveSessionForServer(selectedServerId) : null;
  const activeSessionId = activeSession?.id || null;

  // State for database tables
  const [databaseTables, setDatabaseTables] = useState<DatabaseTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<DatabaseTable | null>(null);

  // Use table filtering hook
  const {
    sortConfig,
    filterConfigs,
    pagination,
    setPagination,
    handleSort,
    addFilter,
    updateFilter,
    removeFilter,
    clearAllFilters,
    applyFilterAndSort,
  } = useTableFiltering({ initialPageSize: 100 });

  // State for table data
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [currentTableColumnInfos, setCurrentTableColumnInfos] = useState<TableColumnInfo[]>([]);
  const [isLoadingTableData, setIsLoadingTableData] = useState(false);

  // State for query input and results
  const [queryInput, setQueryInput] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  // Use processed data hook for filtered and sorted data
  const filteredAndSortedData = useProcessedData(tableData, applyFilterAndSort);

  // Modal state for SQL confirmation
  const [showSQLConfirmModal, setShowSQLConfirmModal] = useState(false);
  const [generatedSQL, setGeneratedSQL] = useState('');

  // Initialize with a default session on component mount
  useEffect(() => {
    if (selectedServerId) {
      // Check if there are existing sessions for this server
      const existingSessions = getSessionsForServer(selectedServerId);
      if (existingSessions.length === 0) {
        // Create a default session for this server
        createNewSession();
      }
    }

    // Fetch database tables
    fetchDatabaseTables();
  }, [selectedServerId]);

  // Update query input and result when active session changes
  useEffect(() => {
    if (activeSession) {
      setQueryInput(activeSession.queryInput);
      setQueryResult(activeSession.queryResult);
      setQueryHistory(activeSession.queryHistory);
    } else {
      setQueryInput('');
      setQueryResult(null);
      setQueryHistory([]);
    }
  }, [activeSession]);

  // Create a new query session
  const createNewSession = () => {
    if (!selectedServerId) return;

    createSession(selectedServerId);
    setQueryInput('');
    setQueryResult(null);
  };

  // Handle session selection
  const handleSessionSelect = (sessionId: string) => {
    if (!selectedServerId) return;
    setActiveSession(selectedServerId, sessionId);
    // Clear selected table when selecting a session
    setSelectedTable(null);
    setTableData(null);
  };

  // Update session when query input changes
  const handleQueryInputChange = (value: string) => {
    setQueryInput(value);
    if (activeSessionId) {
      updateSession(activeSessionId, { queryInput: value });
    }
  };

  // Handle session deletion
  const handleDeleteSession = (sessionId: string) => {
    if (querySessions.length <= 1) return; // Don't delete the last session
    deleteSession(sessionId);
  };

  // Handle session rename
  const handleRenameSession = (sessionId: string, newName: string) => {
    updateSession(sessionId, { name: newName, lastModified: new Date().toISOString() });
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

    // Clear active session when selecting a table
    if (selectedServerId && activeSessionId) {
      setActiveSession(selectedServerId, null);
    }

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

      // Get table data and column information in parallel
      const [result, columnInfos] = await Promise.all([
        dbService.getTableData(request),
        dbService.getTableColumns(table.schema, table.name),
      ]);

      // Extract column names from the first row
      const columns = result.length > 0 ? Object.keys(result[0]) : [];

      // Convert rows to array format expected by QueryResult
      const rows = result.map((row: any) => columns.map(col => row[col]));

      // Store column information for filtering
      setCurrentTableColumnInfos(columnInfos);

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
      const queryResult = await dbService.executeQuery(sql);

      setQueryResult(queryResult);

      // Add to history
      const newHistory = [sql, ...queryHistory].slice(0, 20); // Keep last 20 queries
      setQueryHistory(newHistory);

      // Update session with result and history
      if (activeSessionId) {
        updateSession(activeSessionId, {
          queryResult,
          queryHistory: newHistory,
        });
      }
    } catch (error: unknown) {
      console.error('Failed to execute validated SQL:', error);
      const errorResult = {
        columns: ['Execution Error'],
        rows: [[error instanceof Error ? error.message : String(error)]],
      };

      setQueryResult(errorResult);

      // Update session with error result
      if (activeSessionId) {
        updateSession(activeSessionId, {
          queryResult: errorResult,
        });
      }
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
  };

  return (
    <div className="flex h-screen w-full">
      <QuerySidebar
        querySessions={querySessions}
        activeSessionId={activeSessionId}
        onSessionSelect={handleSessionSelect}
        onCreateNewSession={createNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        databaseTables={databaseTables}
        selectedTable={selectedTable}
        onTableSelect={loadTableData}
      />

      {/* Right Content Area - With Max Width */}
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-col  mx-auto w-full">
          {/* Query Session Mode - Show Query Editor and Toolbar */}
          {activeSessionId && !selectedTable && (
            <>
              {/* Query Input */}
              <div className="p-3 border-b border-gray-200">
                <div className="border border-gray-300 rounded overflow-hidden">
                  <CodeMirror
                    ref={codeMirrorRef}
                    value={queryInput}
                    onChange={handleQueryInputChange}
                    extensions={[sql(), sqlStatementHighlight, EditorView.lineWrapping]}
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
                      fontSize: '14px',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      // maxWidth: '800px',
                    }}
                  />
                </div>
              </div>

              {/* Toolbar */}
              <QueryToolbar
                queryHistory={queryHistory}
                selectHistoryQuery={selectHistoryQuery}
                cancelQuery={cancelQuery}
                executeQuery={executeQuery}
                isExecuting={isExecuting}
                queryInput={queryInput}
              />
            </>
          )}

          {/* Table Browser Mode - Show table data with filters */}
          {selectedTable && !activeSessionId && (
            <TableBrowserView
              selectedTable={selectedTable}
              tableData={tableData}
              filteredAndSortedData={filteredAndSortedData}
              isLoadingTableData={isLoadingTableData}
              currentTableColumnInfos={currentTableColumnInfos}
              sortConfig={sortConfig}
              filterConfigs={filterConfigs}
              onSort={handleSort}
              onAddFilter={addFilter}
              onUpdateFilter={updateFilter}
              onRemoveFilter={removeFilter}
              onClearAllFilters={clearAllFilters}
              applyFilterAndSort={applyFilterAndSort}
              pagination={pagination}
              onLoadTableData={(table: DatabaseTable | null, page?: number, pageSize?: number) =>
                table && loadTableData(table, page, pageSize)
              }
            />
          )}

          {/* Query Results Mode - Show query execution results */}
          {activeSessionId && !selectedTable && (
            <QueryResultsView queryResult={queryResult} isExecuting={isExecuting} />
          )}
        </div>
      </div>

      <SQLConfirmationModal
        isOpen={showSQLConfirmModal}
        generatedSQL={generatedSQL}
        onConfirm={executeConfirmedSQL}
        onCancel={cancelSQLExecution}
      />
    </div>
  );
};

export default Query;
