import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'flowbite-react';
import ResultsTable from './ResultsTable';
import FilterControls from './FilterControls';
import { QueryResult, DatabaseTable } from '../../services/DBService';

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  column: string;
  value: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total?: number;
}

interface QueryResultsProps {
  // Table data display
  selectedTable: DatabaseTable | null;
  tableData: QueryResult | null;
  filteredAndSortedData: QueryResult | null;
  isLoadingTableData: boolean;

  // Query results display
  queryResult: QueryResult | null;
  isExecuting: boolean;

  // Filtering and sorting
  sortConfig: SortConfig | null;
  filterConfigs: FilterConfig[];
  onSort: (column: string) => void;
  onAddFilter: () => void;
  onUpdateFilter: (index: number, updates: Partial<FilterConfig>) => void;
  onRemoveFilter: (index: number) => void;
  onClearAllFilters: () => void;
  applyFilterAndSort: (data: QueryResult) => QueryResult;

  // Pagination
  pagination: Pagination;
  onLoadTableData: (table: DatabaseTable | null, page?: number, pageSize?: number) => void;
}

const QueryResults: React.FC<QueryResultsProps> = ({
  selectedTable,
  tableData,
  filteredAndSortedData,
  isLoadingTableData,
  queryResult,
  isExecuting,
  sortConfig,
  filterConfigs,
  onSort,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearAllFilters,
  applyFilterAndSort,
  pagination,
  onLoadTableData,
}) => {
  const { t } = useTranslation();

  // Get available columns for filtering
  const getAvailableColumns = () => {
    const data = filteredAndSortedData || tableData || queryResult;
    return data?.columns || [];
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Filter Controls - only show when we have data to filter */}
        {(filteredAndSortedData || queryResult) && (
          <FilterControls
            filterConfigs={filterConfigs}
            availableColumns={getAvailableColumns()}
            onAddFilter={onAddFilter}
            onUpdateFilter={onUpdateFilter}
            onRemoveFilter={onRemoveFilter}
            onClearAllFilters={onClearAllFilters}
          />
        )}

        {/* Results Display */}
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
                    {filterConfigs.filter(f => f.column && f.value).length > 1 ? 's' : ''} applied)
                  </span>
                )}
              </h3>

              <ResultsTable
                data={filteredAndSortedData}
                sortConfig={sortConfig}
                filterConfigs={filterConfigs}
                onSort={onSort}
                showFilterInfo={true}
                originalRowCount={tableData?.rows.length}
              />

              {/* Pagination Controls */}
              {filteredAndSortedData.rows.length > 0 && (
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
                        onLoadTableData(selectedTable, pagination.page - 1, pagination.pageSize)
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
                        onLoadTableData(selectedTable, pagination.page + 1, pagination.pageSize)
                      }
                    >
                      {t('common.next')}
                    </Button>
                  </div>
                </div>
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
                    {filterConfigs.filter(f => f.column && f.value).length > 1 ? 's' : ''} applied)
                  </span>
                )}
                {sortConfig && (
                  <span className="ml-2 text-xs text-green-600">
                    ({t('query.sortedBy')} {sortConfig.column} {sortConfig.direction})
                  </span>
                )}
              </h3>
              <ResultsTable
                data={applyFilterAndSort(queryResult)}
                sortConfig={sortConfig}
                filterConfigs={filterConfigs}
                onSort={onSort}
                originalRowCount={queryResult.rows.length}
              />
            </div>
          ) : (
            <div className="text-sm text-gray-500">{t('query.enterQueryInstructions')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueryResults;
