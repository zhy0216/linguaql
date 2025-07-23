import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react';
import { QueryResult } from '@/services/DBService';

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

interface ResultsTableProps {
  data: QueryResult;
  sortConfig: SortConfig | null;
  filterConfigs: FilterConfig[];
  onSort: (column: string) => void;
  showFilterInfo?: boolean;
  originalRowCount?: number;
  showingRowCount?: boolean;
  maxHeight?: string;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  data,
  sortConfig,
  filterConfigs,
  onSort,
  showFilterInfo = false,
  originalRowCount,
  showingRowCount,
  maxHeight,
}) => {
  const { t } = useTranslation();

  if (data.rows.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        {filterConfigs.some(f => f.column && f.value)
          ? showFilterInfo
            ? t('query.noDataMatchesFilters')
            : t('query.noResultsMatchFilters')
          : showFilterInfo
            ? t('query.tableHasNoData')
            : t('query.noResultsFound')}
      </div>
    );
  }

  return (
    <div>
      <div
        className="overflow-x-auto overflow-y-scroll"
        style={{ maxHeight: maxHeight || 'calc(100vh - 350px)' }}
      >
        <Table hoverable className="text-xs">
          <TableHead>
            <TableRow>
              {data.columns.map((column, index) => (
                <TableHeadCell
                  key={index}
                  className="cursor-pointer select-none bg-gray-50 text-xs"
                  onClick={() => onSort(column)}
                >
                  <div className="flex items-center justify-between">
                    <span>{column}</span>
                    <span className="ml-1">
                      {sortConfig?.column === column
                        ? sortConfig.direction === 'asc'
                          ? '↑'
                          : '↓'
                        : '↕'}
                    </span>
                  </div>
                </TableHeadCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody className="divide-y">
            {data.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} className="px-4 py-2 text-xs">
                    {cell === null ? t('common.null') : String(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {showingRowCount && (
        <div className="mt-4 text-xs text-gray-500">
          {t('query.showingRows', { count: data.rows.length })}
          {filterConfigs.some(f => f.column && f.value) && originalRowCount && (
            <span className="ml-2">
              ({t('query.filteredFromTotal', { total: originalRowCount })})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultsTable;
