'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function CourseCouponsPage() {
  const { user } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState({
    code: '',
    discountType: 'percent',
    amount: 10,
    usageLimit: 0,
    expiresAt: '',
    active: true,
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/teacher/courses/${courseId}/coupons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setCoupons(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/teacher/courses/${courseId}/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Coupon saved');
      setForm({ code: '', discountType: 'percent', amount: 10, usageLimit: 0, expiresAt: '', active: true });
      fetchCoupons();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white">Back</button>
        <h1 className="text-2xl font-bold text-white">Coupons</h1>
      </div>

      <form onSubmit={createCoupon} className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-gray-800 rounded-xl p-4">
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="md:col-span-2 bg-gray-700 text-white rounded px-3 py-2" required />
        <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="bg-gray-700 text-white rounded px-3 py-2">
          <option value="percent">Percent</option>
          <option value="fixed">Fixed ($)</option>
        </select>
        <input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="bg-gray-700 text-white rounded px-3 py-2" />
        <input type="number" min={0} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })} className="bg-gray-700 text-white rounded px-3 py-2" placeholder="Usage limit" />
        <button disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2">{saving ? 'Saving...' : 'Save'}</button>

        <div className="md:col-span-6 flex items-center gap-3">
          <label className="text-sm text-gray-300">Expires at</label>
          <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="bg-gray-700 text-white rounded px-3 py-2" />
          <label className="text-sm text-gray-300 flex items-center gap-2">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
          </label>
        </div>
      </form>

      <div className="bg-gray-800 rounded-xl p-4">
        <h2 className="text-white font-semibold mb-3">Existing Coupons</h2>
        {coupons.length === 0 ? (
          <p className="text-gray-400 text-sm">No coupons yet.</p>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="flex justify-between bg-gray-900 rounded px-3 py-2 text-sm">
                <span className="text-white font-mono">{c.code}</span>
                <span className="text-gray-300">{c.discountType === 'percent' ? `${c.amount}%` : `$${c.amount}`} off</span>
                <span className="text-gray-400">used {c.usedCount || 0}{c.usageLimit ? `/${c.usageLimit}` : ''}</span>
                <span className={c.active ? 'text-green-400' : 'text-red-400'}>{c.active ? 'active' : 'inactive'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
