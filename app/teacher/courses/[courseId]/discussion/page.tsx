'use client';

import { useParams, useRouter } from 'next/navigation';
import DiscussionBoard from '@/components/DiscussionBoard';

export default function TeacherDiscussionPage() {
	const { courseId } = useParams<{ courseId: string }>();
	const router = useRouter();

	return (
		<div className="max-w-3xl mx-auto pb-16">
			<div className="flex items-center gap-4 mb-6">
				<button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">← Back</button>
			</div>
			<DiscussionBoard courseId={courseId} />
		</div>
	);
}
