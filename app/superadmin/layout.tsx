'use client';

import RoleGuard from '@/components/RoleGuard';

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['superadmin']}>
      {children}
    </RoleGuard>
  );
}