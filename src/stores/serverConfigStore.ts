import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ServerConfig, DatabaseConfig } from '../types/database';

interface ServerConfigState {
  servers: ServerConfig[];
  selectedServerId: string | null;
  currentConfig: DatabaseConfig;
  
  // Actions
  addServer: (server: ServerConfig) => void;
  updateServer: (id: string, updates: Partial<ServerConfig>) => void;
  deleteServer: (id: string) => void;
  setSelectedServer: (id: string | null) => void;
  setCurrentConfig: (config: DatabaseConfig) => void;
  getServerById: (id: string) => ServerConfig | undefined;
  clearServers: () => void;
}

const defaultConfig: DatabaseConfig = {
  host: 'localhost',
  port: 5432,
  username: '',
  password: '',
  database: '',
};

export const useServerConfigStore = create<ServerConfigState>()(
  persist(
    (set, get) => ({
      servers: [],
      selectedServerId: null,
      currentConfig: defaultConfig,

      addServer: (server) =>
        set((state) => ({
          servers: [...state.servers, server],
        })),

      updateServer: (id, updates) =>
        set((state) => ({
          servers: state.servers.map((server) =>
            server.id === id ? { ...server, ...updates } : server
          ),
        })),

      deleteServer: (id) =>
        set((state) => ({
          servers: state.servers.filter((server) => server.id !== id),
          selectedServerId: state.selectedServerId === id ? null : state.selectedServerId,
        })),

      setSelectedServer: (id) =>
        set(() => ({
          selectedServerId: id,
        })),

      setCurrentConfig: (config) =>
        set(() => ({
          currentConfig: config,
        })),

      getServerById: (id) => {
        const state = get();
        return state.servers.find((server) => server.id === id);
      },

      clearServers: () =>
        set(() => ({
          servers: [],
          selectedServerId: null,
          currentConfig: defaultConfig,
        })),
    }),
    {
      name: 'server-config-storage', // unique name for localStorage
      partialize: (state) => ({
        servers: state.servers,
      }), // only persist servers
    }
  )
);
