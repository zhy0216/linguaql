import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'flowbite-react';

interface QuerySession {
  id: string;
  name: string;
  createdAt: string;
}

interface SessionsListProps {
  querySessions: QuerySession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onCreateNewSession: () => void;
}

const SessionsList: React.FC<SessionsListProps> = ({
  querySessions,
  activeSessionId,
  onSessionSelect,
  onCreateNewSession,
}) => {
  const { t } = useTranslation();

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
            className={`p-1.5 text-sm rounded cursor-pointer 
              ${activeSessionId === session.id ? 'bg-blue-100 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => onSessionSelect(session.id)}
          >
            {session.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionsList;
