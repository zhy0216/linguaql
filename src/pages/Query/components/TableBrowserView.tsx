import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pagination } from 'flowbite-react';
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // Fixed page size, can be made configurable later

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredAndSortedData, tableData]);

  // Get available columns for filtering
  const getAvailableColumns = () => {
    const data = filteredAndSortedData || tableData;
    return data?.columns || [];
  };

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    const data = filteredAndSortedData || tableData;
    if (!data || !data.rows) return null;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRows = data.rows.slice(startIndex, endIndex);

    return {
      ...data,
      rows: paginatedRows,
    };
  }, [filteredAndSortedData, tableData, currentPage, pageSize]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    const data = filteredAndSortedData || tableData;
    if (!data || !data.rows) return 0;
    return Math.ceil(data.rows.length / pageSize);
  }, [filteredAndSortedData, tableData, pageSize]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
          {paginatedData && (
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
                data={paginatedData}
                sortConfig={sortConfig}
                filterConfigs={filterConfigs}
                onSort={onSort}
                showFilterInfo={true}
                originalRowCount={tableData?.rows.length}
                showingRowCount={false} // Disable default row count since we'll show pagination info
                maxHeight="calc(100vh - 220px)" // Reduced height to accommodate pagination
              />

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-gray-500">
                    {t('query.showingRowsRange', {
                      start: (currentPage - 1) * pageSize + 1,
                      end: Math.min(
                        currentPage * pageSize,
                        (filteredAndSortedData || tableData)?.rows.length || 0
                      ),
                      total: (filteredAndSortedData || tableData)?.rows.length || 0,
                    })}
                    {filterConfigs.some(f => f.column && f.value) && tableData && (
                      <span className="ml-2">
                        ({t('query.filteredFromTotal', { total: tableData.rows.length })})
                      </span>
                    )}
                  </div>
                  <Pagination
                    className="flex items-center -space-x-px text-sm"
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    showIcons
                  />
                </div>
              )}

              {/* Show pagination info even when there's only one page */}
              {totalPages <= 1 && (filteredAndSortedData || tableData) && (
                <div className="mt-4 text-xs text-gray-500">
                  Showing {(filteredAndSortedData || tableData)?.rows.length || 0} rows
                  {filterConfigs.some(f => f.column && f.value) && tableData && (
                    <span className="ml-2">
                      ({t('query.filteredFromTotal', { total: tableData.rows.length })})
                    </span>
                  )}
                </div>
              )}
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
