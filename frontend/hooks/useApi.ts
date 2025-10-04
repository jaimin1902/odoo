import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await apiFunction(...args);
      setState({
        data: result,
        loading: false,
        error: null,
      });
      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      
      // Show error toast
      toast.error(errorMessage);
      return null;
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

export function useApiWithToast<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  successMessage?: string
): UseApiReturn<T> {
  const api = useApi(apiFunction);

  const executeWithToast = useCallback(async (...args: any[]): Promise<T | null> => {
    const result = await api.execute(...args);
    
    if (result && successMessage) {
      toast.success(successMessage);
    }
    
    return result;
  }, [api.execute, successMessage]);

  return {
    ...api,
    execute: executeWithToast,
  };
}
