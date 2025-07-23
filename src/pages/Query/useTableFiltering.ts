import { useState, useEffect, useCallback } from 'react';
import { QueryResult } from '@/services/DBService';

export interface SortConfig {
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

export interface FilterConfig {
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total?: number;
}

export interface UseTableFilteringProps {
  initialPageSize?: number;
}

export interface UseTableFilteringReturn {
  // State
  sortConfig: SortConfig | null;
  filterConfigs: FilterConfig[];
  pagination: Pagination;

  // Actions
  handleSort: (column: string) => void;
  addFilter: () => void;
  updateFilter: (index: number, updates: Partial<FilterConfig>) => void;
  removeFilter: (index: number) => void;
  clearAllFilters: () => void;
  setPagination: (pagination: Pagination) => void;
  applyFilterAndSort: (data: QueryResult) => QueryResult;

  // Computed values
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

// Helper function to apply filter operations
const applyFilterOperation = (
  cellValue: any,
  operator: FilterOperator,
  filterValue: string
): boolean => {
  if (operator === 'isEmpty') {
    return cellValue === null || cellValue === undefined || String(cellValue).trim() === '';
  }

  if (operator === 'isNotEmpty') {
    return cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '';
  }

  if (cellValue === null || cellValue === undefined) {
    return false;
  }

  const cellStr = String(cellValue);
  const filterStr = filterValue;

  switch (operator) {
    case 'equals':
      return cellStr.toLowerCase() === filterStr.toLowerCase();
    case 'contains':
      return cellStr.toLowerCase().includes(filterStr.toLowerCase());
    case 'startsWith':
      return cellStr.toLowerCase().startsWith(filterStr.toLowerCase());
    case 'endsWith':
      return cellStr.toLowerCase().endsWith(filterStr.toLowerCase());
    case 'notEquals':
      return cellStr.toLowerCase() !== filterStr.toLowerCase();
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      // Try numeric comparison first
      const cellNum = Number(cellValue);
      const filterNum = Number(filterValue);

      if (!isNaN(cellNum) && !isNaN(filterNum)) {
        switch (operator) {
          case 'gt':
            return cellNum > filterNum;
          case 'gte':
            return cellNum >= filterNum;
          case 'lt':
            return cellNum < filterNum;
          case 'lte':
            return cellNum <= filterNum;
        }
      }

      // Fallback to string comparison
      const comparison = cellStr.localeCompare(filterStr);
      switch (operator) {
        case 'gt':
          return comparison > 0;
        case 'gte':
          return comparison >= 0;
        case 'lt':
          return comparison < 0;
        case 'lte':
          return comparison <= 0;
      }
      return false;
    }
    default:
      return true;
  }
};

export const useTableFiltering = ({
  initialPageSize = 100,
}: UseTableFilteringProps = {}): UseTableFilteringReturn => {
  // State for sorting and filtering
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterConfigs, setFilterConfigs] = useState<FilterConfig[]>([]);

  // State for pagination
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: initialPageSize,
  });

  // Handle column sorting
  const handleSort = useCallback(
    (column: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.column === column && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ column, direction });
    },
    [sortConfig]
  );

  // Apply filtering and sorting to data
  const applyFilterAndSort = useCallback(
    (data: QueryResult): QueryResult => {
      if (!data) return data;

      let processedData = { ...data };

      // Apply filtering - support multiple filters
      filterConfigs.forEach(filterConfig => {
        if (
          filterConfig.column &&
          (filterConfig.value ||
            filterConfig.operator === 'isEmpty' ||
            filterConfig.operator === 'isNotEmpty')
        ) {
          const columnIndex = data.columns.indexOf(filterConfig.column);
          if (columnIndex !== -1) {
            processedData.rows = processedData.rows.filter(row => {
              const cellValue = row[columnIndex];
              return applyFilterOperation(cellValue, filterConfig.operator, filterConfig.value);
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
    },
    [filterConfigs, sortConfig]
  );

  // Add a new filter
  const addFilter = useCallback(() => {
    setFilterConfigs(prev => [...prev, { column: '', operator: 'contains', value: '' }]);
  }, []);

  // Update a specific filter
  const updateFilter = useCallback((index: number, updates: Partial<FilterConfig>) => {
    setFilterConfigs(prev => {
      const newFilters = [...prev];
      newFilters[index] = { ...newFilters[index], ...updates };
      return newFilters;
    });
  }, []);

  // Remove a specific filter
  const removeFilter = useCallback((index: number) => {
    setFilterConfigs(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilterConfigs([]);
    setSortConfig(null);
  }, []);

  // Computed values
  const hasActiveFilters = filterConfigs.some(
    filter =>
      filter.column &&
      (filter.value || filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty')
  );
  const activeFilterCount = filterConfigs.filter(
    filter =>
      filter.column &&
      (filter.value || filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty')
  ).length;

  return {
    // State
    sortConfig,
    filterConfigs,
    pagination,

    // Actions
    handleSort,
    addFilter,
    updateFilter,
    removeFilter,
    clearAllFilters,
    setPagination,
    applyFilterAndSort,

    // Computed values
    hasActiveFilters,
    activeFilterCount,
  };
};

// Hook for processing data with current filters and sorting
export const useProcessedData = (
  rawData: QueryResult | null,
  applyFilterAndSort: (data: QueryResult) => QueryResult
) => {
  const [processedData, setProcessedData] = useState<QueryResult | null>(null);

  useEffect(() => {
    if (rawData) {
      const processed = applyFilterAndSort(rawData);
      setProcessedData(processed);
    } else {
      setProcessedData(null);
    }
  }, [rawData, applyFilterAndSort]);

  return processedData;
};
