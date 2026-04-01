interface LoadingSkeletonProps {
  rows?: number;
}

export default function LoadingSkeleton({ rows = 4 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}
