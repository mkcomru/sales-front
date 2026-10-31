import React, { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from 'react';
import type { User, CompanyField } from '../types';

export interface IdentityState {
  currentUser: User | null;
  currentCompanyMemberId: string | null;
  balance: number | null;
  companyFields: CompanyField[];
  isInitializing: boolean;
  initError: string;
}

export type IdentityAction =
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'SET_CURRENT_COMPANY_MEMBER_ID'; payload: string | null }
  | { type: 'SET_BALANCE'; payload: number | null }
  | { type: 'SET_COMPANY_FIELDS'; payload: CompanyField[] }
  | { type: 'SET_INITIALIZING'; payload: boolean }
  | { type: 'SET_INIT_ERROR'; payload: string }
  | { type: 'RESET_IDENTITY' };

export const identityInitialState: IdentityState = {
  currentUser: null,
  currentCompanyMemberId: null,
  balance: null,
  companyFields: [],
  isInitializing: false,
  initError: '',
};

export function identityReducer(state: IdentityState, action: IdentityAction): IdentityState {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_CURRENT_COMPANY_MEMBER_ID':
      return { ...state, currentCompanyMemberId: action.payload };
    case 'SET_BALANCE':
      return { ...state, balance: action.payload };
    case 'SET_COMPANY_FIELDS':
      return { ...state, companyFields: action.payload };
    case 'SET_INITIALIZING':
      return { ...state, isInitializing: action.payload };
    case 'SET_INIT_ERROR':
      return { ...state, initError: action.payload };
    case 'RESET_IDENTITY':
      return identityInitialState;
    default:
      return state;
  }
}

interface IdentityContextType {
  identityState: IdentityState;
  identityDispatch: React.Dispatch<IdentityAction>;
  setCurrentUser: (user: User | null) => void;
  setCurrentCompanyMemberId: (id: string | null) => void;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export const IdentityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [identityState, identityDispatch] = useReducer(identityReducer, identityInitialState);

  const setCurrentUser = useCallback((user: User | null) => {
    identityDispatch({ type: 'SET_CURRENT_USER', payload: user });
  }, []);

  const setCurrentCompanyMemberId = useCallback((id: string | null) => {
    identityDispatch({ type: 'SET_CURRENT_COMPANY_MEMBER_ID', payload: id });
  }, []);

  const value = useMemo(() => ({
    identityState, identityDispatch,
    setCurrentUser, setCurrentCompanyMemberId,
  }), [identityState, setCurrentUser, setCurrentCompanyMemberId]);

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
};

export const useIdentityContext = (): IdentityContextType => {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentityContext must be used within IdentityProvider');
  return ctx;
};
