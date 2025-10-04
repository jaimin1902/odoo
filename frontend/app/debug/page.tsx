'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

export default function DebugPage() {
  const { user, company, isAuthenticated } = useAuth();
  const [expenses, setExpenses] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testAPI = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Testing API with user:', user);
      console.log('Company:', company);
      console.log('Is authenticated:', isAuthenticated);
      
      const response = await apiClient.getExpenses();
      console.log('API Response:', response);
      
      setExpenses(response);
    } catch (err) {
      console.error('API Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Auth State:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify({ user, company, isAuthenticated }, null, 2)}
          </pre>
        </div>
        
        <div>
          <button 
            onClick={testAPI}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test API'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 p-4 rounded">
            <h3 className="font-semibold text-red-800">Error:</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {expenses && (
          <div>
            <h2 className="text-lg font-semibold">API Response:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(expenses, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
