import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react';
import { QueryResult } from '@/services/DBService';
import TableCellContent from './TableCellContent';

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
  rowCount?: number;
  maxHeight?: string;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  data,
  sortConfig,
  filterConfigs,
  onSort,
  showFilterInfo = false,
  rowCount,
  maxHeight,
}) => {
  const { t } = useTranslation();

  if (data.error) {
    return <div className="text-sm text-red-600 font-medium">{data.error}</div>;
  }

  if (data.rows.length === 0) {
    // If there are no rows but rowsAffected is available, show that information
    if (data.rowsAffected !== undefined) {
      return (
        <div className="text-sm text-green-600 font-medium">
          {t('query.rowsAffected', { count: data.rowsAffected })}
        </div>
      );
    }

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
                    <TableCellContent
                      cellValue={cell}
                      columnName={data.columns[cellIndex]}
                      rowIndex={rowIndex}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {rowCount !== undefined && (
        <div className="mt-4 text-xs text-gray-500">
          {t('query.showingRows', { count: rowCount })}
        </div>
      )}
    </div>
  );
};

export default ResultsTable;
