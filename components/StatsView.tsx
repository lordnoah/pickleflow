import React from 'react';
import { Info, ArrowUpDown, Medal, Trophy, Hash, Scale, X } from 'lucide-react';
import { Card } from './Card';
import { PlayerStats } from '../types';

interface StatsViewProps {
  leaderboard: PlayerStats[];
  sortKey: 'avgPoints' | 'pointsFor';
  setSortKey: (key: 'avgPoints' | 'pointsFor') => void;
  showInfo: boolean;
  setShowInfo: (show: boolean) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  leaderboard,
  sortKey,
  setSortKey,
  showInfo,
  setShowInfo,
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter">Standings</h2>
          <button
            onClick={() => setShowInfo(true)}
            className="mt-2 flex items-center gap-1.5 text-lime-600 font-black text-[10px] uppercase tracking-widest hover:underline cursor-pointer"
          >
            <Info size={14} /> How scoring works
          </button>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border self-start">
          <span className="text-[8px] font-black uppercase text-slate-400 px-2 flex items-center gap-1">
            <ArrowUpDown size={10} /> Sort By:
          </span>
          <button
            onClick={() => setSortKey('avgPoints')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
              sortKey === 'avgPoints'
                ? 'bg-white dark:bg-slate-700 text-lime-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Avg PPG
          </button>
          <button
            onClick={() => setSortKey('pointsFor')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
              sortKey === 'pointsFor'
                ? 'bg-white dark:bg-slate-700 text-lime-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Total Pts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {leaderboard.map((stat, idx) => (
          <div
            key={stat.id}
            className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all ${
              idx < 3 ? 'border-lime-500 shadow-lg scale-[1.01]' : 'border-slate-100 dark:border-slate-800 opacity-90'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${
                idx < 3 ? 'bg-lime-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {stat.displayRank}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-lg uppercase truncate flex items-center gap-2">
                {stat.name}{' '}
                {idx === 0 && <Medal size={20} className="text-amber-400 animate-bounce" />}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                W-L-T: {stat.wins}-{stat.losses}-{stat.ties} • {stat.gamesPlayed} Games
              </p>
            </div>
            <div className="flex gap-4 md:gap-8 items-center shrink-0 pr-2">
              <div
                className={`text-right ${
                  sortKey === 'pointsFor' ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <div className="text-lg font-black">{stat.pointsFor}</div>
                <p className="text-[8px] font-black text-slate-400 uppercase">Total</p>
              </div>
              <div
                className={`text-right ${
                  sortKey === 'avgPoints' ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <div className="text-lg font-black text-lime-600">
                  {stat.avgPoints.toFixed(1)}
                </div>
                <p className="text-[8px] font-black text-slate-400 uppercase">PPG</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="max-w-xl w-full p-8 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            >
              <X size={24} />
            </button>
            <h3 className="text-3xl font-black uppercase italic text-lime-600 flex items-center gap-2 mb-6">
              <Trophy size={28} /> Scoring Logic
            </h3>
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-lime-600 mb-3 font-black uppercase text-xs tracking-widest">
                  <Hash size={18} /> Primary: Points Per Game (PPG)
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                  To maintain fairness when players sit out, we use <strong>PPG</strong> as the
                  primary metric. It measures efficiency—how many points you generate every time
                  you step on the court. This prevents a player from dropping in rank just because
                  the schedule gave them a rest round.
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-blue-600 mb-3 font-black uppercase text-xs tracking-widest">
                  <Scale size={18} /> Secondary: Total Points For
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                  If two players have identical PPG, we look at <strong>Total Points For</strong>.
                  This rewards volume and consistency across the entire session. It’s the ultimate
                  tie-breaker to see who has been the most productive overall.
                </p>
              </div>
              <div className="p-4 bg-lime-50 dark:bg-lime-900/10 rounded-xl border border-lime-100 dark:border-lime-900/30">
                <p className="text-[10px] font-black text-lime-700 dark:text-lime-400 uppercase leading-normal tracking-wide italic">
                  Note: Wins/Losses/Ties are tracked for your personal record, but points are the
                  currency of PickleFlow standings. Every point matters!
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="w-full mt-8 py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              Back to Leaderboard
            </button>
          </Card>
        </div>
      )}
    </div>
  );
};
