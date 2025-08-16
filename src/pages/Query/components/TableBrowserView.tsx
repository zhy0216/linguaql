import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ResultsTable from './ResultsTable';
import FilterControls from './FilterControls';
import {
  DatabaseTable,
  PaginatedTableResult,
  PaginatedTableRequest,
  TableFilter,
  TableSort,
  dbService,
} from '@/services/DBService';
import { TableColumnInfo } from '../../../types/database';

// Re-export types for compatibility with existing filter controls
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

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface TableBrowserViewProps {
  selectedTable: DatabaseTable;
  currentTableColumnInfos?: TableColumnInfo[];
}

const TableBrowserView: React.FC<TableBrowserViewProps> = ({
  selectedTable,
  currentTableColumnInfos,
}) => {
  const { t } = useTranslation();

  // State for server-side pagination and filtering
  const [tableData, setTableData] = useState<PaginatedTableResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterConfigs, setFilterConfigs] = useState<FilterConfig[]>([]); // Draft filters (for UI)
  const [appliedFilterConfigs, setAppliedFilterConfigs] = useState<FilterConfig[]>([]); // Applied filters (for API)

  // Convert FilterConfig to TableFilter
  const convertFiltersToTableFilters = useCallback((filters: FilterConfig[]): TableFilter[] => {
    return filters
      .filter(f => f.column && f.value.trim())
      .map(f => ({
        column: f.column,
        operator: f.operator,
        value: f.value,
      }));
  }, []);

  // Convert SortConfig to TableSort
  const convertSortToTableSort = useCallback((sort: SortConfig | null): TableSort | undefined => {
    return sort
      ? {
          column: sort.column,
          direction: sort.direction,
        }
      : undefined;
  }, []);

  // Load table data with current filters, sorting, and pagination
  const loadTableData = useCallback(async () => {
    if (!selectedTable) return;

    setIsLoading(true);
    try {
      const request: PaginatedTableRequest = {
        schema: selectedTable.schema,
        tableName: selectedTable.name,
        page: currentPage,
        pageSize,
        filters: convertFiltersToTableFilters(appliedFilterConfigs),
        sort: convertSortToTableSort(sortConfig),
      };

      const result = await dbService.getPaginatedTableData(request);
      setTableData(result);
    } catch (error) {
      console.error('Failed to load table data:', error);
      setTableData(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedTable,
    currentPage,
    pageSize,
    appliedFilterConfigs,
    sortConfig,
    convertFiltersToTableFilters,
    convertSortToTableSort,
  ]);

  // Load data when dependencies change
  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  // Reset to first page when applied filters or sort change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [appliedFilterConfigs, sortConfig]);

  // Reset state when table changes
  useEffect(() => {
    setCurrentPage(1);
    setSortConfig(null);
    setFilterConfigs([]);
    setAppliedFilterConfigs([]);
    setTableData(null);
  }, [selectedTable]);

  // Filter management functions
  const handleAddFilter = useCallback(() => {
    const availableColumns = tableData?.columns || [];
    if (availableColumns.length > 0) {
      setFilterConfigs(prev => [
        ...prev,
        {
          column: availableColumns[0],
          operator: 'contains',
          value: '',
        },
      ]);
    }
  }, [tableData?.columns]);

  const handleUpdateFilter = useCallback((index: number, updates: Partial<FilterConfig>) => {
    setFilterConfigs(prev =>
      prev.map((filter, i) => (i === index ? { ...filter, ...updates } : filter))
    );
  }, []);

  const handleRemoveFilter = useCallback((index: number) => {
    setFilterConfigs(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilterConfigs([...filterConfigs]);
  }, [filterConfigs]);

  const handleClearAllFilters = useCallback(() => {
    setFilterConfigs([]);
    setAppliedFilterConfigs([]);
  }, []);

  // Sort handling
  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => {
      if (prev?.column === column) {
        return prev.direction === 'asc' ? { column, direction: 'desc' } : null; // Remove sort on third click
      }
      return { column, direction: 'asc' };
    });
  }, []);

  // Page change handling
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Get available columns for filtering
  const getAvailableColumns = () => {
    return tableData?.columns || [];
  };

  const noData = !tableData || tableData.rows.length === 0;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">{t('query.loadingTableData')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <FilterControls
        filterConfigs={filterConfigs}
        availableColumns={getAvailableColumns()}
        columnInfos={currentTableColumnInfos}
        onAddFilter={handleAddFilter}
        onUpdateFilter={handleUpdateFilter}
        onRemoveFilter={handleRemoveFilter}
        onApplyFilters={handleApplyFilters}
        onClearAllFilters={handleClearAllFilters}
      />

      {/* Status and Results */}
      {!noData && (
        <div className="space-y-2 pl-3">
          {/* Status Bar */}
          <h3 className="text-sm font-semibold mb-2">
            {selectedTable.schema}.{selectedTable.name}
            {appliedFilterConfigs.length > 0 &&
              appliedFilterConfigs.some(f => f.column && f.value) && (
                <span className="ml-2 text-xs text-blue-600">
                  ({appliedFilterConfigs.filter(f => f.column && f.value).length} filter
                  {appliedFilterConfigs.filter(f => f.column && f.value).length > 1 ? 's' : ''}{' '}
                  applied)
                </span>
              )}
          </h3>

          {/* Results Table */}
          <ResultsTable
            data={{
              columns: tableData.columns,
              rows: tableData.rows,
            }}
            sortConfig={sortConfig}
            filterConfigs={filterConfigs}
            onSort={handleSort}
            showFilterInfo={false}
            rowCount={tableData.totalCount}
            maxHeight="calc(100vh - 180px)"
          />

          {/* Pagination */}
          {tableData.totalPages > 1 && (
            <div className="absolute right-4 bottom-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  ←
                </Button>
                <span className="text-sm text-gray-600">
                  {currentPage} / {tableData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= tableData.totalPages}
                >
                  →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TableBrowserView;
