'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import type { Certificate } from '@/types';

function toDateSafe(value: Certificate['issuedAt']): Date {
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object' && value !== null && '_seconds' in value && typeof value._seconds === 'number') {
    return new Date(value._seconds * 1000);
  }

  return new Date(String(value));
}

export default function CertificatePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    fetchCertificate();
  }, []);

  const fetchCertificate = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/student/courses/${courseId}/certificate`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch certificate');
      const data = await res.json();
      setCertificate(data);
    } catch {
      toast.error('Could not load certificate');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-white mb-2">No Certificate Yet</h2>
        <p className="text-gray-400 mb-6">
          Complete the course quiz with a passing score to earn your certificate.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push(`/student/courses/${courseId}/quiz`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl transition-colors"
          >
            Take the Quiz
          </button>
          <button
            onClick={() => router.back()}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-xl transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const issuedDate = toDateSafe(certificate.issuedAt);

  const formattedDate = issuedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #certificate, #certificate * { visibility: visible !important; }
          #certificate { position: fixed !important; top: 0; left: 0; width: 100vw; height: 100vh; }
          #no-print { display: none !important; }
        }
      `}</style>

      {/* Actions bar — hidden on print */}
      <div id="no-print" className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white flex-1">Your Certificate</h1>
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          Download / Print PDF
        </button>
      </div>

      {/* Certificate */}
      <div id="certificate" className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-8 border-double border-blue-800">
          {/* Header band */}
          <div className="bg-linear-to-r from-blue-800 to-indigo-900 px-10 py-6 text-center text-balance">
            <p className="text-blue-200 text-sm font-semibold uppercase tracking-[0.2em] mb-1">
              OhamsLight Hub
            </p>
            <h1 className="text-3xl font-extrabold text-white tracking-wide">
              Certificate of Completion
            </h1>
          </div>

          {/* Body */}
          <div className="px-12 py-10 text-center">
            <p className="text-gray-500 text-base mb-3">This is to certify that</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              {certificate.studentName}
            </h2>

            <div className="w-24 h-1 bg-blue-700 mx-auto mb-6 rounded-full" />

            <p className="text-gray-500 text-base mb-2">has successfully completed the course</p>
            <h3 className="text-2xl font-bold text-blue-800 mb-8">
              &ldquo;{certificate.courseName}&rdquo;
            </h3>

            <p className="text-gray-400 text-sm mb-12">
              Awarded on <span className="font-semibold text-gray-600">{formattedDate}</span>
            </p>

            {/* Signature line */}
            <div className="flex justify-around items-end gap-8">
              <div className="text-center">
                <div className="border-t border-gray-400 w-40 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Platform Director</p>
                <p className="text-sm font-semibold text-gray-700">OhamsLight Hub</p>
              </div>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-800 to-indigo-900 shadow-lg">
                <span className="text-white font-bold text-xl">✓</span>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 w-40 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Issued on</p>
                <p className="text-sm font-semibold text-gray-700">{formattedDate}</p>
              </div>
            </div>
          </div>

          {/* Footer band */}
          <div className="bg-linear-to-r from-blue-800 to-indigo-900 px-10 py-3 text-center text-balance">
            <p className="text-blue-300 text-xs">
              Certificate ID: {certificate.studentUid?.slice(0, 8).toUpperCase()}
              {certificate.courseId?.slice(0, 6).toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
