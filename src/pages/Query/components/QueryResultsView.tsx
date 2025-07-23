import React from 'react';
import { useTranslation } from 'react-i18next';
import ResultsTable from './ResultsTable';
import { QueryResult } from '@/services/DBService';

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

// Pagination interface - currently not used in this component
// interface Pagination {
//   page: number;
//   pageSize: number;
//   total?: number;
// }

interface QueryResultsViewProps {
  // Query results display
  queryResult: QueryResult | null;
  isExecuting: boolean;

  // Sorting (no filtering in query results mode)
  sortConfig: SortConfig | null;
  onSort: (column: string) => void;

  // Pagination (if needed for large query results) - currently not used
  // pagination?: Pagination;
}

const QueryResultsView: React.FC<QueryResultsViewProps> = ({
  queryResult,
  isExecuting,
  sortConfig,
  onSort,
  // pagination, // Not used currently
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex flex-col">
        {/* Query Results Display */}
        <div className="flex-1 p-3 overflow-auto">
          {/* Show query results */}
          {queryResult && (
            <div>
              <ResultsTable
                data={queryResult}
                sortConfig={sortConfig}
                filterConfigs={[]}
                onSort={onSort}
                showFilterInfo={false}
                showingRowCount={true}
              />
            </div>
          )}

          {/* Executing State */}
          {isExecuting && (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <div className="text-gray-500">{t('query.executing')}...</div>
              </div>
            </div>
          )}

          {/* No Results State */}
          {!isExecuting && !queryResult && (
            <div className="flex items-center justify-center h-32">
              <div className="text-center text-gray-500">
                <div className="text-lg mb-2">📝</div>
                <div>{t('query.noQueryExecuted')}</div>
                <div className="text-sm mt-1">{t('query.enterQueryToStart')}</div>
              </div>
            </div>
          )}

          {/* Empty Results State */}
          {!isExecuting && queryResult && queryResult.rows.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <div className="text-center text-gray-500">
                <div className="text-lg mb-2">📊</div>
                <div>{t('query.noResultsFound')}</div>
                <div className="text-sm mt-1">{t('query.queryReturnedNoRows')}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueryResultsView;
