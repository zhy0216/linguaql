import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'flowbite-react';
import { QuerySession } from '../../../stores/querySessionStore';

interface SessionsListProps {
  querySessions: QuerySession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onCreateNewSession: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

const SessionsList: React.FC<SessionsListProps> = ({
  querySessions,
  activeSessionId,
  onSessionSelect,
  onCreateNewSession,
  onDeleteSession,
}) => {
  const { t } = useTranslation();

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent session selection when clicking delete
    if (onDeleteSession) {
      onDeleteSession(sessionId);
    }
  };

  return (
    <div className="p-3 border-b border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">{t('query.sessions')}</h3>
        <div className="flex gap-1">
          <Button size="xs" onClick={onCreateNewSession}>
            {t('query.newSession')}
          </Button>
        </div>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {querySessions.map(session => (
          <div
            key={session.id}
            className={`group flex items-center justify-between p-1.5 text-sm rounded cursor-pointer 
              ${activeSessionId === session.id ? 'bg-blue-100 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => onSessionSelect(session.id)}
          >
            <span className="flex-1 truncate">{session.name}</span>
            {querySessions.length > 1 && (
              <button
                className="opacity-0 group-hover:opacity-100 ml-2 text-red-500 hover:text-red-700 text-xs"
                onClick={e => handleDeleteSession(e, session.id)}
                title="Delete session"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionsList;
