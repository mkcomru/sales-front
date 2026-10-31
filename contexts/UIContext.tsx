import React, { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from 'react';

export type ViewType = 'inbox' | 'settings' | 'products' | 'funnel' | 'analytics';

export interface UIState {
  currentView: ViewType;
  isProfileOpen: boolean;
  isUserModalOpen: boolean;
  searchQuery: string;
  isSearchOpen: boolean;
}

export type UIAction =
  | { type: 'SET_CURRENT_VIEW'; payload: ViewType }
  | { type: 'SET_PROFILE_OPEN'; payload: boolean }
  | { type: 'TOGGLE_PROFILE_OPEN' }
  | { type: 'SET_USER_MODAL_OPEN'; payload: boolean }
  | { type: 'TOGGLE_USER_MODAL_OPEN' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_OPEN'; payload: boolean }
  | { type: 'RESET_UI' };

export const uiInitialState: UIState = {
  currentView: 'inbox',
  isProfileOpen: true,
  isUserModalOpen: false,
  searchQuery: '',
  isSearchOpen: false,
};

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_PROFILE_OPEN':
      return { ...state, isProfileOpen: action.payload };
    case 'TOGGLE_PROFILE_OPEN':
      return { ...state, isProfileOpen: !state.isProfileOpen };
    case 'SET_USER_MODAL_OPEN':
      return { ...state, isUserModalOpen: action.payload };
    case 'TOGGLE_USER_MODAL_OPEN':
      return { ...state, isUserModalOpen: !state.isUserModalOpen };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_SEARCH_OPEN':
      return { ...state, isSearchOpen: action.payload };
    case 'RESET_UI':
      return uiInitialState;
    default:
      return state;
  }
}

interface UIContextType {
  uiState: UIState;
  uiDispatch: React.Dispatch<UIAction>;
  setCurrentView: (view: ViewType) => void;
  toggleProfile: () => void;
  toggleUserModal: () => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
}

const UICtx = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [uiState, uiDispatch] = useReducer(uiReducer, uiInitialState);

  const setCurrentView = useCallback((view: ViewType) => {
    uiDispatch({ type: 'SET_CURRENT_VIEW', payload: view });
  }, []);

  const toggleProfile = useCallback(() => {
    uiDispatch({ type: 'TOGGLE_PROFILE_OPEN' });
  }, []);

  const toggleUserModal = useCallback(() => {
    uiDispatch({ type: 'TOGGLE_USER_MODAL_OPEN' });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    uiDispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const setSearchOpen = useCallback((open: boolean) => {
    uiDispatch({ type: 'SET_SEARCH_OPEN', payload: open });
  }, []);

  const value = useMemo(() => ({
    uiState, uiDispatch,
    setCurrentView, toggleProfile, toggleUserModal,
    setSearchQuery, setSearchOpen,
  }), [uiState, setCurrentView, toggleProfile, toggleUserModal, setSearchQuery, setSearchOpen]);

  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
};

export const useUIContext = (): UIContextType => {
  const ctx = useContext(UICtx);
  if (!ctx) throw new Error('useUIContext must be used within UIProvider');
  return ctx;
};
