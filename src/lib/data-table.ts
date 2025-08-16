import type { Column } from '@tanstack/react-table';
// import { dataTableConfig } from '@/components/data-table/data-table';
// import type {
//   ExtendedColumnFilter,
//   FilterOperator,
//   FilterVariant,
// } from '@/components/data-table/data-table';

// Define types locally since they're not exported from data-table
type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'iLike'
  | 'isEmpty'
  | 'isNotEmpty';
type FilterVariant =
  | 'text'
  | 'number'
  | 'range'
  | 'date'
  | 'dateRange'
  | 'boolean'
  | 'select'
  | 'multiSelect';

interface ExtendedColumnFilter {
  id: string;
  operator: FilterOperator;
  value: any;
}

// Mock dataTableConfig since it's not available
const dataTableConfig = {
  textOperators: [{ label: 'Contains', value: 'iLike' as FilterOperator }],
  numericOperators: [{ label: 'Equals', value: 'eq' as FilterOperator }],
  dateOperators: [{ label: 'Equals', value: 'eq' as FilterOperator }],
  booleanOperators: [{ label: 'Equals', value: 'eq' as FilterOperator }],
  selectOperators: [{ label: 'Equals', value: 'eq' as FilterOperator }],
  multiSelectOperators: [{ label: 'Equals', value: 'eq' as FilterOperator }],
};

export function getCommonPinningStyles<TData>({
  column,
  withBorder = false,
}: {
  column: Column<TData>;
  withBorder?: boolean;
}): React.CSSProperties {
  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn = isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinnedColumn = isPinned === 'right' && column.getIsFirstColumn('right');

  return {
    boxShadow: withBorder
      ? isLastLeftPinnedColumn
        ? '-4px 0 4px -4px hsl(var(--border)) inset'
        : isFirstRightPinnedColumn
          ? '4px 0 4px -4px hsl(var(--border)) inset'
          : undefined
      : undefined,
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    opacity: isPinned ? 0.97 : 1,
    position: isPinned ? 'sticky' : 'relative',
    background: isPinned ? 'hsl(var(--background))' : 'hsl(var(--background))',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  };
}

export function getFilterOperators(filterVariant: FilterVariant) {
  const operatorMap: Record<FilterVariant, { label: string; value: FilterOperator }[]> = {
    text: dataTableConfig.textOperators,
    number: dataTableConfig.numericOperators,
    range: dataTableConfig.numericOperators,
    date: dataTableConfig.dateOperators,
    dateRange: dataTableConfig.dateOperators,
    boolean: dataTableConfig.booleanOperators,
    select: dataTableConfig.selectOperators,
    multiSelect: dataTableConfig.multiSelectOperators,
  };

  return operatorMap[filterVariant] ?? dataTableConfig.textOperators;
}

export function getDefaultFilterOperator(filterVariant: FilterVariant) {
  const operators = getFilterOperators(filterVariant);

  return operators[0]?.value ?? (filterVariant === 'text' ? 'iLike' : 'eq');
}

export function getValidFilters(filters: ExtendedColumnFilter[]): ExtendedColumnFilter[] {
  return filters.filter(
    filter =>
      filter.operator === 'isEmpty' ||
      filter.operator === 'isNotEmpty' ||
      (Array.isArray(filter.value)
        ? filter.value.length > 0
        : filter.value !== '' && filter.value !== null && filter.value !== undefined)
  );
}
