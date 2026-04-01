'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { BellIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function NotificationBell() {
	const { user } = useAuth();
	const [unreadCount, setUnreadCount] = useState(0);

	useEffect(() => {
		if (!user) return;
		const q = query(
			collection(db, 'notifications', user.uid, 'items'),
			where('read', '==', false)
		);
		const unsub = onSnapshot(q, (snap) => setUnreadCount(snap.size));
		return () => unsub();
	}, [user]);

	return (
		<Link href="/notifications" className="relative hover:text-blue-400 flex items-center">
			<BellIcon className="h-6 w-6" />
			{unreadCount > 0 && (
				<span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold leading-none">
					{unreadCount > 9 ? '9+' : unreadCount}
				</span>
			)}
		</Link>
	);
}
