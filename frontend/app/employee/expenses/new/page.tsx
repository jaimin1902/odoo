'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, Calendar, DollarSign, FileText, Tag } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { createExpenseSchema } from '@/lib/validations';
import { cn } from '@/lib/utils';

interface ExpenseFormData {
  amount: number;
  currency: string;
  categoryId: string;
  description: string;
  expenseDate: string;
  receiptUrl?: string;
  notes?: string;
}

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин' },
  { code: 'MKD', name: 'Macedonian Denar', symbol: 'ден' },
  { code: 'ALL', name: 'Albanian Lek', symbol: 'L' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Mark', symbol: 'КМ' },
  { code: 'MNT', name: 'Mongolian Tugrik', symbol: '₮' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
  { code: 'UZS', name: 'Uzbekistani Som', symbol: 'сўм' },
  { code: 'KGS', name: 'Kyrgyzstani Som', symbol: 'сом' },
  { code: 'TJS', name: 'Tajikistani Somoni', symbol: 'сом' },
  { code: 'TMT', name: 'Turkmenistani Manat', symbol: 'T' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾' },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏' },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br' },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L' },
];

export default function NewExpensePage() {
  const { user, company } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      currency: company?.currency || 'USD',
      expenseDate: new Date().toISOString().split('T')[0],
    },
  });

  const selectedCurrency = watch('currency');
  const selectedAmount = watch('amount');

  useEffect(() => {
    fetchCategories();
  }, []);

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

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      // In a real application, you would upload to a cloud storage service
      // For now, we'll simulate the upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockUrl = `https://example.com/receipts/${Date.now()}-${file.name}`;
      setValue('receiptUrl', mockUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      setLoading(true);
      console.log('Submitting expense data:', data);
      console.log('User:', user);
      console.log('Company:', company);
      
      const response = await apiClient.createExpense(data);
      console.log('Create expense response:', response);
      
      if (response.success) {
        router.push('/employee/expenses');
      } else {
        console.error('API returned error:', response.message);
        alert('Failed to create expense: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Error creating expense: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCurrencyData = currencies.find(c => c.code === selectedCurrency);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/employee/expenses" className="p-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit New Expense</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new expense claim for reimbursement
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Expense Details</h3>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label className="label label-required">Description</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('description')}
                      type="text"
                      className={cn('input pl-10', errors.description && 'input-error')}
                      placeholder="e.g., Business lunch with client"
                    />
                  </div>
                  {errors.description && (
                    <p className="form-error">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="label label-required">Category</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      {...register('categoryId')}
                      className={cn('input pl-10 appearance-none', errors.categoryId && 'input-error')}
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.categoryId && (
                    <p className="form-error">{errors.categoryId.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className={cn('input', errors.notes && 'input-error')}
                    placeholder="Additional notes or comments..."
                  />
                  {errors.notes && (
                    <p className="form-error">{errors.notes.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Amount Information */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Amount & Currency</h3>
              </div>
              <div className="card-body space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label label-required">Amount</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('amount', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        className={cn('input pl-10', errors.amount && 'input-error')}
                        placeholder="0.00"
                      />
                    </div>
                    {errors.amount && (
                      <p className="form-error">{errors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="label label-required">Currency</label>
                    <select
                      {...register('currency')}
                      className={cn('input', errors.currency && 'input-error')}
                    >
                      {currencies.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code} - {currency.name}
                        </option>
                      ))}
                    </select>
                    {errors.currency && (
                      <p className="form-error">{errors.currency.message}</p>
                    )}
                  </div>
                </div>

                {selectedCurrency !== company?.currency && selectedAmount && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <div className="text-sm text-blue-800">
                      <strong>Estimated conversion:</strong> {selectedAmount} {selectedCurrency} ≈ 
                      <span className="font-medium">
                        {selectedAmount * 0.85} {company?.currency}
                      </span>
                      <br />
                      <span className="text-xs text-blue-600">
                        * Final amount will be calculated using current exchange rates
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Date Information */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Date & Receipt</h3>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label className="label label-required">Expense Date</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('expenseDate')}
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      className={cn('input pl-10', errors.expenseDate && 'input-error')}
                    />
                  </div>
                  {errors.expenseDate && (
                    <p className="form-error">{errors.expenseDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Receipt Upload</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file);
                            }}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                      {uploading && (
                        <div className="flex items-center justify-center">
                          <div className="loading-spinner h-4 w-4 mr-2" />
                          <span className="text-sm text-gray-500">Uploading...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Expense Summary</h3>
              </div>
              <div className="card-body">
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Amount</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {selectedAmount ? `${selectedAmount} ${selectedCurrency}` : 'Not specified'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Company Currency</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {company?.currency || 'USD'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Status</dt>
                    <dd className="text-sm font-medium text-gray-900">Will be submitted for approval</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <Link href="/employee/expenses" className="btn btn-outline">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
          >
            {loading ? (
              <div className="loading-spinner h-5 w-5 mr-2" />
            ) : null}
            {loading ? 'Submitting...' : 'Submit Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
