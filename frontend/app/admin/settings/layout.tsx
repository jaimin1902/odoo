import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AdminSettingsLayout({
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
