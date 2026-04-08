'use client';
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import toast from 'react-hot-toast';
import { FirebaseError } from 'firebase/app';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'email') {
      setEmailStatus('idle');
    }
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const checkEmailAvailability = async (email: string): Promise<boolean | null> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setEmailStatus('idle');
      return null;
    }

    setEmailStatus('checking');
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEmailStatus('error');
        return null;
      }

      if (data.exists) {
        setEmailStatus('taken');
        return false;
      }

      setEmailStatus('available');
      return true;
    } catch {
      setEmailStatus('error');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const isAvailable = await checkEmailAvailability(form.email);
    if (isAvailable === false) {
      toast.error('This email already has an account. Use login or reset your password.');
      router.push(`/forgot-password?email=${encodeURIComponent(form.email.trim())}`);
      return;
    }

    if (isAvailable === null) {
      toast.error('Unable to verify email availability. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const idToken = await userCred.user.getIdToken();
      const profileRes = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          phone: form.phone,
        }),
      });

      if (!profileRes.ok) {
        await userCred.user.delete();
        const errorBody = await profileRes.json().catch(() => ({ error: 'Failed to create user profile' }));
        throw new Error(errorBody.error || 'Failed to create user profile');
      }

      toast.success('Account created! Please log in.');
      router.push('/login');
    } catch (error: unknown) {
      if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
        toast.error('This email already has an account. Use login or reset your password.');
        router.push(`/forgot-password?email=${encodeURIComponent(form.email)}`);
      } else {
        const message = error instanceof Error ? error.message : 'Registration failed';
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-center mb-8">
        <img src="/logo-full.svg" alt="OhamsLight Hub" className="h-12 w-auto" />
      </div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Join OhamsLight Hub</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-gray-700 dark:text-gray-300">First Name</label>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block mb-1 text-gray-700 dark:text-gray-300">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-300">Username</label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-300">Phone (optional)</label>
          <PhoneInput
            country={'us'}
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
            enableSearch
            countryCodeEditable={false}
            placeholder="Enter your phone number"
            inputClass="!w-full !h-[42px] !pr-3 !pl-14 !border !border-gray-300 dark:!border-gray-600 !rounded !bg-white dark:!bg-gray-700 !text-gray-900 dark:!text-white focus:!outline-none focus:!ring-2 focus:!ring-blue-500"
            buttonClass="!border-gray-300 dark:!border-gray-600 !bg-white dark:!bg-gray-700"
            dropdownClass="!z-[60]"
            containerClass="w-full"
          />
        </div>

        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-300">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            onBlur={() => {
              void checkEmailAvailability(form.email);
            }}
            required
            className={`w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              emailStatus === 'taken'
                ? 'border-red-500 dark:border-red-500'
                : emailStatus === 'available'
                  ? 'border-green-500 dark:border-green-500'
                  : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {emailStatus === 'checking' && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Checking email availability...</p>
          )}
          {emailStatus === 'available' && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">Email is available.</p>
          )}
          {emailStatus === 'taken' && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">Email already exists.</p>
          )}
          {emailStatus === 'error' && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">Could not verify email right now. Please retry.</p>
          )}
        </div>

        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-300">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-300">Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || emailStatus === 'checking'}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>
      <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}