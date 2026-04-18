'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ViolationBannerProps {
  count: number; // current warning count (1/2/3)
  maxCount: number;
  type: 'tab_switch' | 'fullscreen_exit';
  onDismiss?: () => void;
}

export default function ViolationBanner({
  count,
  maxCount,
  type,
  onDismiss,
}: ViolationBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 6000);
    return () => clearTimeout(t);
  }, [count, type, onDismiss]);

  if (!visible) return null;

  const isLast = count >= maxCount - 1;
  const typeName = type === 'tab_switch' ? 'Tab Switch' : 'Fullscreen Exit';

  return (
    <div
      className="violation-banner fixed top-0 left-0 right-0 z-50"
      role="alert"
    >
      <div
        className={`mx-auto max-w-3xl mt-3 mx-3 rounded-xl border p-4 flex items-start gap-3 shadow-2xl ${
          isLast
            ? 'bg-red-950/90 border-red-500/50 backdrop-blur-md'
            : 'bg-amber-950/90 border-amber-500/50 backdrop-blur-md'
        }`}
      >
        <AlertTriangle
          className={`w-5 h-5 mt-0.5 shrink-0 ${isLast ? 'text-red-400' : 'text-amber-400'}`}
        />
        <div className="flex-1">
          <p className={`font-bold text-sm ${isLast ? 'text-red-300' : 'text-amber-300'}`}>
            {isLast
              ? `⚠️ Final Warning (${count}/${maxCount}) — ${typeName} Detected`
              : `Warning ${count}/${maxCount} — ${typeName} Detected`}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isLast
              ? 'Next violation will auto-submit your answers immediately!'
              : 'Continued violations will result in automatic submission of your answers.'}
          </p>
        </div>
        <button
          onClick={() => { setVisible(false); onDismiss?.(); }}
          className="text-gray-500 hover:text-gray-300 transition-colors p-0.5 rounded"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
