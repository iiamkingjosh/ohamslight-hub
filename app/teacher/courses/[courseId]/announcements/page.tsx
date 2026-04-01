'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MegaphoneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { Announcement } from '@/types';

function timeAgo(val: any): string {
	const date = val?.toDate ? val.toDate() : new Date(val?._seconds ? val._seconds * 1000 : val);
	const diff = Math.floor((Date.now() - date.getTime()) / 1000);
	if (diff < 60) return 'just now';
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return date.toLocaleDateString();
}

export default function TeacherAnnouncementsPage() {
	const { courseId } = useParams<{ courseId: string }>();
	const { user } = useAuth();
	const router = useRouter();

	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [loading, setLoading] = useState(true);
	const [posting, setPosting] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState({ title: '', body: '' });

	useEffect(() => {
		fetchAnnouncements();
	}, []);

	const fetchAnnouncements = async () => {
		try {
			const idToken = await user?.getIdToken();
			const res = await fetch(`/api/teacher/courses/${courseId}/announcements`, {
				headers: { Authorization: `Bearer ${idToken}` },
			});
			if (!res.ok) throw new Error((await res.json()).error);
			setAnnouncements(await res.json());
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			setLoading(false);
		}
	};

	const handlePost = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.title.trim() || !form.body.trim()) {
			toast.error('Title and message are required');
			return;
		}
		setPosting(true);
		try {
			const idToken = await user?.getIdToken();
			const res = await fetch(`/api/teacher/courses/${courseId}/announcements`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
				body: JSON.stringify(form),
			});
			if (!res.ok) throw new Error((await res.json()).error);
			toast.success('Announcement posted — students notified!');
			setForm({ title: '', body: '' });
			setShowForm(false);
			fetchAnnouncements();
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			setPosting(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-64">
				<div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto pb-16">
			<div className="flex items-center gap-4 mb-6">
				<button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">← Back</button>
				<h1 className="text-2xl font-bold text-white flex items-center gap-2 flex-1">
					<MegaphoneIcon className="h-6 w-6" /> Announcements
				</h1>
				<button
					onClick={() => setShowForm(!showForm)}
					className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
				>
					{showForm ? 'Cancel' : '+ New'}
				</button>
			</div>

			{showForm && (
				<form onSubmit={handlePost} className="bg-gray-800 rounded-xl p-6 mb-6 space-y-4 border border-blue-700">
					<div>
						<label className="block text-sm text-gray-400 mb-1">Title *</label>
						<input
							type="text"
							value={form.title}
							onChange={(e) => setForm({ ...form, title: e.target.value })}
							placeholder="e.g. New lesson uploaded"
							className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
						/>
					</div>
					<div>
						<label className="block text-sm text-gray-400 mb-1">Message *</label>
						<textarea
							value={form.body}
							onChange={(e) => setForm({ ...form, body: e.target.value })}
							rows={4}
							placeholder="Write your announcement here..."
							className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 resize-none"
						/>
					</div>
					<button
						type="submit"
						disabled={posting}
						className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 rounded-xl transition-colors"
					>
						{posting ? 'Posting...' : 'Post Announcement'}
					</button>
				</form>
			)}

			{announcements.length === 0 ? (
				<div className="text-center py-16">
					<MegaphoneIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
					<p className="text-gray-400">No announcements yet. Post one to notify your students.</p>
				</div>
			) : (
				<div className="space-y-4">
					{announcements.map((a) => (
						<div key={a.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
							<div className="flex items-start justify-between gap-2 mb-2">
								<h2 className="text-white font-semibold">{a.title}</h2>
								<span className="text-xs text-gray-500 shrink-0">{timeAgo(a.createdAt)}</span>
							</div>
							<p className="text-gray-400 text-sm whitespace-pre-wrap">{a.body}</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
