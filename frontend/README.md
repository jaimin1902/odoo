# Expense Reimbursement System - Frontend

A modern, responsive frontend for the expense reimbursement system built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

### 🎯 **Core Features**
- **Role-based Authentication**: Secure login/signup with automatic role-based redirection
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Form Validation**: Zod schema validation with React Hook Form
- **Real-time Updates**: Toast notifications and live data updates
- **Modern UI**: Clean, professional interface with Lucide React icons

### 🏗️ **Architecture**
- **Next.js 14**: App Router with TypeScript
- **Authentication**: JWT-based with secure cookie storage
- **State Management**: React Context for auth state
- **API Integration**: Axios-based API client with interceptors
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom component classes

### 👥 **Role-based Dashboards**

#### **Admin Dashboard**
- Company overview and statistics
- User management (create, edit, delete users)
- Approval rules configuration
- Workflow management
- Company settings
- Comprehensive analytics

#### **Manager Dashboard**
- Team expense oversight
- Approval workflow management
- Team member management
- Expense analytics
- Pending approvals queue

#### **Employee Dashboard**
- Personal expense tracking
- Expense submission
- Status monitoring
- Quick actions
- Activity history

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns

## Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Backend API running on port 5000

### Setup Instructions

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp env.local.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_APP_NAME=Expense Reimbursement System
   NEXT_PUBLIC_APP_VERSION=1.0.0
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── auth/                     # Authentication pages
│   │   ├── login/page.tsx        # Login page
│   │   └── signup/page.tsx       # Signup page
│   ├── admin/                    # Admin dashboard
│   │   ├── dashboard/            # Admin dashboard
│   │   ├── users/                # User management
│   │   └── approval-rules/       # Approval rules
│   ├── manager/                  # Manager dashboard
│   │   └── dashboard/            # Manager dashboard
│   ├── employee/                 # Employee dashboard
│   │   └── dashboard/            # Employee dashboard
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # Reusable components
│   └── layout/                   # Layout components
│       ├── DashboardLayout.tsx   # Dashboard wrapper
│       ├── Sidebar.tsx          # Navigation sidebar
│       └── Header.tsx            # Top header
├── contexts/                     # React contexts
│   └── AuthContext.tsx          # Authentication context
├── hooks/                        # Custom hooks
│   ├── useAuth.ts               # Auth hook
│   └── useApi.ts                # API hook
├── lib/                         # Utilities and configurations
│   ├── api.ts                   # API client
│   ├── auth.ts                 # Auth utilities
│   ├── utils.ts                # General utilities
│   └── validations.ts          # Zod schemas
├── types/                       # TypeScript types
│   └── index.ts                # Type definitions
├── package.json                 # Dependencies
├── tailwind.config.js          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── next.config.js              # Next.js configuration
```

## Key Components

### Authentication System
- **Login/Signup**: Form validation with Zod schemas
- **Role-based Redirection**: Automatic dashboard routing based on user role
- **Secure Storage**: JWT tokens stored in HTTP-only cookies
- **Auto-refresh**: Token refresh and session management

### Dashboard Layout
- **Responsive Sidebar**: Collapsible navigation with role-based menu items
- **Header**: User info, notifications, and search
- **Protected Routes**: Role-based access control
- **Loading States**: Skeleton loaders and spinners

### API Integration
- **Axios Client**: Configured with interceptors for auth and error handling
- **Type Safety**: Full TypeScript support for API responses
- **Error Handling**: Centralized error management with toast notifications
- **Loading States**: Built-in loading state management

### Form Handling
- **React Hook Form**: Efficient form state management
- **Zod Validation**: Runtime type checking and validation
- **Error Display**: User-friendly error messages
- **Auto-save**: Form data persistence

## Usage Examples

### Authentication
```typescript
import { useAuth } from '@/hooks/useAuth';

function LoginComponent() {
  const { login, isLoading } = useAuth();
  
  const handleLogin = async (credentials) => {
    try {
      await login(credentials);
      // User will be automatically redirected to their dashboard
    } catch (error) {
      // Error is handled by the auth context
    }
  };
}
```

### API Calls
```typescript
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';

function ExpensesComponent() {
  const { data, loading, execute } = useApi(apiClient.getExpenses);
  
  useEffect(() => {
    execute({ page: 1, limit: 10 });
  }, []);
}
```

### Form Validation
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExpenseSchema } from '@/lib/validations';

function ExpenseForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(createExpenseSchema),
  });
  
  const onSubmit = (data) => {
    // Handle form submission
  };
}
```

## Styling System

### Tailwind CSS Classes
The project uses a comprehensive set of custom Tailwind classes:

```css
/* Buttons */
.btn-primary    /* Primary button */
.btn-secondary  /* Secondary button */
.btn-outline    /* Outline button */

/* Forms */
.input          /* Input field */
.label          /* Form label */
.form-error     /* Error message */

/* Cards */
.card           /* Card container */
.card-header    /* Card header */
.card-body      /* Card body */
.card-footer    /* Card footer */

/* Tables */
.table          /* Table container */
.table-header   /* Table header */
.table-body     /* Table body */
.table-row      /* Table row */
.table-cell     /* Table cell */

/* Badges */
.badge          /* Badge base */
.badge-success  /* Success badge */
.badge-warning  /* Warning badge */
.badge-danger   /* Danger badge */
```

### Component Styling
```typescript
import { cn } from '@/lib/utils';

function Button({ variant, className, ...props }) {
  return (
    <button
      className={cn(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'outline' && 'btn-outline',
        className
      )}
      {...props}
    />
  );
}
```

## Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
```

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Configured with Next.js rules
- **Prettier**: Code formatting (recommended)
- **Husky**: Git hooks for pre-commit checks (optional)

### Best Practices
1. **Type Safety**: Always use TypeScript types
2. **Component Structure**: Follow the established patterns
3. **Error Handling**: Use the centralized error handling
4. **Loading States**: Always show loading indicators
5. **Accessibility**: Use semantic HTML and ARIA attributes

## Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
NEXT_PUBLIC_APP_NAME=Expense Reimbursement System
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Follow the established code patterns
2. Use TypeScript for all new code
3. Add proper error handling
4. Include loading states
5. Test on multiple screen sizes
6. Follow accessibility guidelines

## Support

For issues and questions:
1. Check the console for errors
2. Verify API connectivity
3. Check environment variables
4. Review the browser network tab

## License

MIT License - see LICENSE file for details
