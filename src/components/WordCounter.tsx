'use client';

interface WordCounterProps {
  text: string;
  min: number;
  max: number;
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export default function WordCounter({ text, min, max }: WordCounterProps) {
  const count = text.trim() === '' ? 0 : countWords(text);
  const pct = Math.min((count / max) * 100, 100);

  let colorClass = 'wc-low';
  let barColor = '#6B7280';
  let statusText = `Minimum ${min} words required`;

  if (count >= min && count < max * 0.85) {
    colorClass = 'wc-ok';
    barColor = '#10B981';
    statusText = 'Good length';
  } else if (count >= max * 0.85 && count <= max) {
    colorClass = 'wc-warn';
    barColor = '#F59E0B';
    statusText = 'Approaching limit';
  } else if (count > max) {
    colorClass = 'wc-over';
    barColor = '#EF4444';
    statusText = `Exceeded! Max ${max} words`;
  }

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-400">{statusText}</span>
        <span className={`font-semibold tabular-nums ${colorClass}`}>
          {count} / {max}
        </span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export { countWords };
