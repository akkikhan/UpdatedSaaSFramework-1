import { createContext, useContext, ReactNode } from 'react';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';

interface RealtimeSyncContextType {
  isConnected: boolean;
  reconnect: () => void;
}

const RealtimeSyncContext = createContext<RealtimeSyncContextType | undefined>(undefined);

export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  const { isConnected, reconnect } = useRealtimeSync({
    enabled: true,
    configTypes: ['auth', 'rbac', 'notifications', 'modules'],
    autoInvalidateQueries: true
  });

  return (
    <RealtimeSyncContext.Provider value={{ isConnected, reconnect }}>
      {children}
    </RealtimeSyncContext.Provider>
  );
}

export function useRealtimeSyncContext() {
  const context = useContext(RealtimeSyncContext);
  if (context === undefined) {
    throw new Error('useRealtimeSyncContext must be used within a RealtimeSyncProvider');
  }
  return context;
}
