'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import { getAuthData, setAuthData, clearAuthData, getRoleBasedRedirect } from '@/lib/auth';
import { AuthState, User, Company, LoginCredentials, SignupData } from '@/types';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    company: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Initialize auth state from cookies
  useEffect(() => {
    const initializeAuth = () => {
      const authData = getAuthData();
      setAuthState(authData);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await apiClient.login(credentials);
      
      if (response.success && response.data) {
        const { user, company, token } = response.data;
        
        // Store auth data in cookies
        setAuthData(token, user, company);
        
        // Update auth state
        setAuthState({
          user,
          company,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        // Redirect based on role
        const redirectPath = getRoleBasedRedirect(user.role);
        router.push(redirectPath);
        
        toast.success('Login successful!');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData) => {
    try {
      setIsLoading(true);
      const response = await apiClient.signup(data);
      console.log("🚀 ~ signup ~ response:", response)
      
      if (response.success && response.data) {
        const { user, company, token } = response.data;
        
        // Store auth data in cookies
        setAuthData(token, user, company);
        
        // Update auth state
        setAuthState({
          user,
          company,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        // Redirect to admin dashboard
        router.push('/admin/dashboard');
        
        toast.success('Account created successfully!');
      } else {
        throw new Error(response.message || 'Signup failed');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.response?.data?.message || error.message || 'Signup failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear auth data
    clearAuthData();
    
    // Update auth state
    setAuthState({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Redirect to login
    router.push('/auth/login');
    toast.success('Logged out successfully');
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.getProfile();
      
      if (response.success && response.data) {
        const { user, company } = response.data;
        
        // Update stored auth data
        const token = getAuthData().token;
        if (token) {
          setAuthData(token, user, company);
        }
        
        // Update auth state
        setAuthState(prev => ({
          ...prev,
          user,
          company,
        }));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // If refresh fails, logout user
      logout();
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    signup,
    logout,
    refreshUser,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
