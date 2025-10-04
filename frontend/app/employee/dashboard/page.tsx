'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  DollarSign,
  Clock,
  AlertCircle,
  Plus,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, getStatusIcon } from '@/lib/utils';
import { Expense } from '@/types';

export default function EmployeeDashboard() {
  const { user, company } = useAuth();
  const [myExpenses, setMyExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch my expenses
        const expensesResponse = await apiClient.getExpenses({ 
          limit: 5, 
          sortBy: 'submitted_at', 
          sortOrder: 'desc' 
        });

        if (expensesResponse.success) {
          setMyExpenses(expensesResponse.data.expenses);
          
          // Calculate stats
          const expenses = expensesResponse.data.expenses;
          const total = expenses.length;
          const pending = expenses.filter((e: Expense) => e.status === 'pending').length;
          const approved = expenses.filter((e: Expense) => e.status === 'approved').length;
          const rejected = expenses.filter((e: Expense) => e.status === 'rejected').length;
          const totalAmount = expenses
            .filter((e: Expense) => e.status === 'approved')
            .reduce((sum: number, e: Expense) => sum + e.amountInCompanyCurrency, 0);

          setStats({
            total,
            pending,
            approved,
            rejected,
            totalAmount,
          });
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
      name: 'Total Expenses',
      value: stats.total,
      icon: FileText,
      color: 'bg-blue-500',
      change: '+2',
      changeType: 'positive' as const,
    },
    {
      name: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'bg-yellow-500',
      change: '-1',
      changeType: 'negative' as const,
    },
    {
      name: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: '+3',
      changeType: 'positive' as const,
    },
    {
      name: 'Total Amount',
      value: formatCurrency(stats.totalAmount, company?.currency),
      icon: DollarSign,
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'positive' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your expenses and reimbursement status
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
        {/* Recent Expenses */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Expenses</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {myExpenses.length > 0 ? (
                myExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-lg">{getStatusIcon(expense.status)}</span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {expense.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {expense.category.name} • {formatDate(expense.expenseDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amountInCompanyCurrency, company?.currency)}
                      </p>
                      <span className={`badge ${getStatusColor(expense.status)}`}>
                        {expense.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by submitting your first expense.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <a
                href="/employee/expenses/new"
                className="group relative flex items-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 text-primary-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-primary-900">Submit New Expense</h4>
                  <p className="text-sm text-primary-700">Create a new expense claim</p>
                </div>
              </a>

              <a
                href="/employee/expenses"
                className="group relative flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-gray-900">View All Expenses</h4>
                  <p className="text-sm text-gray-700">See all your expense claims</p>
                </div>
              </a>

              <a
                href="/employee/analytics"
                className="group relative flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-gray-900">Expense Analytics</h4>
                  <p className="text-sm text-gray-700">View your spending patterns</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {myExpenses.length > 0 ? (
              myExpenses.slice(0, 3).map((expense) => (
                <div key={expense.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {getStatusIcon(expense.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{expense.description}</span>
                      <span className="ml-2 text-gray-500">
                        {formatCurrency(expense.amountInCompanyCurrency, company?.currency)}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(expense.submittedAt)} • {expense.category.name}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`badge ${getStatusColor(expense.status)}`}>
                      {expense.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your expense activity will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
