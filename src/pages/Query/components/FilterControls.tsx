import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Select, TextInput } from 'flowbite-react';
import { TableColumnInfo } from '../../../types/database';

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

interface FilterControlsProps {
  filterConfigs: FilterConfig[];
  availableColumns: string[];
  columnInfos?: TableColumnInfo[]; // 新增：列类型信息
  onAddFilter: () => void;
  onUpdateFilter: (index: number, updates: Partial<FilterConfig>) => void;
  onRemoveFilter: (index: number) => void;
  onApplyFilters: () => void;
  onClearAllFilters: () => void;
}

// Helper function to get operator options with translations
const getOperatorOptions = (t: any): { value: FilterOperator; label: string }[] => [
  { value: 'contains', label: t('query.operators.contains') },
  { value: 'equals', label: t('query.operators.equals') },
  { value: 'startsWith', label: t('query.operators.startsWith') },
  { value: 'endsWith', label: t('query.operators.endsWith') },
  { value: 'gt', label: t('query.operators.gt') },
  { value: 'gte', label: t('query.operators.gte') },
  { value: 'lt', label: t('query.operators.lt') },
  { value: 'lte', label: t('query.operators.lte') },
  { value: 'notEquals', label: t('query.operators.notEquals') },
  { value: 'isEmpty', label: t('query.operators.isEmpty') },
  { value: 'isNotEmpty', label: t('query.operators.isNotEmpty') },
];

// Helper function to check if operator requires a value
const operatorRequiresValue = (operator: FilterOperator): boolean => {
  return operator !== 'isEmpty' && operator !== 'isNotEmpty';
};

// 数据类型到操作符的映射
const DATA_TYPE_OPERATORS: Record<string, FilterOperator[]> = {
  // 数字类型
  numeric: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  integer: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  bigint: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  smallint: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  decimal: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  real: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  'double precision': ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  money: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  serial: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  bigserial: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],

  // 字符串类型
  text: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  varchar: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  char: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  'character varying': [
    'equals',
    'notEquals',
    'contains',
    'startsWith',
    'endsWith',
    'isEmpty',
    'isNotEmpty',
  ],
  character: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  name: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],

  // 日期时间类型
  date: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  time: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  timestamp: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  'timestamp without time zone': [
    'equals',
    'notEquals',
    'gt',
    'gte',
    'lt',
    'lte',
    'isEmpty',
    'isNotEmpty',
  ],
  'timestamp with time zone': [
    'equals',
    'notEquals',
    'gt',
    'gte',
    'lt',
    'lte',
    'isEmpty',
    'isNotEmpty',
  ],
  'time without time zone': [
    'equals',
    'notEquals',
    'gt',
    'gte',
    'lt',
    'lte',
    'isEmpty',
    'isNotEmpty',
  ],
  'time with time zone': ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  interval: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],

  // 布尔类型
  boolean: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  bool: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],

  // 特殊类型
  uuid: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  json: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  jsonb: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  xml: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  bytea: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],

  // 数组类型
  ARRAY: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
};

// Helper function to get available operators based on data type
const getAvailableOperators = (dataType: string): FilterOperator[] => {
  const lowerType = dataType.toLowerCase();

  // 直接匹配
  if (DATA_TYPE_OPERATORS[lowerType]) {
    return DATA_TYPE_OPERATORS[lowerType];
  }

  // 模糊匹配（处理带长度的类型，如 varchar(255)）
  for (const [type, operators] of Object.entries(DATA_TYPE_OPERATORS)) {
    if (lowerType.includes(type)) {
      return operators;
    }
  }

  // 默认情况：支持所有操作符（兼容未知类型）
  return [
    'equals',
    'notEquals',
    'contains',
    'startsWith',
    'endsWith',
    'gt',
    'gte',
    'lt',
    'lte',
    'isEmpty',
    'isNotEmpty',
  ];
};

// Helper function to get column data type
const getColumnDataType = (columnName: string, columnInfos?: TableColumnInfo[]): string => {
  if (!columnInfos) return 'unknown';
  const columnInfo = columnInfos.find(col => col.column_name === columnName);
  return columnInfo?.data_type || 'unknown';
};

const FilterControls: React.FC<FilterControlsProps> = ({
  filterConfigs,
  availableColumns,
  columnInfos,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onApplyFilters,
  onClearAllFilters,
}) => {
  const { t } = useTranslation();
  const allOperatorOptions = getOperatorOptions(t);

  return (
    <div className="p-3 border-b border-gray-200 bg-gray-50">
      <div className="flex gap-8 items-center mb-2">
        <h3 className="text-sm font-semibold">{t('query.filters')}</h3>
        <div className="flex gap-1">
          <Button size="xs" onClick={onAddFilter}>
            {t('query.addFilter')}
          </Button>
          {filterConfigs.length > 0 && (
            <>
              <Button size="xs" color="blue" onClick={onApplyFilters}>
                {t('query.applyFilters')}
              </Button>
              <Button size="xs" color="gray" onClick={onClearAllFilters}>
                {t('query.clearAll')}
              </Button>
            </>
          )}
        </div>
      </div>

      {filterConfigs.length === 0 ? (
        <div className="text-xs text-gray-500">{t('query.noFiltersApplied')}</div>
      ) : (
        <div className="space-y-2">
          {filterConfigs.map((filter, index) => (
            <div key={index} className="flex gap-2 items-center flex-wrap">
              <Select
                sizing="sm"
                value={filter.column}
                onChange={e => onUpdateFilter(index, { column: e.target.value })}
                className="min-w-[120px]"
              >
                <option value="">{t('query.selectColumn')}</option>
                {availableColumns.map((column, colIndex) => (
                  <option key={colIndex} value={column}>
                    {column}
                  </option>
                ))}
              </Select>
              <Select
                sizing="sm"
                value={filter.operator}
                onChange={e =>
                  onUpdateFilter(index, { operator: e.target.value as FilterOperator })
                }
                disabled={!filter.column}
                className="min-w-[100px]"
              >
                {(() => {
                  const columnDataType = getColumnDataType(filter.column, columnInfos);
                  const availableOperators = getAvailableOperators(columnDataType);
                  const filteredOptions = allOperatorOptions.filter(option =>
                    availableOperators.includes(option.value)
                  );
                  return filteredOptions.map((option: { value: FilterOperator; label: string }) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ));
                })()}
              </Select>
              {operatorRequiresValue(filter.operator) && (
                <TextInput
                  type="text"
                  placeholder={t('query.filterValue')}
                  sizing="sm"
                  className="flex-1 min-w-[100px] max-w-xs"
                  value={filter.value}
                  onChange={e => onUpdateFilter(index, { value: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onApplyFilters();
                    }
                  }}
                  disabled={!filter.column}
                />
              )}
              <Button size="xs" color="failure" onClick={() => onRemoveFilter(index)}>
                {t('common.remove')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterControls;
