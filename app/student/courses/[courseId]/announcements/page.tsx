'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MegaphoneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { Announcement, TimestampValue } from '@/types';

function timeAgo(val: TimestampValue): string {
	const date = val?.toDate ? val.toDate() : new Date(val?._seconds ? val._seconds * 1000 : val);
	const diff = Math.floor((Date.now() - date.getTime()) / 1000);
	if (diff < 60) return 'just now';
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return date.toLocaleDateString();
}

export default function StudentAnnouncementsPage() {
	const { courseId } = useParams<{ courseId: string }>();
	const { user } = useAuth();
	const router = useRouter();
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchAnnouncements();
	}, []);

	const fetchAnnouncements = async () => {
		try {
			const idToken = await user?.getIdToken();
			const res = await fetch(`/api/student/courses/${courseId}/announcements`, {
				headers: { Authorization: `Bearer ${idToken}` },
			});
			if (!res.ok) throw new Error((await res.json()).error);
			setAnnouncements(await res.json());
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to load announcements');
		} finally {
			setLoading(false);
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
				<h1 className="text-2xl font-bold text-white flex items-center gap-2">
					<MegaphoneIcon className="h-6 w-6" /> Announcements
				</h1>
			</div>

			{announcements.length === 0 ? (
				<div className="text-center py-16">
					<MegaphoneIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
					<p className="text-gray-400">No announcements from your instructor yet.</p>
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
