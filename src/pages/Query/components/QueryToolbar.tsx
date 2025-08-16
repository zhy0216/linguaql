import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {t('query.history')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {queryHistory.length === 0 ? (
              <DropdownMenuItem disabled>
                <span className="text-sm text-gray-500">{t('query.noQueryHistory')}</span>
              </DropdownMenuItem>
            ) : (
              queryHistory.map((query, idx) => (
                <DropdownMenuItem key={idx} onClick={() => selectHistoryQuery(query)}>
                  <div className="truncate max-w-56 text-xs" title={query}>
                    {query}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex gap-2">
        <Button variant="destructive" size="sm" onClick={cancelQuery} disabled={!isExecuting}>
          {t('common.cancel')}
        </Button>
        <Button
          size="sm"
          onClick={executeQuery}
          disabled={isExecuting || !queryInput.trim()}
          title={`${t('query.execute')} (${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter)`}
        >
          {t('query.execute')}
        </Button>
      </div>
    </div>
  );
};

export default QueryToolbar;
