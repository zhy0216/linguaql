import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'flowbite-react';
import CodeMirror from '@uiw/react-codemirror';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import dbService, {
  DatabaseTable,
  TableDataRequest,
  QueryResult,
  DBService,
} from '../services/DBService';
import { aiService } from '../services/AIService';
import QuerySidebar from '../components/query/QuerySidebar';
import QueryResults from '../components/query/QueryResults';
import SQLConfirmationModal from '../components/query/SQLConfirmationModal';
import {
  sqlStatementHighlight,
  getCurrentSqlStatement,
  getCurrentLineStatement,
} from '../utils/queryUtils';
import { useTableFiltering, useProcessedData } from '../hooks/useTableFiltering';

interface QuerySession {
  id: string;
  name: string;
  createdAt: string;
}

interface QueryProps {}

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
  const [isLoadingTableData, setIsLoadingTableData] = useState(false);

  // State for query input and results
  const [queryInput, setQueryInput] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Use processed data hook for filtered and sorted data
  const filteredAndSortedData = useProcessedData(tableData, applyFilterAndSort);

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

  return (
    <div className="flex h-screen w-full">
      <QuerySidebar
        querySessions={querySessions}
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
        onCreateNewSession={createNewSession}
        databaseTables={databaseTables}
        selectedTable={selectedTable}
        onTableSelect={loadTableData}
      />

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

          <QueryResults
            selectedTable={selectedTable}
            tableData={tableData}
            filteredAndSortedData={filteredAndSortedData}
            isLoadingTableData={isLoadingTableData}
            queryResult={queryResult}
            isExecuting={isExecuting}
            sortConfig={sortConfig}
            filterConfigs={filterConfigs}
            onSort={handleSort}
            onAddFilter={addFilter}
            onUpdateFilter={updateFilter}
            onRemoveFilter={removeFilter}
            onClearAllFilters={clearAllFilters}
            applyFilterAndSort={applyFilterAndSort}
            pagination={pagination}
            onLoadTableData={(table, page, pageSize) =>
              table && loadTableData(table, page, pageSize)
            }
          />
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
