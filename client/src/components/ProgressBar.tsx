import * as React from 'react';

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`w-full h-2 bg-slate-200 rounded ${className || ''}`}>
      <div
        className="h-2 bg-sky-500 rounded transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export default ProgressBar;


