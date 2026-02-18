'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, userData } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const getNavLinks = () => {
    if (!userData) return [];
    switch (userData.role) {
      case 'superadmin':
        return [
          { href: '/superadmin', label: 'Dashboard' },
          { href: '/superadmin/create-admin', label: 'Create Admin' },
          { href: '/superadmin/manage-admins', label: 'Manage Admins' },
          { href: '/superadmin/audit-logs', label: 'Audit Logs' }, // optional
        ];
      case 'admin':
  return [
          { href: '/admin', label: 'Dashboard' },
          { href: '/admin/courses', label: 'Courses' },
          { href: '/admin/users', label: 'Users' },
        ];
      case 'teacher':
  return [
    { href: '/teacher', label: 'Dashboard' },
    { href: '/teacher/courses', label: 'My Courses' },
    { href: '/teacher/create-course', label: 'Create Course' },
    ];
      case 'student':
        return [
          { href: '/student', label: 'Dashboard' },
          { href: '/student/marketplace', label: 'Marketplace' },
          { href: '/student/my-learning', label: 'My Learning' },
        ];
      default:
        return [];
    }
  };

  if (!user) return null;

  return (
    <nav className="bg-gray-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          OhamsLight Hub
        </Link>
        <div className="flex space-x-4 items-center">
          {getNavLinks().map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-blue-400 ${
                pathname === link.href ? 'text-blue-400' : ''
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}