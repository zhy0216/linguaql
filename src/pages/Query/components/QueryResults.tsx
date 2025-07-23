import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'flowbite-react';
import ResultsTable from './ResultsTable';
import FilterControls from './FilterControls';
import { QueryResult, DatabaseTable } from '@/services/DBService';
import { TableColumnInfo } from '../../../types/database';

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export type FilterOperator =
  | 'equals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'notEquals'
  | 'isEmpty'
  | 'isNotEmpty';

interface FilterConfig {
  column: string;
  operator: FilterOperator;
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
  currentTableColumnInfos?: TableColumnInfo[]; // 新增：当前表的列信息

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
      <div className="flex-1 flex flex-col ">
        {/* Filter Controls - only show when we have data to filter */}
        {/* {(filteredAndSortedData || queryResult) && (
          <FilterControls
            filterConfigs={filterConfigs}
            availableColumns={getAvailableColumns()}
            columnInfos={currentTableColumnInfos}
            onAddFilter={onAddFilter}
            onUpdateFilter={onUpdateFilter}
            onRemoveFilter={onRemoveFilter}
            onClearAllFilters={onClearAllFilters}
          />
        )} */}

        {/* Results Display */}
        <div className="flex-1 p-3 overflow-auto ">
          {/* Show table data when a table is selected */}
          {filteredAndSortedData && selectedTable ? (
            <div>
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
