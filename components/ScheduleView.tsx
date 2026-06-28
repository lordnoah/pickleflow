import React from 'react';
import { ExternalLink, Coffee } from 'lucide-react';
import { Card } from './Card';
import { Round } from '../types';

interface ScheduleViewProps {
  rounds: Round[];
  trueActiveRoundIndex: number;
  setCurrentRoundIndex: (idx: number) => void;
  setView: (view: 'setup' | 'play' | 'leaderboard' | 'summary') => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  rounds,
  trueActiveRoundIndex,
  setCurrentRoundIndex,
  setView,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24 animate-in fade-in zoom-in-95">
      {rounds.map((round, rIdx) => {
        const isActive = rIdx === trueActiveRoundIndex;
        return (
          <Card
            key={rIdx}
            className={`p-4 transition-all duration-300 ${
              isActive
                ? 'ring-4 ring-lime-500 scale-[1.02] shadow-2xl bg-white dark:bg-slate-800 z-10'
                : 'opacity-60 grayscale-[0.2]'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <button
                onClick={() => {
                  setCurrentRoundIndex(rIdx);
                  setView('play');
                }}
                className="flex flex-col items-start group cursor-pointer text-left"
              >
                <h3
                  className={`font-black uppercase italic flex items-center gap-1 transition-colors ${
                    isActive
                      ? 'text-lime-600 text-lg hover:text-lime-700'
                      : 'text-slate-400 text-xs hover:text-slate-500'
                  }`}
                >
                  Round {round.number} <ExternalLink size={isActive ? 14 : 10} />
                </h3>
              </button>
              {isActive && (
                <span className="bg-lime-500 text-white text-[8px] px-2 py-1 rounded-full font-black animate-pulse uppercase tracking-widest">
                  ACTIVE
                </span>
              )}
            </div>
            <div className="space-y-4">
              {round.matches.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className={`p-3 rounded-xl border ${
                    isActive
                      ? 'border-lime-100 dark:border-lime-900/30 bg-lime-50/30 dark:bg-lime-900/10'
                      : 'border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-2 uppercase">
                    <span>Court {m.court}</span>
                    {m.completed && (
                      <span className="text-lime-600 font-black">
                        Final: {m.score1}-{m.score2}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase leading-none">
                      {m.team1.map((p) => p.name).join(' & ')}
                    </p>
                    <div className="flex items-center gap-2 py-1">
                      <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                      <span className="text-[7px] font-black text-slate-400 uppercase">
                        VS
                      </span>
                      <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <p className="text-[11px] font-black uppercase leading-none">
                      {m.team2.map((p) => p.name).join(' & ')}
                    </p>
                  </div>
                </div>
              ))}
              {round.sittingOut.length > 0 && (
                <div className="mt-2 pt-3 border-t-2 border-dotted border-orange-200 dark:border-orange-900/30">
                  <div className="flex items-center gap-1.5 mb-1 text-orange-500">
                    <Coffee size={10} />
                    <p className="text-[8px] font-black uppercase text-orange-400">
                      Resting:
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {round.sittingOut.map((p) => (
                      <span
                        key={p.id}
                        className="text-[10px] font-bold text-orange-700/80 dark:text-orange-500/80 px-1"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
