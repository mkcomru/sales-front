import { useToastContext, Toast, ToastType } from '../contexts/ToastContext';

// Re-export types for compatibility
export type { Toast, ToastType };

export function useToast() {
  return useToastContext();
}
