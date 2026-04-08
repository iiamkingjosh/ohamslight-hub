'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuditLog } from '@/types';
import toast from 'react-hot-toast';

function formatTimestamp(value: AuditLog['timestamp']): string {
  let date: Date;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'object' && value !== null && '_seconds' in value && typeof value._seconds === 'number') {
    date = new Date(value._seconds * 1000);
  } else {
    date = new Date(String(value));
  }

  return date.toLocaleString();
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/audit-logs', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogs(data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap">{log.action}</td>
                <td className="px-6 py-4 whitespace-nowrap">{log.performedBy}</td>
                <td className="px-6 py-4 whitespace-nowrap">{log.targetUser}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}