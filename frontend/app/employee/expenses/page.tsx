'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Eye, Edit, Trash2, Calendar, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, getStatusIcon } from '@/lib/utils';
import { Expense, PaginationMeta } from '@/types';

export default function EmployeeExpensesPage() {
  const { user, company } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  const fetchExpenses = async (page = 1, search = '', status = '', category = '') => {
    try {
      setLoading(true);
      const response = await apiClient.getExpenses({
        page,
        limit: 10,
        sortBy: 'submitted_at',
        sortOrder: 'desc',
        status: status || undefined,
        categoryId: category || undefined
      });

      if (response.success) {
        setExpenses(response.data.expenses);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.getExpenseCategories();
      if (response.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    fetchExpenses(1, value, statusFilter, categoryFilter);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    fetchExpenses(1, searchTerm, status, categoryFilter);
  };

  const handleCategoryFilter = (category: string) => {
    setCategoryFilter(category);
    fetchExpenses(1, searchTerm, statusFilter, category);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        const response = await apiClient.deleteExpense(expenseId);
        if (response.success) {
          fetchExpenses();
        }
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const getStatusCounts = () => {
    const counts = {
      total: expenses.length,
      pending: expenses.filter(e => e.status === 'pending').length,
      approved: expenses.filter(e => e.status === 'approved').length,
      rejected: expenses.filter(e => e.status === 'rejected').length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage your expense claims
          </p>
        </div>
        <Link href="/employee/expenses/new" className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Submit Expense
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-blue-500">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{statusCounts.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-yellow-500">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{statusCounts.pending}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-green-500">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{statusCounts.approved}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-red-500">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Rejected</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{statusCounts.rejected}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="partially_approved">Partially Approved</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => handleCategoryFilter(e.target.value)}
                className="input"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card">
        <div className="overflow-hidden">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Description</th>
                <th className="table-header-cell">Category</th>
                <th className="table-header-cell">Amount</th>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Submitted</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {expenses.length > 0 ? (
                expenses.map((expense) => (
                  <tr key={expense.id} className="table-row">
                    <td className="table-cell">
                      <div className="text-sm font-medium text-gray-900">
                        {expense.description}
                      </div>
                      {expense.notes && (
                        <div className="text-sm text-gray-500 mt-1">
                          {expense.notes}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {expense.category.name}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amountInCompanyCurrency, company?.currency)}
                      </div>
                      {expense.currency !== company?.currency && (
                        <div className="text-sm text-gray-500">
                          {expense.amount} {expense.currency}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {formatDate(expense.expenseDate)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${getStatusColor(expense.status)}`}>
                        {getStatusIcon(expense.status)} {expense.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {formatDate(expense.submittedAt)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/employee/expenses/${expense.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {expense.status === 'pending' && (
                          <>
                            <Link
                              href={`/employee/expenses/${expense.id}/edit`}
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="table-cell text-center py-8">
                    <div className="text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by submitting your first expense.
                      </p>
                      <div className="mt-6">
                        <Link href="/employee/expenses/new" className="btn btn-primary">
                          <Plus className="h-4 w-4 mr-2" />
                          Submit Expense
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="card-footer">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => fetchExpenses(pagination.page - 1, searchTerm, statusFilter, categoryFilter)}
                  className="btn btn-outline btn-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  disabled={pagination.page === pagination.pages}
                  onClick={() => fetchExpenses(pagination.page + 1, searchTerm, statusFilter, categoryFilter)}
                  className="btn btn-outline btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
