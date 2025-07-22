import React from 'react';
import SessionsList from './SessionsList';
import DatabaseTablesList from './DatabaseTablesList';
import { DatabaseTable } from '@/services/DBService';

interface QuerySession {
  id: string;
  name: string;
  createdAt: string;
}

interface QuerySidebarProps {
  // Sessions props
  querySessions: QuerySession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onCreateNewSession: () => void;

  // Database tables props
  databaseTables: DatabaseTable[];
  selectedTable: DatabaseTable | null;
  onTableSelect: (table: DatabaseTable) => void;
}

const QuerySidebar: React.FC<QuerySidebarProps> = ({
  querySessions,
  activeSessionId,
  onSessionSelect,
  onCreateNewSession,
  databaseTables,
  selectedTable,
  onTableSelect,
}) => {
  return (
    <div className="w-80 min-w-80 max-w-80 border-r border-gray-200 flex flex-col h-full bg-gray-50">
      <SessionsList
        querySessions={querySessions}
        activeSessionId={activeSessionId}
        onSessionSelect={onSessionSelect}
        onCreateNewSession={onCreateNewSession}
      />
      <DatabaseTablesList
        databaseTables={databaseTables}
        selectedTable={selectedTable}
        onTableSelect={onTableSelect}
      />
    </div>
  );
};

export default QuerySidebar;
