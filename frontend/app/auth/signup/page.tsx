'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Globe, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signupSchema } from '@/lib/validations';
import { cn } from '@/lib/utils';

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  country: string;
}

const countries = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'SE', name: 'Sweden', currency: 'SEK' },
  { code: 'NO', name: 'Norway', currency: 'NOK' },
  { code: 'DK', name: 'Denmark', currency: 'DKK' },
  { code: 'PL', name: 'Poland', currency: 'PLN' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK' },
  { code: 'HU', name: 'Hungary', currency: 'HUF' },
  { code: 'RO', name: 'Romania', currency: 'RON' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN' },
  { code: 'HR', name: 'Croatia', currency: 'HRK' },
  { code: 'RS', name: 'Serbia', currency: 'RSD' },
  { code: 'MK', name: 'North Macedonia', currency: 'MKD' },
  { code: 'AL', name: 'Albania', currency: 'ALL' },
  { code: 'BA', name: 'Bosnia and Herzegovina', currency: 'BAM' },
  { code: 'MN', name: 'Mongolia', currency: 'MNT' },
  { code: 'UA', name: 'Ukraine', currency: 'UAH' },
  { code: 'RU', name: 'Russia', currency: 'RUB' },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT' },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS' },
  { code: 'KG', name: 'Kyrgyzstan', currency: 'KGS' },
  { code: 'TJ', name: 'Tajikistan', currency: 'TJS' },
  { code: 'TM', name: 'Turkmenistan', currency: 'TMT' },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN' },
  { code: 'GE', name: 'Georgia', currency: 'GEL' },
  { code: 'AM', name: 'Armenia', currency: 'AMD' },
  { code: 'BY', name: 'Belarus', currency: 'BYN' },
  { code: 'MD', name: 'Moldova', currency: 'MDL' },
];

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signup, isLoading, user } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Redirect based on user role
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'manager') {
        router.push('/manager/dashboard');
      } else if (user.role === 'employee') {
        router.push('/employee/dashboard');
      }
    }
  }, [user, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  const selectedCountry = watch('country');
  const selectedCountryData = countries.find(c => c.code === selectedCountry);

  const onSubmit = async (data: SignupFormData) => {
    console.log("🚀 ~ onSubmit ~ data:", data)
    try {
      await signup(data);
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your company account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/auth/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="label label-required">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('firstName')}
                    type="text"
                    autoComplete="given-name"
                    className={cn(
                      'input pl-10',
                      errors.firstName && 'input-error'
                    )}
                    placeholder="John"
                  />
                </div>
                {errors.firstName && (
                  <p className="form-error">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="label label-required">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('lastName')}
                    type="text"
                    autoComplete="family-name"
                    className={cn(
                      'input pl-10',
                      errors.lastName && 'input-error'
                    )}
                    placeholder="Doe"
                  />
                </div>
                {errors.lastName && (
                  <p className="form-error">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label label-required">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className={cn(
                    'input pl-10',
                    errors.email && 'input-error'
                  )}
                  placeholder="john@company.com"
                />
              </div>
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="country" className="label label-required">
                Country
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  {...register('country')}
                  className={cn(
                    'input pl-10 appearance-none',
                    errors.country && 'input-error'
                  )}
                >
                  <option value="">Select your country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.currency})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {selectedCountryData && (
                <p className="form-help">
                  Your company currency will be set to {selectedCountryData.currency}
                </p>
              )}
              {errors.country && (
                <p className="form-error">{errors.country.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label label-required">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn(
                    'input pl-10 pr-10',
                    errors.password && 'input-error'
                  )}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label label-required">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn(
                    'input pl-10 pr-10',
                    errors.confirmPassword && 'input-error'
                  )}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="form-error">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full btn-lg"
            >
              {isLoading ? (
                <div className="loading-spinner h-5 w-5 mr-2" />
              ) : (
                <ArrowRight className="h-5 w-5 mr-2" />
              )}
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="mt-6">
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="text-sm text-blue-800">
                <strong>Note:</strong> Creating an account will automatically create a new company with you as the admin. 
                You'll be able to invite team members and configure approval workflows after signup.
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
