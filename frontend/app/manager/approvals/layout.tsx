import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ManagerApprovalsLayout({
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
