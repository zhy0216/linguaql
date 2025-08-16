import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface SQLConfirmationModalProps {
  isOpen: boolean;
  generatedSQL: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const SQLConfirmationModal: React.FC<SQLConfirmationModalProps> = ({
  isOpen,
  generatedSQL,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('query.confirmSQLExecution')}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
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

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">{t('query.aiGeneratedSQLWarning')}</p>

          <div className="bg-gray-50 border rounded-md p-3">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
              {generatedSQL}
            </pre>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('query.executeAnyway')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SQLConfirmationModal;
