import { useState, useEffect, useCallback } from 'react';
import { QueryResult } from '@/services/DBService';

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  column: string;
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
        if (filterConfig.column && filterConfig.value) {
          const columnIndex = data.columns.indexOf(filterConfig.column);
          if (columnIndex !== -1) {
            processedData.rows = processedData.rows.filter(row => {
              const cellValue = row[columnIndex];
              return (
                cellValue !== null &&
                String(cellValue).toLowerCase().includes(filterConfig.value.toLowerCase())
              );
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
    setFilterConfigs(prev => [...prev, { column: '', value: '' }]);
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
  const hasActiveFilters = filterConfigs.some(filter => filter.column && filter.value);
  const activeFilterCount = filterConfigs.filter(filter => filter.column && filter.value).length;

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
