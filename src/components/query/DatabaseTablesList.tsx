import React from 'react';
import { useTranslation } from 'react-i18next';
import { DatabaseTable } from '../../services/DBService';

interface DatabaseTablesListProps {
  databaseTables: DatabaseTable[];
  selectedTable: DatabaseTable | null;
  onTableSelect: (table: DatabaseTable) => void;
}

const DatabaseTablesList: React.FC<DatabaseTablesListProps> = ({
  databaseTables,
  selectedTable,
  onTableSelect,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-3 flex-grow overflow-y-auto">
      <h3 className="text-sm font-semibold mb-2">{t('database.databaseTables')}</h3>
      {databaseTables.length === 0 ? (
        <div className="text-sm text-gray-500">{t('database.noTablesFound')}</div>
      ) : (
        <div className="space-y-1">
          {databaseTables.map((table, index) => (
            <div
              key={index}
              className={`p-1.5 text-xs hover:bg-gray-100 cursor-pointer rounded ${
                selectedTable &&
                selectedTable.name === table.name &&
                selectedTable.schema === table.schema
                  ? 'bg-blue-100'
                  : ''
              }`}
              onClick={() => onTableSelect(table)}
            >
              <span className="text-gray-500">{table.schema}.</span>
              <span>{table.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DatabaseTablesList;
