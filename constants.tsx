
import React from 'react';

export const DEFAULT_PLAYERS = [
  { id: 1, name: 'David M' }, { id: 2, name: 'Noah M' },
  { id: 3, name: 'Graham B' }, { id: 4, name: 'Morgan R' },
  { id: 5, name: 'Casey H' }, { id: 6, name: 'Riley F' },
];

export const ROUND_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12];
export const DURATION_OPTIONS = [10, 12, 15, 20];
export const COURT_OPTIONS = [1, 2, 3, 4, 5, 6];

export const PickleFlowLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-sm">
        <rect x="25" y="15" width="50" height="55" rx="12" className="fill-slate-800 dark:fill-slate-100" />
        <rect x="42" y="70" width="16" height="20" rx="4" className="fill-slate-600 dark:fill-slate-400" />
        <circle cx="65" cy="45" r="18" className="fill-lime-500 stroke-2 stroke-white dark:stroke-slate-900" />
        <circle cx="58" cy="40" r="2.5" className="fill-black/20" />
        <circle cx="72" cy="40" r="2.5" className="fill-black/20" />
        <circle cx="65" cy="48" r="2.5" className="fill-black/20" />
        <circle cx="58" cy="52" r="2.5" className="fill-black/20" />
        <circle cx="72" cy="52" r="2.5" className="fill-black/20" />
      </svg>
    </div>
    <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
      Pickle<span className="text-lime-600">Flow</span>
    </h1>
  </div>
);
