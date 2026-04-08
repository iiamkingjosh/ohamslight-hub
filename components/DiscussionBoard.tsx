'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatBubbleLeftRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { DiscussionThread, DiscussionReply, TimestampValue } from '@/types';

function timeAgo(val: TimestampValue): string {
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
	} else if (typeof val === 'object' && val !== null && '_seconds' in val && typeof val._seconds === 'number') {
		date = new Date(val._seconds * 1000);
	} else {
		date = new Date(String(val));
	}
	const diff = Math.floor((Date.now() - date.getTime()) / 1000);
	if (diff < 60) return 'just now';
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return date.toLocaleDateString();
}

interface ThreadWithReplies extends DiscussionThread {
	replies?: DiscussionReply[];
	repliesLoaded?: boolean;
}

interface Props {
	courseId: string;
}

export default function DiscussionBoard({ courseId }: Props) {
	const { user } = useAuth();
	const [threads, setThreads] = useState<ThreadWithReplies[]>([]);
	const [loading, setLoading] = useState(true);
	const [showNewForm, setShowNewForm] = useState(false);
	const [newThread, setNewThread] = useState({ title: '', body: '' });
	const [posting, setPosting] = useState(false);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [replyBody, setReplyBody] = useState('');
	const [submittingReply, setSubmittingReply] = useState(false);

	useEffect(() => {
		fetchThreads();
	}, []);

	const fetchThreads = async () => {
		try {
			const idToken = await user?.getIdToken();
			const res = await fetch(`/api/courses/${courseId}/discussions`, {
				headers: { Authorization: `Bearer ${idToken}` },
			});
			if (!res.ok) throw new Error((await res.json()).error);
			setThreads(await res.json());
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to load discussions');
		} finally {
			setLoading(false);
		}
	};

	const handlePostThread = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newThread.title.trim() || !newThread.body.trim()) {
			toast.error('Title and message are required');
			return;
		}
		setPosting(true);
		try {
			const idToken = await user?.getIdToken();
			const res = await fetch(`/api/courses/${courseId}/discussions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
				body: JSON.stringify(newThread),
			});
			if (!res.ok) throw new Error((await res.json()).error);
			toast.success('Thread posted!');
			setNewThread({ title: '', body: '' });
			setShowNewForm(false);
			fetchThreads();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to post thread');
		} finally {
			setPosting(false);
		}
	};

	const toggleThread = async (thread: ThreadWithReplies) => {
		if (expandedId === thread.id) {
			setExpandedId(null);
			return;
		}
		setExpandedId(thread.id!);
		if (thread.repliesLoaded) return;

		try {
			const idToken = await user?.getIdToken();
			const res = await fetch(`/api/courses/${courseId}/discussions/${thread.id}/reply`, {
				headers: { Authorization: `Bearer ${idToken}` },
			});
			if (!res.ok) throw new Error('Failed to load replies');
			const data = await res.json();
			setThreads((prev) =>
				prev.map((t) =>
					t.id === thread.id
						? { ...t, replies: data.replies, repliesLoaded: true }
						: t
				)
			);
		} catch {
			toast.error('Could not load replies');
		}
	};

	const handleReply = async (threadId: string) => {
		if (!replyBody.trim()) {
			toast.error('Reply cannot be empty');
			return;
		}
		setSubmittingReply(true);
		try {
			const idToken = await user?.getIdToken();
			const res = await fetch(`/api/courses/${courseId}/discussions/${threadId}/reply`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
				body: JSON.stringify({ body: replyBody }),
			});
			if (!res.ok) throw new Error((await res.json()).error);
			toast.success('Reply posted!');
			setReplyBody('');
			// Reload replies for this thread
			const idToken2 = await user?.getIdToken();
			const res2 = await fetch(`/api/courses/${courseId}/discussions/${threadId}/reply`, {
				headers: { Authorization: `Bearer ${idToken2}` },
			});
			if (res2.ok) {
				const data = await res2.json();
				setThreads((prev) =>
					prev.map((t) =>
						t.id === threadId
							? { ...t, replies: data.replies, replyCount: data.replies.length, repliesLoaded: true }
							: t
					)
				);
			}
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to post reply');
		} finally {
			setSubmittingReply(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-40">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
			</div>
		);
	}

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-xl font-bold text-white flex items-center gap-2">
					<ChatBubbleLeftRightIcon className="h-5 w-5" />
					Discussion Board
				</h2>
				<button
					onClick={() => setShowNewForm(!showNewForm)}
					className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
				>
					{showNewForm ? 'Cancel' : '+ New Thread'}
				</button>
			</div>

			{/* New Thread Form */}
			{showNewForm && (
				<form onSubmit={handlePostThread} className="bg-gray-800 rounded-xl p-5 mb-6 space-y-3 border border-blue-700">
					<input
						type="text"
						value={newThread.title}
						onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
						placeholder="Thread title..."
						className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
					/>
					<textarea
						value={newThread.body}
						onChange={(e) => setNewThread({ ...newThread, body: e.target.value })}
						rows={3}
						placeholder="Describe your question or topic..."
						className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 resize-none text-sm"
					/>
					<button
						type="submit"
						disabled={posting}
						className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded-xl text-sm transition-colors"
					>
						{posting ? 'Posting...' : 'Post Thread'}
					</button>
				</form>
			)}

			{/* Thread List */}
			{threads.length === 0 ? (
				<div className="text-center py-12">
					<ChatBubbleLeftRightIcon className="h-10 w-10 text-gray-600 mx-auto mb-2" />
					<p className="text-gray-400">No discussions yet. Start the conversation!</p>
				</div>
			) : (
				<div className="space-y-3">
					{threads.map((thread) => {
						const isExpanded = expandedId === thread.id;
						return (
							<div key={thread.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
								{/* Thread header */}
								<button
									onClick={() => toggleThread(thread)}
									className="w-full text-left p-5 hover:bg-gray-700/50 transition-colors"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											<h3 className="text-white font-semibold text-sm">{thread.title}</h3>
											<p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{thread.body}</p>
											<div className="flex items-center gap-3 mt-2">
												<span className="text-xs text-blue-400">{thread.authorName}</span>
												<span className="text-xs text-gray-500">{timeAgo(thread.createdAt)}</span>
												<span className="text-xs text-gray-500">
													{thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
												</span>
											</div>
										</div>
										{isExpanded
											? <ChevronUpIcon className="h-4 w-4 text-gray-400 shrink-0" />
											: <ChevronDownIcon className="h-4 w-4 text-gray-400 shrink-0" />
										}
									</div>
								</button>

								{/* Expanded: full body + replies */}
								{isExpanded && (
									<div className="border-t border-gray-700 px-5 pb-5">
										<p className="text-gray-300 text-sm py-4 whitespace-pre-wrap">{thread.body}</p>

										{/* Replies */}
										{(thread.replies ?? []).length > 0 && (
											<div className="space-y-3 mb-4 ml-4 border-l-2 border-gray-700 pl-4">
												{thread.replies!.map((reply) => (
													<div key={reply.id}>
														<div className="flex items-center gap-2 mb-1">
															<span className="text-xs font-semibold text-blue-400">{reply.authorName}</span>
															<span className="text-xs text-gray-500">{timeAgo(reply.createdAt)}</span>
														</div>
														<p className="text-gray-300 text-sm whitespace-pre-wrap">{reply.body}</p>
													</div>
												))}
											</div>
										)}

										{/* Reply form */}
										<div className="flex gap-3 mt-3">
											<textarea
												value={replyBody}
												onChange={(e) => setReplyBody(e.target.value)}
												rows={2}
												placeholder="Write a reply..."
												className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500 resize-none"
											/>
											<button
												onClick={() => handleReply(thread.id!)}
												disabled={submittingReply}
												className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold self-end transition-colors"
											>
												{submittingReply ? '...' : 'Reply'}
											</button>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
