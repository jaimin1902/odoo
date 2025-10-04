'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

export default function TestAuthPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    try {
      setLoading(true);
      const response = await apiClient.login({
        email: 'admin@company.com',
        password: 'password123'
      });
      setResult({ type: 'login', data: response });
    } catch (error) {
      setResult({ type: 'login', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testExpenses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getExpenses();
      setResult({ type: 'expenses', data: response });
    } catch (error) {
      setResult({ type: 'expenses', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      <div className="space-y-4">
        <button 
          onClick={testLogin}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 mr-2"
        >
          {loading ? 'Testing...' : 'Test Login'}
        </button>
        
        <button 
          onClick={testExpenses}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Expenses API'}
        </button>
        
        {result && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold">Result:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
