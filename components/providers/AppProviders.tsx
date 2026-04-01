'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Toaster } from 'react-hot-toast';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <main className="container mx-auto p-4">{children}</main>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
