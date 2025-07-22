import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Select } from 'flowbite-react';

interface FilterConfig {
  column: string;
  value: string;
}

interface FilterControlsProps {
  filterConfigs: FilterConfig[];
  availableColumns: string[];
  onAddFilter: () => void;
  onUpdateFilter: (index: number, updates: Partial<FilterConfig>) => void;
  onRemoveFilter: (index: number) => void;
  onClearAllFilters: () => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  filterConfigs,
  availableColumns,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearAllFilters,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-3 border-b border-gray-200 bg-gray-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">{t('query.filters')}</h3>
        <div className="flex gap-1">
          <Button size="xs" onClick={onAddFilter}>
            {t('query.addFilter')}
          </Button>
          {filterConfigs.length > 0 && (
            <Button size="xs" color="gray" onClick={onClearAllFilters}>
              {t('query.clearAll')}
            </Button>
          )}
        </div>
      </div>

      {filterConfigs.length === 0 ? (
        <div className="text-xs text-gray-500">{t('query.noFiltersApplied')}</div>
      ) : (
        <div className="space-y-2">
          {filterConfigs.map((filter, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Select
                sizing="sm"
                value={filter.column}
                onChange={e => onUpdateFilter(index, { column: e.target.value })}
              >
                <option value="">{t('query.selectColumn')}</option>
                {availableColumns.map((column, colIndex) => (
                  <option key={colIndex} value={column}>
                    {column}
                  </option>
                ))}
              </Select>
              <input
                type="text"
                placeholder={t('query.filterValue')}
                className="text-xs border border-gray-300 rounded px-2 py-1 flex-1 max-w-xs"
                value={filter.value}
                onChange={e => onUpdateFilter(index, { value: e.target.value })}
                disabled={!filter.column}
              />
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
