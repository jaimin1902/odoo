export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'employee';
  isActive: boolean;
  isManagerApprover?: boolean;
  manager?: {
    firstName: string;
    lastName: string;
  };
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  currency: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  amountInCompanyCurrency: number;
  exchangeRate: number;
  description: string;
  expenseDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'partially_approved';
  submittedAt: string;
  updatedAt: string;
  receiptUrl?: string;
  notes?: string;
  category: {
    id: string;
    name: string;
  };
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Approval {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approvedAt?: string;
  approver: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface ApprovalRule {
  id: string;
  name: string;
  ruleType: 'percentage' | 'specific_approver' | 'hybrid';
  percentageThreshold?: number;
  specificApprover?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  minAmount: number;
  maxAmount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  minAmount: number;
  maxAmount?: number;
  isActive: boolean;
  stepCount: number;
  createdAt: string;
  updatedAt: string;
  steps: ApprovalWorkflowStep[];
}

export interface ApprovalWorkflowStep {
  id: string;
  stepOrder: number;
  isRequired: boolean;
  approver: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface Notification {
  id: string;
  type: 'approval_request' | 'approval_reminder' | 'approval_completed';
  isRead: boolean;
  createdAt: string;
  expense: {
    id: string;
    amount: number;
    currency: string;
    amountInCompanyCurrency: number;
    description: string;
    expenseDate: string;
    employee: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    [key: string]: T[];
    pagination: PaginationMeta;
  };
}

export interface DashboardStats {
  expenses: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalApprovedAmount: number;
    totalPendingAmount: number;
    averageApprovedAmount: number;
  };
  users: {
    total: number;
    admins: number;
    managers: number;
    employees: number;
    active: number;
  };
  approvals: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}

export interface AuthState {
  user: User | null;
  company: Company | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager';
  managerId?: string;
  isManagerApprover?: boolean;
}

export interface CreateExpenseData {
  amount: number;
  currency: string;
  categoryId: string;
  description: string;
  expenseDate: string;
  receiptUrl?: string;
  notes?: string;
}

export interface ApprovalDecision {
  status: 'approved' | 'rejected';
  comments?: string;
}
