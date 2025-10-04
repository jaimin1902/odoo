import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AdminExpensesLayout({
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
