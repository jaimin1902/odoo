'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  User, 
  DollarSign, 
  Calendar, 
  FileText,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { cn, formatCurrency, formatDate, getStatusColor, getStatusIcon } from '@/lib/utils';
import { approvalDecisionSchema } from '@/lib/validations';
import { Expense, PaginationMeta } from '@/types';

interface ApprovalDecision {
  status: 'approved' | 'rejected';
  comments?: string;
}

export default function ManagerApprovalsPage() {
  const { user, company } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject'>('approve');
  const [processing, setProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApprovalDecision>({
    resolver: zodResolver(approvalDecisionSchema),
  });

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async (page = 1) => {
    try {
      setLoading(true);
      const response = await apiClient.getPendingApprovals({
        page,
        limit: 10,
        sortBy: 'submitted_at',
        sortOrder: 'asc'
      });

      if (response.success) {
        setExpenses(response.data.expenses);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
  };

  const handleApprove = (expense: Expense) => {
    setSelectedExpense(expense);
    setDecisionType('approve');
    setShowDecisionModal(true);
    reset({ status: 'approved', comments: '' });
  };

  const handleReject = (expense: Expense) => {
    setSelectedExpense(expense);
    setDecisionType('reject');
    setShowDecisionModal(true);
    reset({ status: 'rejected', comments: '' });
  };

  const onSubmitDecision = async (data: ApprovalDecision) => {
    if (!selectedExpense) return;

    try {
      setProcessing(true);
      console.log('Submitting approval decision:', { expenseId: selectedExpense.id, data });
      
      const response = await apiClient.makeApprovalDecision(selectedExpense.id, data);
      console.log('Approval decision response:', response);
      
      if (response.success) {
        setShowDecisionModal(false);
        setSelectedExpense(null);
        fetchPendingApprovals();
      } else {
        console.error('API returned error:', response.message);
        alert('Failed to process approval: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error making approval decision:', error);
      alert('Error processing approval: ' + (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const getUrgencyLevel = (expense: Expense) => {
    const daysSinceSubmitted = Math.floor(
      (Date.now() - new Date(expense.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceSubmitted >= 7) return 'high';
    if (daysSinceSubmitted >= 3) return 'medium';
    return 'low';
  };

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and approve expense claims from your team members
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-yellow-500">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{expenses.length}</dd>
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
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Overdue</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {expenses.filter(e => getUrgencyLevel(e) === 'high').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-blue-500">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Amount</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(
                      expenses.reduce((sum, e) => sum + e.amountInCompanyCurrency, 0),
                      company?.currency
                    )}
                  </dd>
                </dl>
              </div>
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
                <th className="table-header-cell">Employee</th>
                <th className="table-header-cell">Description</th>
                <th className="table-header-cell">Amount</th>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Urgency</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {expenses.length > 0 ? (
                expenses.map((expense) => {
                  const urgency = getUrgencyLevel(expense);
                  return (
                    <tr key={expense.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-primary-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {expense.employee.firstName} {expense.employee.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{expense.employee.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm font-medium text-gray-900">
                          {expense.description}
                        </div>
                        <div className="text-sm text-gray-500">{expense.category.name}</div>
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
                        <div className="text-sm text-gray-900">
                          {formatDate(expense.expenseDate)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Submitted {formatDate(expense.submittedAt)}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${
                          urgency === 'high' ? 'badge-danger' :
                          urgency === 'medium' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {urgency === 'high' ? 'Overdue' :
                           urgency === 'medium' ? 'Due Soon' : 'Normal'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewExpense(expense)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleApprove(expense)}
                            className="p-2 text-green-600 hover:text-green-800"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(expense)}
                            className="p-2 text-red-600 hover:text-red-800"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="table-cell text-center py-8">
                    <div className="text-center">
                      <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No pending approvals</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        All expense claims have been reviewed.
                      </p>
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
                  onClick={() => fetchPendingApprovals(pagination.page - 1)}
                  className="btn btn-outline btn-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  disabled={pagination.page === pagination.pages}
                  onClick={() => fetchPendingApprovals(pagination.page + 1)}
                  className="btn btn-outline btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {showDecisionModal && selectedExpense && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDecisionModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit(onSubmitDecision)}>
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">
                    {decisionType === 'approve' ? 'Approve Expense' : 'Reject Expense'}
                  </h3>
                </div>
                
                <div className="card-body space-y-4">
                  {/* Expense Details */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Expense Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Employee:</span>
                        <span className="ml-2 font-medium">
                          {selectedExpense.employee.firstName} {selectedExpense.employee.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <span className="ml-2 font-medium">
                          {formatCurrency(selectedExpense.amountInCompanyCurrency, company?.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Description:</span>
                        <span className="ml-2 font-medium">{selectedExpense.description}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <span className="ml-2 font-medium">{formatDate(selectedExpense.expenseDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Decision Form */}
                  <div>
                    <label className="label label-required">
                      {decisionType === 'approve' ? 'Approval Comments' : 'Rejection Reason'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MessageSquare className="h-5 w-5 text-gray-400" />
                      </div>
                      <textarea
                        {...register('comments')}
                        rows={4}
                        className={cn('input pl-10', errors.comments && 'input-error')}
                        placeholder={
                          decisionType === 'approve' 
                            ? 'Add any comments about this approval...' 
                            : 'Please provide a reason for rejection...'
                        }
                      />
                    </div>
                    {errors.comments && (
                      <p className="form-error">{errors.comments.message}</p>
                    )}
                  </div>
                </div>

                <div className="card-footer">
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowDecisionModal(false)}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className={`btn ${
                        decisionType === 'approve' ? 'btn-success' : 'btn-danger'
                      }`}
                    >
                      {processing ? (
                        <div className="loading-spinner h-4 w-4 mr-2" />
                      ) : decisionType === 'approve' ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      {processing ? 'Processing...' : 
                       decisionType === 'approve' ? 'Approve' : 'Reject'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
