import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, DropdownItem } from 'flowbite-react';

interface QueryToolbarProps {
  queryHistory: string[];
  selectHistoryQuery: (query: string) => void;
  cancelQuery: () => void;
  executeQuery: () => void;
  isExecuting: boolean;
  queryInput: string;
}

const QueryToolbar: React.FC<QueryToolbarProps> = ({
  queryHistory,
  selectHistoryQuery,
  cancelQuery,
  executeQuery,
  isExecuting,
  queryInput,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
      <div className="flex gap-2">
        <Dropdown label={t('query.history')} size="xs" dismissOnClick={true}>
          {queryHistory.length === 0 ? (
            <DropdownItem disabled>
              <span className="text-sm text-gray-500">{t('query.noQueryHistory')}</span>
            </DropdownItem>
          ) : (
            queryHistory.map((query, idx) => (
              <DropdownItem key={idx} onClick={() => selectHistoryQuery(query)}>
                <div className="truncate max-w-56 text-xs" title={query}>
                  {query}
                </div>
              </DropdownItem>
            ))
          )}
        </Dropdown>
      </div>

      <div className="flex gap-2">
        <Button size="xs" color="failure" onClick={cancelQuery} disabled={!isExecuting}>
          {t('common.cancel')}
        </Button>
        <Button
          size="xs"
          color="success"
          onClick={executeQuery}
          disabled={isExecuting || !queryInput.trim()}
        >
          {t('query.execute')}
        </Button>
      </div>
    </div>
  );
};

export default QueryToolbar;
