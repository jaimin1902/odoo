# Expense Reimbursement System

A comprehensive expense reimbursement system with multi-level approval workflows, built with Node.js, Express, and PostgreSQL.

## Features

### Core Features
- **Authentication & User Management**: JWT-based authentication with role-based access control
- **Expense Submission**: Employees can submit expenses with multiple currency support
- **Multi-level Approval Workflows**: Configurable approval chains with conditional rules
- **Flexible Approval Rules**: Percentage-based, specific approver, and hybrid approval rules
- **Real-time Notifications**: Approval requests and status updates
- **Comprehensive Reporting**: Dashboard with statistics and analytics

### User Roles
- **Admin**: Full system access, user management, approval rule configuration
- **Manager**: Team expense approval, team member management
- **Employee**: Expense submission, personal expense tracking

### Approval Workflow Features
- **Manager Approval**: First-level approval by direct manager
- **Multi-step Workflows**: Configurable approval chains
- **Conditional Rules**: 
  - Percentage-based approval (e.g., 60% of approvers must approve)
  - Specific approver rules (e.g., CFO approval required)
  - Hybrid rules (combining percentage and specific approver)
- **Currency Support**: Multi-currency expenses with automatic conversion

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Password Hashing**: bcryptjs

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd expense-reimbursement-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=expense_reimbursement
   DB_USER=your_username
   DB_PASSWORD=your_password

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=7d

   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Currency API (for exchange rates)
   CURRENCY_API_KEY=your_currency_api_key_here
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb expense_reimbursement
   
   # Run migrations
   npm run migrate
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User signup (creates company and admin)
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile

### User Management
- `GET /api/users` - Get all users (Admin/Manager)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user (Admin)
- `PUT /api/users/:id` - Update user (Admin)
- `DELETE /api/users/:id` - Delete user (Admin)
- `GET /api/users/team/members` - Get team members (Manager)
- `GET /api/users/managers/list` - Get managers list (Admin)

### Expense Management
- `GET /api/expenses` - Get expenses with filters
- `GET /api/expenses/:id` - Get expense by ID
- `POST /api/expenses` - Create new expense (Employee)
- `PUT /api/expenses/:id` - Update expense (Employee)
- `DELETE /api/expenses/:id` - Delete expense (Employee)
- `GET /api/expenses/categories/list` - Get expense categories
- `GET /api/expenses/stats/summary` - Get expense statistics

### Approval Management
- `GET /api/approvals/pending` - Get pending approvals (Manager/Admin)
- `GET /api/approvals/expense/:expenseId/history` - Get approval history
- `POST /api/approvals/:expenseId/decision` - Approve/reject expense
- `GET /api/approvals/notifications` - Get approval notifications
- `PUT /api/approvals/notifications/:notificationId/read` - Mark notification as read
- `GET /api/approvals/stats/summary` - Get approval statistics
- `POST /api/approvals/:expenseId/override` - Override approval (Admin)

### Company Management
- `GET /api/companies/info` - Get company information
- `PUT /api/companies/info` - Update company information (Admin)
- `GET /api/companies/stats` - Get company statistics (Admin)
- `GET /api/companies/dashboard` - Get dashboard data (Admin)

### Approval Rules Management
- `GET /api/approval-rules` - Get approval rules (Admin)
- `GET /api/approval-rules/:id` - Get approval rule by ID (Admin)
- `POST /api/approval-rules` - Create approval rule (Admin)
- `PUT /api/approval-rules/:id` - Update approval rule (Admin)
- `PUT /api/approval-rules/:id/toggle` - Toggle rule status (Admin)
- `DELETE /api/approval-rules/:id` - Delete approval rule (Admin)

### Approval Workflows Management
- `GET /api/approval-workflows` - Get approval workflows (Admin)
- `GET /api/approval-workflows/:id` - Get workflow by ID (Admin)
- `POST /api/approval-workflows` - Create approval workflow (Admin)
- `PUT /api/approval-workflows/:id` - Update approval workflow (Admin)
- `PUT /api/approval-workflows/:id/toggle` - Toggle workflow status (Admin)
- `DELETE /api/approval-workflows/:id` - Delete approval workflow (Admin)

## Database Schema

### Core Tables
- **companies**: Company information and settings
- **users**: User accounts with roles and relationships
- **expenses**: Expense claims with currency conversion
- **expense_categories**: Predefined expense categories
- **expense_approvals**: Individual approval decisions
- **approval_rules**: Conditional approval rules
- **approval_workflows**: Multi-step approval workflows
- **approval_workflow_steps**: Steps within workflows
- **approval_notifications**: Notification system

## Usage Examples

### 1. User Signup (Creates Company and Admin)
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "securepassword",
    "firstName": "John",
    "lastName": "Doe",
    "country": "US"
  }'
```

### 2. Create Employee
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "employee@company.com",
    "password": "password123",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "employee",
    "managerId": "manager-uuid",
    "isManagerApprover": false
  }'
```

### 3. Submit Expense
```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 150.00,
    "currency": "USD",
    "categoryId": "category-uuid",
    "description": "Business lunch with client",
    "expenseDate": "2024-01-15",
    "receiptUrl": "https://example.com/receipt.jpg"
  }'
```

### 4. Approve Expense
```bash
curl -X POST http://localhost:5000/api/approvals/expense-uuid/decision \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "approved",
    "comments": "Approved for business expense"
  }'
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions based on user roles
- **Password Hashing**: bcryptjs for secure password storage
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive request validation using Joi
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Controlled cross-origin requests
- **Helmet Security**: HTTP security headers

## Development

### Project Structure
```
├── database/
│   └── schema.sql          # Database schema
├── middleware/
│   ├── auth.js            # Authentication middleware
│   └── errorHandler.js    # Error handling middleware
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── users.js           # User management routes
│   ├── expenses.js        # Expense management routes
│   ├── approvals.js       # Approval management routes
│   ├── companies.js       # Company management routes
│   ├── approval-rules.js  # Approval rules routes
│   └── approval-workflows.js # Workflow management routes
├── scripts/
│   └── migrate.js         # Database migration script
├── utils/
│   ├── validation.js      # Validation schemas
│   ├── currency.js        # Currency conversion utilities
│   └── approval.js        # Approval workflow utilities
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

### Running in Development
```bash
npm run dev
```

### Database Migration
```bash
npm run migrate
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please open an issue in the repository.
