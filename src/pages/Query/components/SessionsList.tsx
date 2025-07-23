import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'flowbite-react';
import { QuerySession } from '../../../stores/querySessionStore';

interface SessionsListProps {
  querySessions: QuerySession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onCreateNewSession: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, newName: string) => void;
}

const SessionsList: React.FC<SessionsListProps> = ({
  querySessions,
  activeSessionId,
  onSessionSelect,
  onCreateNewSession,
  onDeleteSession,
  onRenameSession,
}) => {
  const { t } = useTranslation();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent session selection when clicking delete
    if (onDeleteSession) {
      onDeleteSession(sessionId);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    if (activeSessionId === sessionId) {
      // 如果点击的是已选中的 session，开始编辑
      startEditing(sessionId);
    } else {
      // 否则选择这个 session
      onSessionSelect(sessionId);
    }
  };

  const startEditing = (sessionId: string) => {
    const session = querySessions.find(s => s.id === sessionId);
    if (session) {
      setEditingSessionId(sessionId);
      setEditingName(session.name);
    }
  };

  const handleSaveEdit = () => {
    if (editingSessionId && editingName.trim() && onRenameSession) {
      onRenameSession(editingSessionId, editingName.trim());
    }
    setEditingSessionId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
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
            onClick={() => handleSessionClick(session.id)}
          >
            {editingSessionId === session.id ? (
              <input
                type="text"
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveEdit}
                className="flex-1 px-1 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:border-blue-500"
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                className="flex-1 truncate"
                title={
                  activeSessionId === session.id
                    ? t('query.clickToRename', 'Click to rename')
                    : undefined
                }
              >
                {session.name}
              </span>
            )}
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
