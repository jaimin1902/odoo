'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ApprovalRule, PaginationMeta } from '@/types';

export default function AdminApprovalRulesPage() {
  const { user: currentUser } = useAuth();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await apiClient.getApprovalRules({
        page,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      if (response.success) {
        setRules(response.data.rules);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching approval rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // TODO: Implement search functionality
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      const response = await apiClient.toggleApprovalRule(ruleId);
      if (response.success) {
        // Refresh rules list
        fetchRules();
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Are you sure you want to delete this approval rule?')) {
      try {
        const response = await apiClient.deleteApprovalRule(ruleId);
        if (response.success) {
          // Refresh rules list
          fetchRules();
        }
      } catch (error) {
        console.error('Error deleting rule:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Rules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure conditional approval rules for expenses
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <button className="btn btn-outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="card">
        <div className="overflow-hidden">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Conditions</th>
                <th className="table-header-cell">Amount Range</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Created</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {rules?.map((rule: ApprovalRule) => (
                <tr key={rule.id} className="table-row">
                  <td className="table-cell">
                    <div className="text-sm font-medium text-gray-900">
                      {rule.name}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-info">
                      {rule.ruleType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">
                      {rule.ruleType === 'percentage' && (
                        <span>{rule.percentageThreshold}% approval required</span>
                      )}
                      {rule.ruleType === 'specific_approver' && rule.specificApprover && (
                        <span>Requires {rule.specificApprover.firstName} {rule.specificApprover.lastName}</span>
                      )}
                      {rule.ruleType === 'hybrid' && (
                        <span>{rule.percentageThreshold}% OR {rule.specificApprover?.firstName} {rule.specificApprover?.lastName}</span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(rule.minAmount)} - {rule.maxAmount ? formatCurrency(rule.maxAmount as number) : 'No limit'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className="flex items-center"
                    >
                      {rule.isActive ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                      )}
                      <span className={`ml-2 badge ${rule.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {formatDate(rule.createdAt)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
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
                  onClick={() => fetchRules(pagination.page - 1, searchTerm)}
                  className="btn btn-outline btn-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  disabled={pagination.page === pagination.pages}
                  onClick={() => fetchRules(pagination.page + 1, searchTerm)}
                  className="btn btn-outline btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <CreateRuleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchRules();
          }}
        />
      )}
    </div>
  );
}

// Create Rule Modal Component
function CreateRuleModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    ruleType: 'percentage' as 'percentage' | 'specific_approver' | 'hybrid',
    percentageThreshold: 60,
    specificApproverId: '',
    minAmount: 0,
    maxAmount: '',
  });
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await apiClient.getManagers();
      if (response.success) {
        setManagers(response.data.managers);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : undefined,
      };
      
      const response = await apiClient.createApprovalRule(submitData);
      if (response.success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating rule:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Create Approval Rule</h3>
            </div>
            
            <div className="card-body space-y-4">
              <div>
                <label className="label label-required">Rule Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., High-value expense approval"
                  required
                />
              </div>

              <div>
                <label className="label label-required">Rule Type</label>
                <select
                  value={formData.ruleType}
                  onChange={(e) => setFormData({ ...formData, ruleType: e.target.value as any })}
                  className="input"
                  required
                >
                  <option value="percentage">Percentage Approval</option>
                  <option value="specific_approver">Specific Approver</option>
                  <option value="hybrid">Hybrid (Percentage OR Specific Approver)</option>
                </select>
              </div>

              {formData.ruleType === 'percentage' && (
                <div>
                  <label className="label label-required">Percentage Threshold</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.percentageThreshold}
                    onChange={(e) => setFormData({ ...formData, percentageThreshold: parseInt(e.target.value) })}
                    className="input"
                    required
                  />
                </div>
              )}

              {(formData.ruleType === 'specific_approver' || formData.ruleType === 'hybrid') && (
                <div>
                  <label className="label label-required">Specific Approver</label>
                  <select
                    value={formData.specificApproverId}
                    onChange={(e) => setFormData({ ...formData, specificApproverId: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select an approver</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.firstName} {manager.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label label-required">Minimum Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minAmount}
                    onChange={(e) => setFormData({ ...formData, minAmount: parseFloat(e.target.value) })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Maximum Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.maxAmount}
                    onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                    className="input"
                    placeholder="No limit"
                  />
                </div>
              </div>
            </div>

            <div className="card-footer">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? (
                    <div className="loading-spinner h-4 w-4 mr-2" />
                  ) : null}
                  {loading ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
