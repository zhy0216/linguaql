import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from 'lucide-react';
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

type TableRow = Record<string, any>;

interface ResultsTableProps {
  data: QueryResult;
  sortConfig: SortConfig | null;
  filterConfigs: FilterConfig[];
  onSort: (column: string) => void;
  showFilterInfo?: boolean;
  originalRowCount?: number;
  showPagination?: boolean;
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
  showPagination,
}) => {
  const { t } = useTranslation();

  // Convert QueryResult data to table format
  const tableData = useMemo<TableRow[]>(() => {
    if (!data.rows || data.rows.length === 0) return [];

    return data.rows.map((row, index) => {
      const rowObj: TableRow = { _rowIndex: index };
      data.columns.forEach((column, colIndex) => {
        rowObj[column] = row[colIndex];
      });
      return rowObj;
    });
  }, [data.rows, data.columns]);

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>(
    sortConfig ? [{ id: sortConfig.column, desc: sortConfig.direction === 'desc' }] : []
  );

  // Define columns for the data table
  const columns = useMemo<ColumnDef<TableRow>[]>(() => {
    if (!data.columns || data.columns.length === 0) return [];

    return data.columns.map(columnName => ({
      id: columnName,
      accessorKey: columnName,
      minSize: 80,
      maxSize: 150,
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 lg:px-3 text-xs font-medium"
            onClick={() => {
              column.toggleSorting(column.getIsSorted() === 'asc');
              onSort(columnName);
            }}
          >
            {columnName}
            {isSorted === 'desc' ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : isSorted === 'asc' ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-xs overflow-hidden text-ellipsis">
          <TableCellContent
            cellValue={row.getValue(columnName)}
            columnName={columnName}
            rowIndex={row.original._rowIndex}
          />
        </div>
      ),
      enableSorting: true,
    }));
  }, [data.columns, onSort]);

  // Initialize the react table
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnResizing: false,
    columnResizeMode: 'onChange',
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

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
    <div className="space-y-4">
      <div
        className="overflow-auto rounded-md border"
        style={{ maxHeight: maxHeight || 'calc(100vh - 350px)' }}
      >
        <Table className="text-xs">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="bg-gray-50 text-xs"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      className="px-4 py-2 text-xs"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                  {filterConfigs.some(f => f.column && f.value)
                    ? showFilterInfo
                      ? t('query.noDataMatchesFilters')
                      : t('query.noResultsMatchFilters')
                    : showFilterInfo
                      ? t('query.tableHasNoData')
                      : t('query.noResultsFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-xs text-gray-500">
          {rowCount !== undefined && t('query.showingRows', { count: rowCount })}
        </div>
        {table.getPageCount() > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs text-gray-600">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsTable;
