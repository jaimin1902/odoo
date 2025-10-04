'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Calendar, DollarSign, FileText, Tag, User, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, getStatusIcon } from '@/lib/utils';
import { Expense } from '@/types';

export default function ExpenseDetailPage() {
  const { user, company } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchExpense(params.id as string);
    }
  }, [params.id]);

  const fetchExpense = async (expenseId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.getExpense(expenseId);
      
      if (response.success) {
        setExpense(response.data.expense);
      } else {
        router.push('/employee/expenses');
      }
    } catch (error) {
      console.error('Error fetching expense:', error);
      router.push('/employee/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        const response = await apiClient.deleteExpense(expense!.id);
        if (response.success) {
          router.push('/employee/expenses');
        }
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900">Expense not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The expense you're looking for doesn't exist or you don't have access to it.
        </p>
        <div className="mt-6">
          <Link href="/employee/expenses" className="btn btn-primary">
            Back to Expenses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/employee/expenses" className="p-2 text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
            <p className="mt-1 text-sm text-gray-500">
              {expense.description}
            </p>
          </div>
        </div>
        
        {expense.status === 'pending' && (
          <div className="flex items-center space-x-2">
            <Link
              href={`/employee/expenses/${expense.id}/edit`}
              className="btn btn-outline"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
            <button
              onClick={handleDeleteExpense}
              className="btn btn-danger"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Expense Information</h3>
            </div>
            <div className="card-body">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{expense.description}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">{expense.category.name}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Amount</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatCurrency(expense.amount, expense.currency)}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Amount in Company Currency</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatCurrency(expense.amountInCompanyCurrency, company?.currency)}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Exchange Rate</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {expense.exchangeRate.toFixed(6)}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Expense Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(expense.expenseDate)}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Submitted At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(expense.submittedAt)}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(expense.updatedAt)}
                  </dd>
                </div>
              </dl>
              
              {expense.notes && (
                <div className="mt-6">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">{expense.notes}</dd>
                </div>
              )}
              
              {expense.receiptUrl && (
                <div className="mt-6">
                  <dt className="text-sm font-medium text-gray-500">Receipt</dt>
                  <dd className="mt-1">
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                    >
                      View Receipt
                    </a>
                  </dd>
                </div>
              )}
            </div>
          </div>

          {/* Approval History */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Approval History</h3>
            </div>
            <div className="card-body">
              <div className="flow-root">
                <ul className="-mb-8">
                  <li>
                    <div className="relative pb-8">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                            <Clock className="h-4 w-4 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              Expense submitted for approval
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {formatDate(expense.submittedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  
                  {expense.status !== 'pending' && (
                    <li>
                      <div className="relative">
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                              expense.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                            }`}>
                              {expense.status === 'approved' ? (
                                <span className="text-white text-sm">✓</span>
                              ) : (
                                <span className="text-white text-sm">✗</span>
                              )}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                Expense {expense.status}
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {formatDate(expense.updatedAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Status</h3>
            </div>
            <div className="card-body">
              <div className="flex items-center">
                <span className={`badge ${getStatusColor(expense.status)}`}>
                  {getStatusIcon(expense.status)} {expense.status}
                </span>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  {expense.status === 'pending' && 'Your expense is waiting for approval.'}
                  {expense.status === 'approved' && 'Your expense has been approved and will be reimbursed.'}
                  {expense.status === 'rejected' && 'Your expense has been rejected. Please review and resubmit if needed.'}
                  {expense.status === 'partially_approved' && 'Your expense has been partially approved.'}
                </p>
              </div>
            </div>
          </div>

          {/* Employee Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Employee</h3>
            </div>
            <div className="card-body">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {expense.employee.firstName} {expense.employee.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{expense.employee.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="card-body space-y-3">
              <Link href="/employee/expenses" className="btn btn-outline w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Expenses
              </Link>
              
              {expense.status === 'pending' && (
                <Link
                  href={`/employee/expenses/${expense.id}/edit`}
                  className="btn btn-primary w-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Expense
                </Link>
              )}
              
              {expense.receiptUrl && (
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Receipt
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
