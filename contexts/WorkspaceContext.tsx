import React, { useCallback, useMemo, type ReactNode } from 'react';
import { ChatProvider, useChatContext, type ChatState, type ChatAction } from './ChatContext';
import { IdentityProvider, useIdentityContext, type IdentityState, type IdentityAction } from './IdentityContext';
import { UIProvider, useUIContext, type UIState, type UIAction } from './UIContext';
import type { ChatSession, Message, Stage, CompanyField, User } from '../types';

export { type ViewType } from './UIContext';

export { useChatContext } from './ChatContext';
export { useIdentityContext } from './IdentityContext';
export { useUIContext } from './UIContext';

export interface WorkspaceState {
  currentView: UIState['currentView'];
  selectedChatId: string;
  isProfileOpen: boolean;
  isUserModalOpen: boolean;
  searchQuery: string;
  isSearchOpen: boolean;
  threads: ChatSession[];
  activeMessages: Message[];
  stagesConfig: Stage[];
  companyFields: CompanyField[];
  isThreadsLoading: boolean;
  isThreadsLoadingMore: boolean;
  isMessagesLoading: boolean;
  isLoadingOlderMessages: boolean;
  isInitializing: boolean;
  initError: string;
  currentUser: User | null;
  currentCompanyMemberId: string | null;
  threadsFilter: string;
  balance: number | null;
  orderUpdateSignal: number | null;
}

export type WorkspaceAction = ChatAction | IdentityAction | UIAction;

// --- Composite Provider ---

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <UIProvider>
    <IdentityProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </IdentityProvider>
  </UIProvider>
);

// --- Backward-compatible useWorkspace hook ---

interface WorkspaceContextType {
  state: WorkspaceState;
  dispatch: (action: WorkspaceAction) => void;
  setCurrentView: (view: UIState['currentView']) => void;
  setSelectedChatId: (id: string) => void;
  toggleProfile: () => void;
  toggleUserModal: () => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  updateThread: (id: string, updates: Partial<ChatSession>) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setCurrentUser: (user: User | null) => void;
  setCurrentCompanyMemberId: (id: string | null) => void;
  setThreadsFilter: (filter: string) => void;
  resetState: () => void;
}

export const useWorkspace = (): WorkspaceContextType => {
  const { chatState, chatDispatch, setSelectedChatId, updateThread, addMessage, updateMessage, clearMessages, setThreadsFilter } = useChatContext();
  const { identityState, identityDispatch, setCurrentUser, setCurrentCompanyMemberId } = useIdentityContext();
  const { uiState, uiDispatch, setCurrentView, toggleProfile, toggleUserModal, setSearchQuery, setSearchOpen } = useUIContext();

  const state: WorkspaceState = useMemo(() => ({
    ...uiState,
    ...chatState,
    ...identityState,
  }), [uiState, chatState, identityState]);

  const dispatch = useCallback((action: WorkspaceAction) => {
    chatDispatch(action as ChatAction);
    identityDispatch(action as IdentityAction);
    uiDispatch(action as UIAction);
  }, [chatDispatch, identityDispatch, uiDispatch]);

  const resetState = useCallback(() => {
    chatDispatch({ type: 'RESET_CHAT' });
    identityDispatch({ type: 'RESET_IDENTITY' });
    uiDispatch({ type: 'RESET_UI' });
  }, [chatDispatch, identityDispatch, uiDispatch]);

  return useMemo(() => ({
    state, dispatch,
    setCurrentView, setSelectedChatId, toggleProfile, toggleUserModal,
    setSearchQuery, setSearchOpen,
    updateThread, addMessage, updateMessage,
    clearMessages, setCurrentUser, setCurrentCompanyMemberId, setThreadsFilter, resetState,
  }), [
    state, dispatch,
    setCurrentView, setSelectedChatId, toggleProfile, toggleUserModal,
    setSearchQuery, setSearchOpen,
    updateThread, addMessage, updateMessage,
    clearMessages, setCurrentUser, setCurrentCompanyMemberId, setThreadsFilter, resetState,
  ]);
};
