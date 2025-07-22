import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'flowbite-react';

interface QueryToolbarProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  queryHistory: string[];
  selectHistoryQuery: (query: string) => void;
  cancelQuery: () => void;
  executeQuery: () => void;
  isExecuting: boolean;
  queryInput: string;
}

const QueryToolbar: React.FC<QueryToolbarProps> = ({
  showHistory,
  setShowHistory,
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
        <div className="relative">
          <Button size="xs" onClick={() => setShowHistory(!showHistory)}>
            {t('query.history')}
          </Button>
        </div>
      </div>
      <div>
        <div className="relative">
          {showHistory && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white shadow-lg rounded-lg z-10 border border-gray-200">
              <div className="p-1 max-h-60 overflow-y-auto">
                {queryHistory.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">{t('query.noQueryHistory')}</div>
                ) : (
                  queryHistory.map((query, idx) => (
                    <div
                      key={idx}
                      className="p-2 text-xs hover:bg-gray-100 cursor-pointer truncate"
                      onClick={() => selectHistoryQuery(query)}
                    >
                      {query}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
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
