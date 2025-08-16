import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { formatCellValue } from '@/utils/cellUtils';

interface CellDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  cellValue: any;
  columnName: string;
  rowIndex: number;
}

const CellDataModal: React.FC<CellDataModalProps> = ({
  isOpen,
  onClose,
  cellValue,
  columnName,
  rowIndex,
}) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const formattedValue = formatCellValue(cellValue, true); // Use nice format for modal display
  const isObjectType =
    cellValue !== null && cellValue !== undefined && typeof cellValue === 'object';

  // Detect dark mode from the document
  const isDarkMode = document.documentElement.classList.contains('dark');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedValue);
      setIsCopied(true);
      // Reset the copied state after 1 second
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{t('query.cellData')}</span>
            <span className="text-sm text-gray-500 font-normal">
              ({columnName}, {t('query.row')} {rowIndex + 1})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{t('query.fullData')}</h3>
            <Button
              size="sm"
              variant={isCopied ? 'default' : 'secondary'}
              onClick={handleCopy}
              className="text-xs"
            >
              {isCopied ? (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{t('common.copied')}</span>
                </div>
              ) : (
                t('common.copy')
              )}
            </Button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden max-h-96">
            {isObjectType ? (
              <CodeMirror
                value={formattedValue}
                extensions={[json()]}
                editable={false}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: false,
                }}
                theme={isDarkMode ? githubDark : githubLight}
                className="text-sm"
                style={{
                  fontSize: '14px',
                  maxHeight: '420px',
                  overflow: 'auto',
                }}
              />
            ) : (
              <div className="p-4 max-h-96 overflow-auto">
                <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words font-mono">
                  {formattedValue}
                </pre>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {t('query.dataLength', { length: formattedValue.length })}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose} variant="secondary">
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CellDataModal;
