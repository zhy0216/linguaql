import React, { useState, useMemo } from 'react';
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

  // Pagination (if needed for large query results) - currently not used
  // pagination?: Pagination;
}

const QueryResultsView: React.FC<QueryResultsViewProps> = ({
  queryResult,
  isExecuting,
  // pagination, // Not used currently
}) => {
  const { t } = useTranslation();

  // Internal sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Handle sorting internally
  const handleSort = (column: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig?.column === column) {
        // Toggle direction if same column
        return {
          column,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc',
        };
      } else {
        // New column, default to ascending
        return {
          column,
          direction: 'asc',
        };
      }
    });
  };

  // Sort the query result data
  const sortedQueryResult = useMemo(() => {
    if (!queryResult || !sortConfig) {
      return queryResult;
    }

    const columnIndex = queryResult.columns.indexOf(sortConfig.column);
    if (columnIndex === -1) {
      return queryResult;
    }

    const sortedRows = [...queryResult.rows].sort((a, b) => {
      const aValue = a[columnIndex];
      const bValue = b[columnIndex];

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // Try to parse as numbers for numeric sorting
      const aNum = Number(aValue);
      const bNum = Number(bValue);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        // Numeric comparison
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      } else {
        // String comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (sortConfig.direction === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      }
    });

    return {
      ...queryResult,
      rows: sortedRows,
    };
  }, [queryResult, sortConfig]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex flex-col">
        {/* Query Results Display */}
        <div className="flex-1 p-3 overflow-auto">
          {/* Show query results */}
          {queryResult && (
            <div>
              <ResultsTable
                data={sortedQueryResult!}
                sortConfig={sortConfig}
                filterConfigs={[]}
                onSort={handleSort}
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
        </div>
      </div>
    </div>
  );
};

export default QueryResultsView;
