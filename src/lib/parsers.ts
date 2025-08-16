import { createParser } from 'nuqs/server';
import { z } from 'zod';

// Define types locally since they're not exported from data-table
interface ExtendedColumnFilter {
  id: string;
  operator: string;
  value: any;
  variant: string;
  filterId: string;
}

interface ExtendedColumnSort {
  id: string;
  desc: boolean;
}

// Mock dataTableConfig since it's not available
const dataTableConfig = {
  filterVariants: ['text', 'number', 'date', 'boolean'] as const,
  operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'iLike', 'isEmpty', 'isNotEmpty'] as const,
};

const sortingItemSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

export const getSortingStateParser = (columnIds?: string[] | Set<string>) => {
  const validKeys = columnIds ? (columnIds instanceof Set ? columnIds : new Set(columnIds)) : null;

  return createParser({
    parse: value => {
      try {
        const parsed = JSON.parse(value);
        const result = z.array(sortingItemSchema).safeParse(parsed);

        if (!result.success) return null;

        if (validKeys && result.data.some(item => !validKeys.has(item.id))) {
          return null;
        }

        return result.data as ExtendedColumnSort[];
      } catch {
        return null;
      }
    },
    serialize: value => JSON.stringify(value),
    eq: (a, b) =>
      a.length === b.length &&
      a.every((item, index) => item.id === b[index]?.id && item.desc === b[index]?.desc),
  });
};

const filterItemSchema = z.object({
  id: z.string(),
  value: z.union([z.string(), z.array(z.string())]),
  variant: z.enum(dataTableConfig.filterVariants),
  operator: z.enum(dataTableConfig.operators),
  filterId: z.string(),
});

export type FilterItemSchema = z.infer<typeof filterItemSchema>;

export const getFiltersStateParser = (columnIds?: string[] | Set<string>) => {
  const validKeys = columnIds ? (columnIds instanceof Set ? columnIds : new Set(columnIds)) : null;

  return createParser({
    parse: value => {
      try {
        const parsed = JSON.parse(value);
        const result = z.array(filterItemSchema).safeParse(parsed);

        if (!result.success) return null;

        if (validKeys && result.data.some(item => !validKeys.has(item.id))) {
          return null;
        }

        return result.data as ExtendedColumnFilter[];
      } catch {
        return null;
      }
    },
    serialize: value => JSON.stringify(value),
    eq: (a, b) =>
      a.length === b.length &&
      a.every(
        (filter, index) =>
          filter.id === b[index]?.id &&
          filter.value === b[index]?.value &&
          filter.variant === b[index]?.variant &&
          filter.operator === b[index]?.operator
      ),
  });
};
