import axios, { AxiosInstance, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { ApiResponse, PaginatedResponse } from '@/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear auth data and redirect to login
          Cookies.remove('auth_token');
          Cookies.remove('user_data');
          Cookies.remove('company_data');
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async signup(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    country: string;
  }) {
    const response = await this.client.post('/auth/signup', data);
    return response.data;
  }

  async login(data: { email: string; password: string }) {
    const response = await this.client.post('/auth/login', data);
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  // User endpoints
  async getUsers(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const response = await this.client.get('/users', { params });
    return response.data;
  }

  async getUser(id: string) {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'employee' | 'manager';
    managerId?: string;
    isManagerApprover?: boolean;
  }) {
    const response = await this.client.post('/users', data);
    return response.data;
  }

  async updateUser(id: string, data: {
    firstName?: string;
    lastName?: string;
    role?: 'employee' | 'manager';
    managerId?: string;
    isManagerApprover?: boolean;
    isActive?: boolean;
  }) {
    const response = await this.client.put(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string) {
    const response = await this.client.delete(`/users/${id}`);
    return response.data;
  }

  async getTeamMembers() {
    const response = await this.client.get('/users/team/members');
    return response.data;
  }

  async getManagers() {
    const response = await this.client.get('/users/managers/list');
    return response.data;
  }

  // Expense endpoints
  async getExpenses(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  }) {
    const response = await this.client.get('/expenses', { params });
    return response.data;
  }

  async getExpense(id: string) {
    const response = await this.client.get(`/expenses/${id}`);
    return response.data;
  }

  async createExpense(data: {
    amount: number;
    currency: string;
    categoryId: string;
    description: string;
    expenseDate: string;
    receiptUrl?: string;
    notes?: string;
  }) {
    const response = await this.client.post('/expenses', data);
    return response.data;
  }

  async updateExpense(id: string, data: {
    amount?: number;
    currency?: string;
    categoryId?: string;
    description?: string;
    expenseDate?: string;
    receiptUrl?: string;
    notes?: string;
  }) {
    const response = await this.client.put(`/expenses/${id}`, data);
    return response.data;
  }

  async deleteExpense(id: string) {
    const response = await this.client.delete(`/expenses/${id}`);
    return response.data;
  }

  async getExpenseCategories() {
    const response = await this.client.get('/expenses/categories/list');
    return response.data;
  }

  async getExpenseStats(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/expenses/stats/summary', { params });
    return response.data;
  }

  // Approval endpoints
  async getPendingApprovals(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const response = await this.client.get('/approvals/pending', { params });
    return response.data;
  }

  async getApprovalHistory(expenseId: string) {
    const response = await this.client.get(`/approvals/expense/${expenseId}/history`);
    return response.data;
  }

  async makeApprovalDecision(expenseId: string, data: {
    status: 'approved' | 'rejected';
    comments?: string;
  }) {
    const response = await this.client.post(`/approvals/${expenseId}/decision`, data);
    return response.data;
  }

  async getNotifications(params?: {
    page?: number;
    limit?: number;
  }) {
    const response = await this.client.get('/approvals/notifications', { params });
    return response.data;
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await this.client.put(`/approvals/notifications/${notificationId}/read`);
    return response.data;
  }

  async getApprovalStats(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/approvals/stats/summary', { params });
    return response.data;
  }

  async overrideApproval(expenseId: string, data: {
    action: 'approve' | 'reject';
    reason: string;
  }) {
    const response = await this.client.post(`/approvals/${expenseId}/override`, data);
    return response.data;
  }

  // Company endpoints
  async getCompanyInfo() {
    const response = await this.client.get('/companies/info');
    return response.data;
  }

  async updateCompanyInfo(data: {
    name?: string;
    currency?: string;
    country?: string;
  }) {
    const response = await this.client.put('/companies/info', data);
    return response.data;
  }

  async updateCompany(data: {
    name?: string;
    currency?: string;
    country?: string;
  }) {
    const response = await this.client.put('/companies/info', data);
    return response.data;
  }

  async getCompanyStats(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/companies/stats', { params });
    return response.data;
  }

  async getCompanyDashboard(params?: {
    period?: string;
  }) {
    const response = await this.client.get('/companies/dashboard', { params });
    return response.data;
  }

  // Approval Rules endpoints
  async getApprovalRules(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const response = await this.client.get('/approval-rules', { params });
    return response.data;
  }

  async getApprovalRule(id: string) {
    const response = await this.client.get(`/approval-rules/${id}`);
    return response.data;
  }

  async createApprovalRule(data: {
    name: string;
    ruleType: 'percentage' | 'specific_approver' | 'hybrid';
    percentageThreshold?: number;
    specificApproverId?: string;
    minAmount: number;
    maxAmount?: number;
  }) {
    const response = await this.client.post('/approval-rules', data);
    return response.data;
  }

  async updateApprovalRule(id: string, data: {
    name: string;
    ruleType: 'percentage' | 'specific_approver' | 'hybrid';
    percentageThreshold?: number;
    specificApproverId?: string;
    minAmount: number;
    maxAmount?: number;
  }) {
    const response = await this.client.put(`/approval-rules/${id}`, data);
    return response.data;
  }

  async toggleApprovalRule(id: string) {
    const response = await this.client.put(`/approval-rules/${id}/toggle`);
    return response.data;
  }

  async deleteApprovalRule(id: string) {
    const response = await this.client.delete(`/approval-rules/${id}`);
    return response.data;
  }

  // Approval Workflows endpoints
  async getApprovalWorkflows(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const response = await this.client.get('/approval-workflows', { params });
    return response.data;
  }

  async getApprovalWorkflow(id: string) {
    const response = await this.client.get(`/approval-workflows/${id}`);
    return response.data;
  }

  async createApprovalWorkflow(data: {
    name: string;
    minAmount: number;
    maxAmount?: number;
    steps: {
      stepOrder: number;
      approverId: string;
      isRequired: boolean;
    }[];
  }) {
    const response = await this.client.post('/approval-workflows', data);
    return response.data;
  }

  async updateApprovalWorkflow(id: string, data: {
    name: string;
    minAmount: number;
    maxAmount?: number;
    steps: {
      stepOrder: number;
      approverId: string;
      isRequired: boolean;
    }[];
  }) {
    const response = await this.client.put(`/approval-workflows/${id}`, data);
    return response.data;
  }

  async toggleApprovalWorkflow(id: string) {
    const response = await this.client.put(`/approval-workflows/${id}/toggle`);
    return response.data;
  }

  async deleteApprovalWorkflow(id: string) {
    const response = await this.client.delete(`/approval-workflows/${id}`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
