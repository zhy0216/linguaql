import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'flowbite-react';
import { formatCellValue, truncateText } from '@/utils/cellUtils';
import CellDataModal from './CellDataModal';

interface TableCellContentProps {
  cellValue: any;
  columnName: string;
  rowIndex: number;
  maxLength?: number;
}

const TableCellContent: React.FC<TableCellContentProps> = ({
  cellValue,
  columnName,
  rowIndex,
  maxLength = 100,
}) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle null values
  if (cellValue === null || cellValue === undefined) {
    return <span className="text-gray-400 italic">{t('common.null')}</span>;
  }

  const formattedValue = formatCellValue(cellValue, false); // Use compact format for table display
  const { truncated, isTruncated } = truncateText(formattedValue, maxLength);

  const handleShowMore = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <span className="break-words whitespace-pre-wrap">{truncated}</span>
        {isTruncated && (
          <Button
            size="xs"
            color="blue"
            onClick={handleShowMore}
            className="text-xs px-2 py-1 min-w-fit flex-shrink-0"
          >
            {t('common.showMore')}
          </Button>
        )}
      </div>

      <CellDataModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        cellValue={cellValue}
        columnName={columnName}
        rowIndex={rowIndex}
      />
    </>
  );
};

export default TableCellContent;
