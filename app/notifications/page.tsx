'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { BellIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { AppNotification } from '@/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import PaginationControls from '@/components/PaginationControls';

const typeIcon: Record<string, string> = {
	course_approved: '✅',
	course_rejected: '❌',
	new_enrollment: '🎓',
	announcement: '📢',
	quiz_passed: '🏆',
	admin_invite: '🛡️',
	admin_invite_accepted: '✅',
	admin_invite_declined: '↩️',
	teacher_request: '🧑‍🏫',
	teacher_request_approved: '✅',
	teacher_request_rejected: '❌',
};

interface TimestampLike { toDate?: () => Date; _seconds?: number; }
function timeAgo(val: TimestampLike | Date | string | number | null | undefined): string {
	let date: Date;
	if (
		typeof val === 'object' &&
		val !== null &&
		'toDate' in val &&
		typeof val.toDate === 'function'
	) {
		date = val.toDate();
	} else if (val instanceof Date) {
		date = val;
	} else if (typeof val === 'object' && val !== null && val._seconds) {
		date = new Date(val._seconds * 1000);
	} else {
		date = new Date(val as string | number);
	}
	const diff = Math.floor((Date.now() - date.getTime()) / 1000);
	if (diff < 60) return 'just now';
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
	const { user } = useAuth();
	const [notifications, setNotifications] = useState<AppNotification[]>([]);
	const [loading, setLoading] = useState(true);
	const [markingRead, setMarkingRead] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const pageSize = 10;

	useEffect(() => {
		fetchNotifications();
	}, []);

	const fetchNotifications = async () => {
		try {
			const idToken = await user?.getIdToken();
			const res = await fetch('/api/notifications', {
				headers: { Authorization: `Bearer ${idToken}` },
			});
			if (!res.ok) throw new Error('Failed to fetch');
			setNotifications(await res.json());
		} catch {
			toast.error('Failed to load notifications');
		} finally {
			setLoading(false);
		}
	};

	const markAllRead = async () => {
		setMarkingRead(true);
		try {
			const idToken = await user?.getIdToken();
			await fetch('/api/notifications', {
				method: 'POST',
				headers: { Authorization: `Bearer ${idToken}` },
			});
			setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
			toast.success('All marked as read');
		} catch {
			toast.error('Failed to mark as read');
		} finally {
			setMarkingRead(false);
		}
	};

	const unreadCount = notifications.filter((n) => !n.read).length;
	const totalPages = Math.max(1, Math.ceil(notifications.length / pageSize));
	const pagedNotifications = notifications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

	if (loading) {
		return <LoadingSkeleton rows={6} />;
	}

	return (
		<div className="max-w-2xl mx-auto py-8 px-4">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-white flex items-center gap-2">
					<BellIcon className="h-6 w-6" />
					Notifications
					{unreadCount > 0 && (
						<span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
							{unreadCount} unread
						</span>
					)}
				</h1>
				{unreadCount > 0 && (
					<button
						onClick={markAllRead}
						disabled={markingRead}
						className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
					>
						<CheckCircleIcon className="h-4 w-4" />
						Mark all read
					</button>
				)}
			</div>

			{notifications.length === 0 ? (
				<div className="text-center py-16">
					<BellIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
					<p className="text-gray-400">No notifications yet</p>
				</div>
			) : (
				<div className="space-y-2">
					{pagedNotifications.map((n) => {
						const inner = (
							<div
								className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
									n.read
										? 'bg-gray-800 border-gray-700'
										: 'bg-blue-900/20 border-blue-700'
								}`}
							>
								<span className="text-2xl shrink-0">{typeIcon[n.type] ?? '🔔'}</span>
								<div className="flex-1 min-w-0">
									<p className={`font-semibold text-sm ${n.read ? 'text-gray-300' : 'text-white'}`}>
										{n.title}
									</p>
									<p className="text-gray-400 text-sm mt-0.5 truncate">{n.message}</p>
								</div>
								<span className="text-xs text-gray-500 shrink-0">{timeAgo(n.createdAt)}</span>
							</div>
						);

						return n.link ? (
							<Link key={n.id} href={n.link}>{inner}</Link>
						) : (
							<div key={n.id}>{inner}</div>
						);
					})}
				</div>
			)}
			<PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
		</div>
	);
}
