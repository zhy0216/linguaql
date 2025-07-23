import React from 'react';
import SessionsList from './SessionsList';
import DatabaseTablesList from './DatabaseTablesList';
import { DatabaseTable } from '@/services/DBService';
import { QuerySession } from '../../../stores/querySessionStore';

interface QuerySidebarProps {
  // Sessions props
  querySessions: QuerySession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onCreateNewSession: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, newName: string) => void;

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
  onDeleteSession,
  onRenameSession,
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
        onDeleteSession={onDeleteSession}
        onRenameSession={onRenameSession}
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
