import React from 'react';
import { useTranslation } from 'react-i18next';
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

interface TableBrowserViewProps {
  // Table data display
  selectedTable: DatabaseTable;
  tableData: QueryResult | null;
  filteredAndSortedData: QueryResult | null;
  isLoadingTableData: boolean;
  currentTableColumnInfos?: TableColumnInfo[];

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

const TableBrowserView: React.FC<TableBrowserViewProps> = ({
  selectedTable,
  tableData,
  filteredAndSortedData,
  isLoadingTableData,
  currentTableColumnInfos,
  sortConfig,
  filterConfigs,
  onSort,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearAllFilters,
  // applyFilterAndSort, // Not used directly in this component
  // pagination, // Not used with current ResultsTable interface
  // onLoadTableData, // Not used with current ResultsTable interface
}) => {
  const { t } = useTranslation();

  // Get available columns for filtering
  const getAvailableColumns = () => {
    const data = filteredAndSortedData || tableData;
    return data?.columns || [];
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex flex-col">
        {/* Filter Controls - Always show in table browser mode */}
        {(filteredAndSortedData || tableData) && (
          <FilterControls
            filterConfigs={filterConfigs}
            availableColumns={getAvailableColumns()}
            columnInfos={currentTableColumnInfos}
            onAddFilter={onAddFilter}
            onUpdateFilter={onUpdateFilter}
            onRemoveFilter={onRemoveFilter}
            onClearAllFilters={onClearAllFilters}
          />
        )}

        {/* Table Display */}
        <div className="flex-1 p-3 overflow-auto">
          {filteredAndSortedData && (
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
                showingRowCount={true}
                maxHeight="calc(100vh - 160px)"
              />
            </div>
          )}

          {/* Loading State */}
          {isLoadingTableData && !filteredAndSortedData && (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">{t('common.loading')}...</div>
            </div>
          )}

          {/* No Data State */}
          {!isLoadingTableData && !filteredAndSortedData && (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">{t('query.noData')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableBrowserView;
