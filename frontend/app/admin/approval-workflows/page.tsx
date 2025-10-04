'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, ToggleLeft, ToggleRight, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ApprovalWorkflow, PaginationMeta } from '@/types';

export default function AdminApprovalWorkflowsPage() {
  const { user: currentUser } = useAuth();
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await apiClient.getApprovalWorkflows({
        page,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      if (response.success) {
        setWorkflows(response.data.workflows);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching approval workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // TODO: Implement search functionality
  };

  const handleToggleWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.toggleApprovalWorkflow(workflowId);
      if (response.success) {
        fetchWorkflows();
      }
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (confirm('Are you sure you want to delete this approval workflow?')) {
      try {
        const response = await apiClient.deleteApprovalWorkflow(workflowId);
        if (response.success) {
          fetchWorkflows();
        }
      } catch (error) {
        console.error('Error deleting workflow:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure multi-step approval processes for expenses
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Workflow
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
                  placeholder="Search workflows..."
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

      {/* Workflows Table */}
      <div className="card">
        <div className="overflow-hidden">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Steps</th>
                <th className="table-header-cell">Amount Range</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Created</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {workflows?.map((workflow: ApprovalWorkflow) => (
                <tr key={workflow.id} className="table-row">
                  <td className="table-cell">
                    <div className="text-sm font-medium text-gray-900">
                      {workflow.name}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {workflow.steps?.length || 0} steps
                      </span>
                    </div>
                    {workflow.steps && workflow.steps.length > 0 && (
                      <div className="mt-1 flex items-center space-x-1">
                        {workflow.steps.slice(0, 3).map((step, index) => (
                          <div key={step.id} className="flex items-center">
                            <span className="text-xs text-gray-500">
                              {step.approver.firstName} {step.approver.lastName}
                            </span>
                            {index < workflow.steps.length - 1 && index < 2 && (
                              <ArrowRight className="h-3 w-3 text-gray-400 mx-1" />
                            )}
                          </div>
                        ))}
                        {workflow.steps.length > 3 && (
                          <span className="text-xs text-gray-500">+{workflow.steps.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(workflow.minAmount)} - {workflow.maxAmount ? formatCurrency(workflow.maxAmount) : 'No limit'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleToggleWorkflow(workflow.id)}
                      className="flex items-center"
                    >
                      {workflow.isActive ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                      )}
                      <span className={`ml-2 badge ${workflow.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {formatDate(workflow.createdAt)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(workflow.id)}
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
                  onClick={() => fetchWorkflows(pagination.page - 1, searchTerm)}
                  className="btn btn-outline btn-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  disabled={pagination.page === pagination.pages}
                  onClick={() => fetchWorkflows(pagination.page + 1, searchTerm)}
                  className="btn btn-outline btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <CreateWorkflowModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchWorkflows();
          }}
        />
      )}
    </div>
  );
}

// Create Workflow Modal Component
function CreateWorkflowModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    minAmount: 0,
    maxAmount: '',
    steps: [] as Array<{ stepOrder: number; approverId: string; isRequired: boolean }>,
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

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { stepOrder: formData.steps.length + 1, approverId: '', isRequired: true }]
    });
  };

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index)
    });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : undefined,
      };
      
      const response = await apiClient.createApprovalWorkflow(submitData);
      if (response.success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Create Approval Workflow</h3>
            </div>
            
            <div className="card-body space-y-4">
              <div>
                <label className="label label-required">Workflow Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., High-value expense workflow"
                  required
                />
              </div>

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

              <div>
                <label className="label label-required">Approval Steps</label>
                <div className="space-y-3">
                  {formData.steps.map((step, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-md">
                      <span className="text-sm font-medium text-gray-500">Step {index + 1}</span>
                      <select
                        value={step.approverId}
                        onChange={(e) => updateStep(index, 'approverId', e.target.value)}
                        className="input flex-1"
                        required
                      >
                        <option value="">Select an approver</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.firstName} {manager.lastName}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={step.isRequired}
                          onChange={(e) => updateStep(index, 'isRequired', e.target.checked)}
                          className="rounded"
                        />
                        <span className="ml-2 text-sm text-gray-500">Required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addStep}
                    className="btn btn-outline w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </button>
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
                  disabled={loading || formData.steps.length === 0}
                  className="btn btn-primary"
                >
                  {loading ? (
                    <div className="loading-spinner h-4 w-4 mr-2" />
                  ) : null}
                  {loading ? 'Creating...' : 'Create Workflow'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
