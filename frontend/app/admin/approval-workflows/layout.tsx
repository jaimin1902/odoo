import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AdminApprovalWorkflowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout requiredRole="admin">
      {children}
    </DashboardLayout>
  );
}
