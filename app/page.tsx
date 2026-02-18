import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl font-bold mb-6">Welcome to OhamsLight Hub</h1>
      <p className="text-xl mb-8 max-w-2xl">
        A comprehensive platform for learning and collaboration.
      </p>
      <div className="space-x-4">
        <Link
          href="/login"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
        >
          Register
        </Link>
      </div>
    </div>
  );
}