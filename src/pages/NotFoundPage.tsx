import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center text-white p-4">
      <div className="text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}
        >
          💡
        </div>
        <h1 className="text-6xl font-extrabold mb-4" style={{
          background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          404
        </h1>
        <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
        <p className="text-gray-400 mb-8 max-w-sm mx-auto">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
        >
          ← Go to Home
        </Link>
      </div>
    </div>
  );
}
