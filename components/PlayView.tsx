import React from 'react';
import { ChevronLeft, Crown, CheckCircle, CheckCircle2, Edit2, Coffee } from 'lucide-react';
import { Card } from './Card';
import { Timer } from './Timer';
import { Round, Match } from '../types';
import { GameEngine } from '../lib/games/types';

interface PlayViewProps {
  rounds: Round[];
  currentRoundIndex: number;
  setCurrentRoundIndex: (idx: number) => void;
  selectedDuration: number;
  trueActiveRoundIndex: number;
  engine: GameEngine;
  currentRoundComplete: boolean;
  isLastRound: boolean;
  handleGenerateNextRound: () => void;
  updateScore: (matchId: string, team: 1 | 2, value: string) => void;
  setRounds: React.Dispatch<React.SetStateAction<Round[]>>;
  setView: (view: 'setup' | 'play' | 'leaderboard' | 'summary') => void;
}

export const PlayView: React.FC<PlayViewProps> = ({
  rounds,
  currentRoundIndex,
  setCurrentRoundIndex,
  selectedDuration,
  trueActiveRoundIndex,
  engine,
  currentRoundComplete,
  isLastRound,
  handleGenerateNextRound,
  updateScore,
  setRounds,
  setView,
}) => {
  const currentRound = rounds[currentRoundIndex];
  if (!currentRound) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-md flex items-center justify-between">
        <button
          onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))}
          disabled={currentRoundIndex === 0}
          className="p-2 text-slate-400 disabled:opacity-20 cursor-pointer"
        >
          <ChevronLeft size={32} />
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <p className="text-2xl font-black uppercase italic">
              Round {currentRoundIndex + 1}
            </p>
            {currentRoundIndex === trueActiveRoundIndex && (
              <span className="bg-lime-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black animate-pulse uppercase tracking-widest">
                ACTIVE
              </span>
            )}
          </div>
          <Timer
            key={`${currentRoundIndex}-${selectedDuration}`}
            duration={selectedDuration}
          />
        </div>
        <button
          onClick={() =>
            currentRoundIndex < rounds.length - 1
              ? setCurrentRoundIndex(currentRoundIndex + 1)
              : setView('leaderboard')
          }
          className="p-2 text-slate-400 rotate-180 cursor-pointer"
        >
          <ChevronLeft size={32} />
        </button>
      </div>

      {/* K&Q: Generate Next Round button when current round is done */}
      {engine.isDynamic && currentRoundComplete && isLastRound && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 rounded-2xl flex items-center justify-between shadow-lg animate-in zoom-in-95 duration-200">
          <div>
            <p className="text-white font-black uppercase text-xs tracking-widest">
              Round {currentRoundIndex + 1} Complete!
            </p>
            <p className="text-amber-100 text-[10px] mt-0.5">
              Courts reshuffled — winners move up, losers move down.
            </p>
          </div>
          <button
            onClick={handleGenerateNextRound}
            className="bg-white text-amber-600 font-black text-xs uppercase px-5 py-3 rounded-xl shadow active:scale-95 transition-all whitespace-nowrap cursor-pointer"
          >
            Next Round →
          </button>
        </div>
      )}

      <div className="space-y-6">
        {currentRound.matches.map((match) => (
          <Card
            key={match.id}
            className={`${
              match.completed
                ? 'opacity-60 grayscale-[0.5]'
                : 'border-l-8 border-lime-500 shadow-lg'
            }`}
          >
            <div
              className={`px-4 py-2 flex justify-between items-center ${
                engine.isDynamic && match.court === 1
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500'
                  : 'bg-slate-900'
              } text-white`}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                {engine.isDynamic && match.court === 1 && (
                  <Crown size={13} className="text-yellow-200" />
                )}
                Court {match.court}
                {engine.isDynamic && match.court === 1 && (
                  <span className="text-yellow-200 normal-case font-bold">· 2× pts</span>
                )}
              </span>
              {match.completed && <CheckCircle size={14} className="text-lime-400" />}
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-lime-50/50 dark:bg-lime-900/10 p-3 rounded-xl border border-lime-100 dark:border-lime-900/30">
                  <div className="flex-1 font-black uppercase text-sm text-lime-800 dark:text-lime-400">
                    {match.team1[0]?.name}
                    <br />
                    {match.team1[1]?.name}
                  </div>
                  <input
                    type="tel"
                    value={match.score1}
                    onChange={(e) => updateScore(match.id, 1, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl text-center text-3xl font-black border-2 border-lime-200 dark:border-slate-700 outline-none focus:border-lime-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[10px] font-black text-slate-400 uppercase italic">
                    VS
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>

                <div className="flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                  <div className="flex-1 font-black uppercase text-sm text-blue-800 dark:text-blue-400">
                    {match.team2[0]?.name}
                    <br />
                    {match.team2[1]?.name}
                  </div>
                  <input
                    type="tel"
                    value={match.score2}
                    onChange={(e) => updateScore(match.id, 2, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl text-center text-3xl font-black border-2 border-blue-200 dark:border-slate-700 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {(() => {
                const s1 = parseInt(match.score1, 10) || 0;
                const s2 = parseInt(match.score2, 10) || 0;
                const isTied = s1 === s2;
                const blockTie = engine.isDynamic && isTied && !match.completed;
                return (
                  <div className="space-y-1">
                    {blockTie && (
                      <p className="text-center text-[10px] font-black text-amber-600 uppercase tracking-widest">
                        ⚠ Ties not allowed — play out the final point!
                      </p>
                    )}
                    <button
                      disabled={blockTie}
                      onClick={() =>
                        setRounds((prev) =>
                          prev.map((r, rIdx) =>
                            rIdx !== currentRoundIndex
                              ? r
                              : {
                                  ...r,
                                  matches: r.matches.map((m) =>
                                    m.id === match.id ? { ...m, completed: !m.completed } : m,
                                  ),
                                },
                          ),
                        )
                      }
                      className={`w-full py-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                        match.completed
                          ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          : blockTie
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-lime-600 text-white shadow-lg hover:bg-lime-700'
                      }`}
                    >
                      {match.completed ? (
                        <>
                          <Edit2 size={18} /> Edit Scores
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} /> Add Final Score
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>
          </Card>
        ))}

        {currentRound.sittingOut.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-dashed border-orange-200 dark:border-orange-900/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-500 p-2 rounded-lg text-white">
                <Coffee size={20} />
              </div>
              <h4 className="font-black uppercase italic text-orange-600 tracking-tight">
                Sitting Out This Round
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentRound.sittingOut.map((p) => (
                <span
                  key={p.id}
                  className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-orange-100 dark:border-orange-900/30 font-black text-sm uppercase text-orange-700 shadow-sm"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
