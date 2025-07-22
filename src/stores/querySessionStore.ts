import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QuerySession {
  id: string;
  name: string;
  createdAt: string;
  serverId: string; // 关联到特定的 server
  queryInput: string; // 保存查询输入
  queryResult: any | null; // 保存查询结果
  queryHistory: string[]; // 保存查询历史
  lastModified: string; // 最后修改时间
}

interface QuerySessionState {
  // 按 serverId 分组的 sessions
  sessionsByServer: Record<string, QuerySession[]>;
  // 当前活跃的 session ID（按 server 分组）
  activeSessionByServer: Record<string, string | null>;

  // Actions
  getSessionsForServer: (serverId: string) => QuerySession[];
  getActiveSessionForServer: (serverId: string) => QuerySession | null;
  createSession: (serverId: string, name?: string) => QuerySession;
  updateSession: (
    sessionId: string,
    updates: Partial<Omit<QuerySession, 'id' | 'serverId' | 'createdAt'>>
  ) => void;
  deleteSession: (sessionId: string) => void;
  setActiveSession: (serverId: string, sessionId: string | null) => void;
  clearSessionsForServer: (serverId: string) => void;
  getAllSessions: () => QuerySession[];
}

export const useQuerySessionStore = create<QuerySessionState>()(
  persist(
    (set, get) => ({
      sessionsByServer: {},
      activeSessionByServer: {},

      getSessionsForServer: (serverId: string) => {
        const state = get();
        return state.sessionsByServer[serverId] || [];
      },

      getActiveSessionForServer: (serverId: string) => {
        const state = get();
        const sessions = state.sessionsByServer[serverId] || [];
        const activeSessionId = state.activeSessionByServer[serverId];
        return sessions.find(session => session.id === activeSessionId) || null;
      },

      createSession: (serverId: string, name?: string) => {
        const state = get();
        const existingSessions = state.sessionsByServer[serverId] || [];
        const sessionNumber = existingSessions.length + 1;

        const newSession: QuerySession = {
          id: `${serverId}-${Date.now()}`,
          name: name || `Query Session ${sessionNumber}`,
          createdAt: new Date().toISOString(),
          serverId,
          queryInput: '',
          queryResult: null,
          queryHistory: [],
          lastModified: new Date().toISOString(),
        };

        set(state => ({
          sessionsByServer: {
            ...state.sessionsByServer,
            [serverId]: [...existingSessions, newSession],
          },
          activeSessionByServer: {
            ...state.activeSessionByServer,
            [serverId]: newSession.id,
          },
        }));

        return newSession;
      },

      updateSession: (
        sessionId: string,
        updates: Partial<Omit<QuerySession, 'id' | 'serverId' | 'createdAt'>>
      ) => {
        set(state => {
          const newSessionsByServer = { ...state.sessionsByServer };

          // 找到包含该 session 的 server
          for (const serverId in newSessionsByServer) {
            const sessions = newSessionsByServer[serverId];
            const sessionIndex = sessions.findIndex(s => s.id === sessionId);

            if (sessionIndex !== -1) {
              newSessionsByServer[serverId] = sessions.map((session, index) =>
                index === sessionIndex
                  ? { ...session, ...updates, lastModified: new Date().toISOString() }
                  : session
              );
              break;
            }
          }

          return { sessionsByServer: newSessionsByServer };
        });
      },

      deleteSession: (sessionId: string) => {
        set(state => {
          const newSessionsByServer = { ...state.sessionsByServer };
          const newActiveSessionByServer = { ...state.activeSessionByServer };

          // 找到包含该 session 的 server 并删除
          for (const serverId in newSessionsByServer) {
            const sessions = newSessionsByServer[serverId];
            const sessionIndex = sessions.findIndex(s => s.id === sessionId);

            if (sessionIndex !== -1) {
              newSessionsByServer[serverId] = sessions.filter(s => s.id !== sessionId);

              // 如果删除的是当前活跃的 session，则清除活跃状态
              if (newActiveSessionByServer[serverId] === sessionId) {
                const remainingSessions = newSessionsByServer[serverId];
                newActiveSessionByServer[serverId] =
                  remainingSessions.length > 0 ? remainingSessions[0].id : null;
              }
              break;
            }
          }

          return {
            sessionsByServer: newSessionsByServer,
            activeSessionByServer: newActiveSessionByServer,
          };
        });
      },

      setActiveSession: (serverId: string, sessionId: string | null) => {
        set(state => ({
          activeSessionByServer: {
            ...state.activeSessionByServer,
            [serverId]: sessionId,
          },
        }));
      },

      clearSessionsForServer: (serverId: string) => {
        set(state => {
          const newSessionsByServer = { ...state.sessionsByServer };
          const newActiveSessionByServer = { ...state.activeSessionByServer };

          delete newSessionsByServer[serverId];
          delete newActiveSessionByServer[serverId];

          return {
            sessionsByServer: newSessionsByServer,
            activeSessionByServer: newActiveSessionByServer,
          };
        });
      },

      getAllSessions: () => {
        const state = get();
        const allSessions: QuerySession[] = [];

        for (const serverId in state.sessionsByServer) {
          allSessions.push(...state.sessionsByServer[serverId]);
        }

        return allSessions.sort(
          (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        );
      },
    }),
    {
      name: 'query-session-storage',
      partialize: state => ({
        sessionsByServer: state.sessionsByServer,
        activeSessionByServer: state.activeSessionByServer,
      }),
    }
  )
);
