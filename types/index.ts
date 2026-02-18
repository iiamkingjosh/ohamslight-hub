export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'student';

export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  phone: string;
  email: string;
  role: UserRole;
  deleted: boolean;
  profileCompleted: boolean;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface AuditLog {
  id?: string;
  action: string;          // e.g., 'create-admin', 'delete-admin', 'restore-admin'
  performedBy: string;      // uid of superadmin
  targetUser: string;       // uid of affected user
  metadata?: any;
  timestamp: Date;
}