import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from 'flowbite-react';
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
    <Modal show={isOpen} onClose={onClose} size="4xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('query.cellData')}
            </h2>
            <span className="text-sm text-gray-500">
              ({columnName}, {t('query.row')} {rowIndex + 1})
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('query.fullData')}
            </h3>
            <Button
              size="sm"
              color={isCopied ? 'success' : 'gray'}
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
          <Button onClick={onClose} color="gray">
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CellDataModal;
