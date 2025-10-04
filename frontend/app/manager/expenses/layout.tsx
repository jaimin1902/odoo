import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ManagerExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout requiredRole="manager">
      {children}
    </DashboardLayout>
  );
}
