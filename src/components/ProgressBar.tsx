'use client';

interface ProgressBarProps {
  currentQuestion: number; 
  total: number;
  labels: string[];
}

export default function ProgressBar({ currentQuestion, total, labels }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        {labels.map((label, idx) => {
          const isDone = idx < currentQuestion;
          const isActive = idx === currentQuestion;
          const isFuture = idx > currentQuestion;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center relative">
              {/* Connector line (not on last) */}
              {idx < total - 1 && (
                <div
                  className="absolute top-4 left-1/2 w-full h-0.5 transition-colors duration-500"
                  style={{
                    background: isDone ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                    zIndex: 0,
                  }}
                />
              )}

              {/* Circle */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                  isDone
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : isActive
                    ? 'bg-blue-600 text-white ring-4 ring-blue-500/30 shadow-lg shadow-blue-600/40'
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </div>

              {/* Label */}
              <span
                className={`mt-2 text-center text-xs px-1 leading-tight transition-colors duration-300 ${
                  isActive
                    ? 'text-blue-400 font-semibold'
                    : isDone
                    ? 'text-blue-300'
                    : 'text-gray-600'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress line */}
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${(currentQuestion / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
