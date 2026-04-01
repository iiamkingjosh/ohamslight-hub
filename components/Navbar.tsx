'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import toast from 'react-hot-toast';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
  const { user, userData } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          { href: '/superadmin/audit-logs', label: 'Audit Logs' },
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
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
          <img src="/logo-icon.svg" alt="OhamsLight Hub" width={32} height={32} className="h-8 w-8" />
          <span className="text-xl font-bold text-white">OhamsLight Hub</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden md:block"><ThemeToggle /></div>
            <div className="hidden md:block"><NotificationBell /></div>
            <button
              type="button"
              className="md:hidden rounded p-1 hover:bg-gray-800"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <div className="hidden md:flex md:items-center md:justify-end md:gap-4 mt-3">
          {getNavLinks().map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-blue-400 text-sm ${pathname === link.href ? 'text-blue-400' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/chat" className="hover:text-blue-400 text-sm">Messages</Link>
          <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 text-sm">Logout</button>
        </div>

        {mobileOpen && (
          <div className="md:hidden mt-3 rounded-lg border border-gray-800 bg-gray-950 p-3 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <ThemeToggle />
              <NotificationBell />
            </div>
            {getNavLinks().map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded px-2 py-1.5 text-sm hover:bg-gray-800 ${pathname === link.href ? 'text-blue-400' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/chat" onClick={() => setMobileOpen(false)} className="block rounded px-2 py-1.5 text-sm hover:bg-gray-800">Messages</Link>
            <button onClick={handleLogout} className="w-full text-left rounded px-2 py-1.5 text-sm bg-red-600 hover:bg-red-700">Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}