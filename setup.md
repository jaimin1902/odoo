# Expense Reimbursement System - Setup Guide

## 🎉 System is Now Running!

Both the backend and frontend servers are now running successfully:

- **Backend API**: http://localhost:5000
- **Frontend App**: http://localhost:3000

## 🚀 Quick Start

1. **Open your browser** and go to: http://localhost:3000
2. **Create a new account** by clicking "Sign up" or use demo credentials
3. **Login** and you'll be automatically redirected to your role-based dashboard

## 👥 Demo Credentials

Since this is a fresh setup, you'll need to create an account first:

1. Go to http://localhost:3000
2. Click "Sign up" 
3. Fill in the form with your details
4. This will create a new company and make you the admin
5. You can then invite team members from the admin dashboard

## 🏗️ System Architecture

### Backend (Port 5000)
- **Node.js + Express** with PostgreSQL
- **JWT Authentication** with role-based access
- **Multi-level approval workflows**
- **Currency conversion** support
- **Comprehensive API** with 50+ endpoints

### Frontend (Port 3000)
- **Next.js 14** with TypeScript
- **Role-based dashboards** (Admin, Manager, Employee)
- **React Hook Form + Zod** validation
- **Tailwind CSS** for styling
- **Real-time notifications**

## 📊 Role-based Features

### Admin Dashboard
- Company overview and statistics
- User management (create, edit, delete users)
- Approval rules configuration
- Workflow management
- Company settings

### Manager Dashboard
- Team expense oversight
- Approval workflow management
- Team member management
- Expense analytics
- Pending approvals queue

### Employee Dashboard
- Personal expense tracking
- Expense submission
- Status monitoring
- Quick actions
- Activity history

## 🔧 Development Commands

### Backend
```bash
# Start backend server
npm run dev

# Run database migration
npm run migrate

# Reset database (if needed)
node scripts/reset-db.js
```

### Frontend
```bash
# Start frontend server
cd frontend
npm run dev

# Build for production
npm run build
```

## 🗄️ Database

The PostgreSQL database has been set up with:
- **9 core tables** with proper relationships
- **UUID primary keys** for security
- **Comprehensive indexing** for performance
- **Audit trails** with created/updated timestamps
- **Initial data** including expense categories

## 🔐 Security Features

- **JWT Authentication** with secure token storage
- **Role-based Access Control** with granular permissions
- **Password Hashing** using bcryptjs
- **Input Validation** with comprehensive schemas
- **SQL Injection Protection** with parameterized queries
- **CORS Configuration** for controlled access

## 📱 Responsive Design

The system is fully responsive and works on:
- **Desktop** (full dashboard experience)
- **Tablet** (optimized layout)
- **Mobile** (collapsible sidebar, touch-friendly)

## 🎯 Key Features

### Multi-Currency Support
- Automatic currency conversion
- Exchange rate tracking
- Support for 30+ currencies

### Flexible Approval Rules
- **Percentage Rule**: "If 60% of approvers approve → Expense approved"
- **Specific Approver Rule**: "If CFO approves → Expense auto-approved"
- **Hybrid Rule**: "60% OR CFO approves → Expense approved"

### Comprehensive Workflow System
- Sequential approval steps
- Required vs optional approvers
- Automatic workflow progression
- Notification system

## 🐛 Troubleshooting

### If Backend Stops
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill any processes using port 5000
taskkill /f /im node.exe

# Restart backend
npm run dev
```

### If Frontend Has Issues
```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run dev
```

### Database Issues
```bash
# Reset database
node scripts/reset-db.js
npm run migrate
```

## 📞 Support

If you encounter any issues:
1. Check the terminal output for errors
2. Verify both servers are running (ports 3000 and 5000)
3. Check the browser console for frontend errors
4. Ensure PostgreSQL is running

## 🎉 You're All Set!

The expense reimbursement system is now fully functional with:
- ✅ Backend API running on port 5000
- ✅ Frontend app running on port 3000
- ✅ Database migrated and ready
- ✅ Role-based authentication
- ✅ Multi-level approval workflows
- ✅ Responsive design

**Start using the system at: http://localhost:3000**
