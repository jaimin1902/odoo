import Cookies from 'js-cookie';
import { User, Company, AuthState } from '@/types';

export const AUTH_COOKIE_NAME = 'auth_token';
export const USER_COOKIE_NAME = 'user_data';
export const COMPANY_COOKIE_NAME = 'company_data';

export const setAuthData = (token: string, user: User, company: Company) => {
  Cookies.set(AUTH_COOKIE_NAME, token, { expires: 7, secure: true, sameSite: 'strict' });
  Cookies.set(USER_COOKIE_NAME, JSON.stringify(user), { expires: 7, secure: true, sameSite: 'strict' });
  Cookies.set(COMPANY_COOKIE_NAME, JSON.stringify(company), { expires: 7, secure: true, sameSite: 'strict' });
};

export const getAuthData = (): AuthState => {
  const token = Cookies.get(AUTH_COOKIE_NAME);
  const userData = Cookies.get(USER_COOKIE_NAME);
  const companyData = Cookies.get(COMPANY_COOKIE_NAME);

  if (!token || !userData || !companyData) {
    return {
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    };
  }

  try {
    const user: User = JSON.parse(userData);
    const company: Company = JSON.parse(companyData);

    return {
      user,
      company,
      token,
      isAuthenticated: true,
      isLoading: false,
    };
  } catch (error) {
    console.error('Error parsing auth data:', error);
    clearAuthData();
    return {
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    };
  }
};

export const clearAuthData = () => {
  Cookies.remove(AUTH_COOKIE_NAME);
  Cookies.remove(USER_COOKIE_NAME);
  Cookies.remove(COMPANY_COOKIE_NAME);
};

export const getRoleBasedRedirect = (role: string): string => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'manager':
      return '/manager/dashboard';
    case 'employee':
      return '/employee/dashboard';
    default:
      return '/auth/login';
  }
};

export const hasPermission = (userRole: string, requiredRoles: string[]): boolean => {
  return requiredRoles.includes(userRole);
};

export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'manager':
      return 'Manager';
    case 'employee':
      return 'Employee';
    default:
      return 'Unknown';
  }
};

export const getRoleColor = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800';
    case 'manager':
      return 'bg-blue-100 text-blue-800';
    case 'employee':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
