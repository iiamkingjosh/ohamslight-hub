'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    const initialEmail = new URLSearchParams(window.location.search).get('email');
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setLoading(true);
    try {
      // Check if email exists in the database first
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error('Something went wrong. Please try again.');
        return;
      }

      if (!data.exists) {
        setEmailError('No account found with this email address.');
        return;
      }

      // Email exists — send the reset link
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
      toast.success('Password reset email sent');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-center mb-8">
        <img src="/logo-full.svg" alt="OhamsLight Hub" className="h-12 w-auto" />
      </div>
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Reset your password</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Enter your account email and we&apos;ll send you a link to reset your password.
      </p>

      {sent ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6 text-center space-y-3">
          <p className="text-green-800 dark:text-green-300 font-medium">Check your inbox</p>
          <p className="text-green-700 dark:text-green-400 text-sm">
            A password reset link has been sent to <strong>{email}</strong>.
          </p>
          <button
            type="button"
            onClick={() => { setSent(false); setEmail(''); }}
            className="text-sm text-blue-600 hover:underline"
          >
            Send to a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div>
            <label className="block mb-1 text-gray-700 dark:text-gray-300">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              required
              placeholder="you@example.com"
              className={`w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                emailError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
          >
            {loading ? 'Checking...' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
        Remembered it?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
