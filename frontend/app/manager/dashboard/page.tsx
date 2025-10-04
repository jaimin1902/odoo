'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  DollarSign,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DashboardStats, Expense } from '@/types';

export default function ManagerDashboard() {
  const { user, company } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard data
        const [statsResponse, expensesResponse, approvalsResponse] = await Promise.all([
          apiClient.getApprovalStats(),
          apiClient.getExpenses({ limit: 5, sortBy: 'submitted_at', sortOrder: 'desc' }),
          apiClient.getPendingApprovals({ limit: 5 })
        ]);

        if (statsResponse.success) {
          setStats(statsResponse.data);
        }

        if (expensesResponse.success) {
          setRecentExpenses(expensesResponse.data.expenses);
        }

        if (approvalsResponse.success) {
          setPendingApprovals(approvalsResponse.data.expenses);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Team Members',
      value: stats?.users?.total || 0,
      icon: Users,
      color: 'bg-blue-500',
      change: '+2',
      changeType: 'positive' as const,
    },  
    {
      name: 'Pending Approvals',
      value: stats?.expenses?.pending || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      change: '-3',
      changeType: 'negative' as const,
    },
    {
      name: 'Approved This Month',
      value: stats?.expenses?.approved || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: '+12',
      changeType: 'positive' as const,
    },
    {
      name: 'Total Amount',
      value: formatCurrency(stats?.expenses?.totalApprovedAmount || 0, company?.currency),
      icon: DollarSign,
      color: 'bg-purple-500',
      change: '+8%',
      changeType: 'positive' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your team's expenses and approvals
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.name} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${card.color}`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {card.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Team Expenses */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Team Expenses</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {recentExpenses.length > 0 ? (
                recentExpenses.map((expense: Expense) => (
                  <div key={expense.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {expense.employee.firstName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {expense.employee.firstName} {expense.employee.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{expense.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amountInCompanyCurrency, company?.currency)}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(expense.submittedAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recent expenses</p>
              )}
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Pending Approvals</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map((expense: Expense) => (
                  <div key={expense.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {expense.employee.firstName} {expense.employee.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{expense.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amountInCompanyCurrency, company?.currency)}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(expense.submittedAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No pending approvals</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/manager/team"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                  <Users className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Manage Team
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  View and manage your team members.
                </p>
              </div>
            </a>

            <a
              href="/manager/approvals"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                  <CheckCircle className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Review Approvals
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Review and approve pending expenses.
                </p>
              </div>
            </a>

            <a
              href="/manager/expenses"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                  <FileText className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Team Expenses
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  View all team expenses and reports.
                </p>
              </div>
            </a>

            <a
              href="/manager/analytics"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-700 ring-4 ring-white">
                  <TrendingUp className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Analytics
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  View team expense analytics and trends.
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
