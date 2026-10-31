import React, { useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { companiesService, usersService } from '../services';
import { useChatContext } from '../contexts/ChatContext';
import { useIdentityContext } from '../contexts/IdentityContext';
import { useUIContext } from '../contexts/UIContext';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { NotFoundException } from '../utils/errors';
import { ThreadsRuntimeProvider, useThreadsRuntime } from '../contexts/ThreadsRuntimeContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../hooks/useToast';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import { logger } from '../utils/logger';
import { Layout } from './Layout';
import { WorkspaceLoading } from './workspace/WorkspaceLoading';
import { WorkspaceError } from './workspace/WorkspaceError';
import { NotificationProvider } from '../contexts/NotificationContext';

const WorkspaceContent: React.FC = () => {
  const { companyId: companyIdParam } = useParams<{ companyId: string }>();
  const companyId = companyIdParam ? parseInt(companyIdParam, 10) : null;
  return (
    <ThreadsRuntimeProvider companyId={companyId}>
      <WorkspaceShell companyId={companyId} />
    </ThreadsRuntimeProvider>
  );
};

const WorkspaceShell: React.FC<{ companyId: number | null }> = ({ companyId }) => {
  const { chatDispatch } = useChatContext();
  const { identityState, identityDispatch, setCurrentUser } = useIdentityContext();
  const { toggleUserModal, uiDispatch } = useUIContext();
  const toast = useToast();
  const { fetchThreads } = useThreadsRuntime();
  const ws = useWebSocket(companyId);

  useEffect(() => {
    ws.fetchThreadsRef.current = fetchThreads;
  }, [ws, fetchThreads]);

  const navigate = useNavigate();

  const resetState = useCallback(() => {
    chatDispatch({ type: 'RESET_CHAT' });
    identityDispatch({ type: 'RESET_IDENTITY' });
    uiDispatch({ type: 'RESET_UI' });
  }, [chatDispatch, identityDispatch, uiDispatch]);

  // Auto-refresh token before expiration
  useTokenRefresh();

  // Initialize system (fetch fields, balance, user)
  useEffect(() => {
    const initializeSystem = async () => {
      if (!companyId) return;
      identityDispatch({ type: 'SET_INITIALIZING', payload: true });
      identityDispatch({ type: 'SET_INIT_ERROR', payload: '' });
      try {
        const [fields, balanceRes, user] = await Promise.all([
          companiesService.getFields(companyId),
          companiesService.getBalance(companyId).catch(() => ({ balance: 0 })),
          usersService.getMe(),
        ]);
        identityDispatch({ type: 'SET_COMPANY_FIELDS', payload: fields });
        identityDispatch({ type: 'SET_BALANCE', payload: balanceRes.balance });
        setCurrentUser(user);
        const relation = user.companies?.find(c => c.company_id === companyId);
        if (relation) {
          identityDispatch({ type: 'SET_CURRENT_COMPANY_MEMBER_ID', payload: String(relation.id) });
        }
      } catch (error) {
        logger.error("System Initialization Failed", error);
        if (!(error instanceof NotFoundException)) {
          const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить данные компании.';
          identityDispatch({ type: 'SET_INIT_ERROR', payload: errorMessage });
          toast.error(errorMessage);
        }
      } finally {
        identityDispatch({ type: 'SET_INITIALIZING', payload: false });
      }
    };
    initializeSystem();
  }, [companyId]);

  // Initial fetch threads
  useEffect(() => {
    if (companyId) {
      fetchThreads();
    }
  }, [companyId, fetchThreads]);

  // Auth logout handler
  useEffect(() => {
    const handleAuthLogout = () => {
      toggleUserModal();
      resetState();
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [navigate, toggleUserModal, resetState]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    toggleUserModal();
    resetState();
    window.location.href = '/login';
  };

  // Loading state
  if (identityState.isInitializing || (!companyId && !identityState.initError)) {
    return <WorkspaceLoading />;
  }

  // Error state
  if (identityState.initError) {
    return <WorkspaceError error={identityState.initError} onLogout={handleLogout} />;
  }

  return (
    <WebSocketProvider value={ws}>
      <NotificationProvider companyId={companyId!}>
        <Layout />
      </NotificationProvider>
    </WebSocketProvider>
  );
};

export const Workspace: React.FC = () => (
  <WorkspaceProvider>
    <WorkspaceContent />
  </WorkspaceProvider>
);
