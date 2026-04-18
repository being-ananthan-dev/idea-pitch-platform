'use client';

import { useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Clock } from 'lucide-react';

interface TimerProps {
  questionStartTime: Timestamp | null;
  allowedTime: number; // seconds
  onExpire: () => void;
}

export default function Timer({ questionStartTime, allowedTime, onExpire }: TimerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef = useRef(false);
  const displayRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    expiredRef.current = false;

    const tick = () => {
      if (!questionStartTime) return;

      const startMs = questionStartTime.toMillis();
      const remaining = allowedTime - Math.floor((Date.now() - startMs) / 1000);

      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        if (displayRef.current) displayRef.current.textContent = '0:00';
        if (containerRef.current) {
          containerRef.current.classList.add('timer-danger');
        }
        onExpire();
        return;
      }

      const clampedRemaining = Math.max(0, remaining);
      const mins = Math.floor(clampedRemaining / 60);
      const secs = clampedRemaining % 60;
      if (displayRef.current) {
        displayRef.current.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      }

      if (containerRef.current) {
        if (clampedRemaining <= 15) {
          containerRef.current.classList.add('timer-danger');
          containerRef.current.style.color = '#EF4444';
        } else {
          containerRef.current.classList.remove('timer-danger');
          containerRef.current.style.color = '';
        }
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [questionStartTime, allowedTime, onExpire]);

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-2 font-mono text-3xl font-bold tracking-widest"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <Clock className="w-7 h-7 opacity-80 shrink-0" />
      <span ref={displayRef}>--:--</span>
    </div>
  );
}
