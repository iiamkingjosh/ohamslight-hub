'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (!loading && userData) {
      router.push(`/${userData.role}`);
    }
  }, [user, userData, loading, router]);

  if (!loading && user && !userData) {
    return (
      <div className="max-w-xl mx-auto mt-20 rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
        <h2 className="text-lg font-semibold mb-2">Profile access issue</h2>
        <p>
          Your account is signed in, but your profile record could not be loaded.
          Contact support or ask an admin to restore your user profile in Firestore.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}