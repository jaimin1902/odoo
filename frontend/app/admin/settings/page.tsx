'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Building, Globe, DollarSign, Users, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CompanyFormData {
  name: string;
  currency: string;
  country: string;
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

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'RS', name: 'Serbia' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'AL', name: 'Albania' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'RU', name: 'Russia' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'GE', name: 'Georgia' },
  { code: 'AM', name: 'Armenia' },
  { code: 'BY', name: 'Belarus' },
  { code: 'MD', name: 'Moldova' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australia' },
  { code: 'CN', name: 'China' },
];

export default function AdminSettingsPage() {
  const { user, company } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormData>({
    defaultValues: {
      name: company?.name || '',
      currency: company?.currency || 'USD',
      country: company?.country || 'US',
    },
  });

  useEffect(() => {
    if (company) {
      setValue('name', company.name);
      setValue('currency', company.currency);
      setValue('country', company.country);
    }
    fetchStats();
  }, [company, setValue]);

  const fetchStats = async () => {
    try {
      const [usersResponse, expensesResponse] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getExpenses()
      ]);

      if (usersResponse.success) {
        setStats(prev => ({ ...prev, totalUsers: usersResponse.data.users.length }));
      }

      if (expensesResponse.success) {
        const expenses = expensesResponse.data.expenses;
        setStats(prev => ({
          ...prev,
          totalExpenses: expenses.length,
          pendingExpenses: expenses.filter((e: any) => e.status === 'pending').length,
          approvedExpenses: expenses.filter((e: any) => e.status === 'approved').length,
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setLoading(true);
      const response = await apiClient.updateCompany(data);
      
      if (response.success) {
        // Refresh the page or show success message
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating company:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your company information and preferences
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-blue-500">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.totalExpenses}</dd>
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
                  <SettingsIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.pendingExpenses}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-purple-500">
                  <Building className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.approvedExpenses}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Company Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label label-required">Company Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('name', { required: 'Company name is required' })}
                    type="text"
                    className={cn('input pl-10', errors.name && 'input-error')}
                    placeholder="Your company name"
                  />
                </div>
                {errors.name && (
                  <p className="form-error">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="label label-required">Default Currency</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    {...register('currency', { required: 'Currency is required' })}
                    className={cn('input pl-10 appearance-none', errors.currency && 'input-error')}
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {errors.currency && (
                  <p className="form-error">{errors.currency.message}</p>
                )}
              </div>

              <div>
                <label className="label label-required">Country</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    {...register('country', { required: 'Country is required' })}
                    className={cn('input pl-10 appearance-none', errors.country && 'input-error')}
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {errors.country && (
                  <p className="form-error">{errors.country.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? (
                    <div className="loading-spinner h-4 w-4 mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Company Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Company Details</h3>
          </div>
          <div className="card-body">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Company ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{company?.id}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {company?.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'N/A'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {company?.updatedAt ? new Date(company.updatedAt).toLocaleDateString() : 'N/A'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Current Currency</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {company?.currency || 'USD'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Country</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {countries.find(c => c.code === company?.country)?.name || 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
