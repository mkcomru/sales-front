import React, { createContext, useContext, type ReactNode } from 'react';
import { useThreads } from '../hooks/useThreads';

type ThreadsRuntime = ReturnType<typeof useThreads>;

const ThreadsRuntimeContext = createContext<ThreadsRuntime | null>(null);

export function ThreadsRuntimeProvider({
  companyId,
  children,
}: {
  companyId: number | null;
  children: ReactNode;
}) {
  const value = useThreads(companyId);
  return <ThreadsRuntimeContext.Provider value={value}>{children}</ThreadsRuntimeContext.Provider>;
}

export function useThreadsRuntime(): ThreadsRuntime {
  const ctx = useContext(ThreadsRuntimeContext);
  if (!ctx) {
    throw new Error('useThreadsRuntime must be used within ThreadsRuntimeProvider');
  }
  return ctx;
}
