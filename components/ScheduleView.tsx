import React from 'react';
import { ExternalLink, Coffee, Pencil, X } from 'lucide-react';
import { Card } from './Card';
import { Round, Player, Match } from '../types';

interface ScheduleViewProps {
  rounds: Round[];
  trueActiveRoundIndex: number;
  setCurrentRoundIndex: (idx: number) => void;
  setView: (view: 'setup' | 'play' | 'leaderboard' | 'summary') => void;
  players: Player[];
  onUpdateMatchPlayers: (
    roundIndex: number,
    matchId: string,
    team1Players: Player[],
    team2Players: Player[],
  ) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  rounds,
  trueActiveRoundIndex,
  setCurrentRoundIndex,
  setView,
  players,
  onUpdateMatchPlayers,
}) => {
  const [editingMatch, setEditingMatch] = React.useState<{
    roundIdx: number;
    match: Match;
  } | null>(null);

  const [t1p1, setT1p1] = React.useState<number>(0);
  const [t1p2, setT1p2] = React.useState<number>(0);
  const [t2p1, setT2p1] = React.useState<number>(0);
  const [t2p2, setT2p2] = React.useState<number>(0);

  React.useEffect(() => {
    if (editingMatch) {
      setT1p1(editingMatch.match.team1[0]?.id || 0);
      setT1p2(editingMatch.match.team1[1]?.id || 0);
      setT2p1(editingMatch.match.team2[0]?.id || 0);
      setT2p2(editingMatch.match.team2[1]?.id || 0);
    }
  }, [editingMatch]);

  const sortedPlayers = React.useMemo(() => {
    return [...players].sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  const selectedIds = [t1p1, t1p2, t2p1, t2p2];
  const hasDuplicates = new Set(selectedIds).size !== selectedIds.length;

  const handleSave = () => {
    if (!editingMatch || hasDuplicates) return;

    const p1 = players.find((p) => p.id === t1p1);
    const p2 = players.find((p) => p.id === t1p2);
    const p3 = players.find((p) => p.id === t2p1);
    const p4 = players.find((p) => p.id === t2p2);

    if (p1 && p2 && p3 && p4) {
      onUpdateMatchPlayers(editingMatch.roundIdx, editingMatch.match.id, [p1, p2], [p3, p4]);
      setEditingMatch(null);
    }
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24 animate-in fade-in zoom-in-95">
        {rounds.map((round, rIdx) => {
          const isActive = rIdx === trueActiveRoundIndex;
          return (
            <Card
              key={rIdx}
              className={`p-4 md:p-6 lg:p-7 transition-all duration-300 ${
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
                    className={`font-black uppercase italic flex items-center gap-1.5 transition-colors ${
                      isActive
                        ? 'text-lime-600 text-lg md:text-xl lg:text-2xl hover:text-lime-700'
                        : 'text-slate-400 text-xs md:text-sm lg:text-base hover:text-slate-500'
                    }`}
                  >
                    Round {round.number}{' '}
                    <ExternalLink
                      className={
                        isActive
                          ? 'w-3.5 h-3.5 md:w-4.5 md:h-4.5 lg:w-5 lg:h-5'
                          : 'w-2.5 h-2.5 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4'
                      }
                    />
                  </h3>
                </button>
                {isActive && (
                  <span className="bg-lime-500 text-white text-[8px] md:text-[10px] lg:text-[11px] px-2 py-1 md:px-3 md:py-1 rounded-full font-black animate-pulse uppercase tracking-widest">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {round.matches.map((m, mIdx) => (
                  <div
                    key={mIdx}
                    className={`p-3 md:p-4 lg:p-4.5 rounded-xl md:rounded-2xl border ${
                      isActive
                        ? 'border-lime-100 dark:border-lime-900/30 bg-lime-50/30 dark:bg-lime-900/10'
                        : 'border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[8px] md:text-[10px] lg:text-[11px] font-bold text-slate-400 mb-2 uppercase">
                      <span className="flex items-center gap-1">
                        Court {m.court}
                        <button
                          onClick={() => setEditingMatch({ roundIdx: rIdx, match: m })}
                          className="text-slate-400 hover:text-lime-600 p-0.5 rounded transition-colors cursor-pointer"
                          title="Edit players in this match"
                        >
                          <Pencil className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                        </button>
                      </span>
                      {m.completed && (
                        <span className="text-lime-600 font-black">
                          Final: {m.score1}-{m.score2}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] md:text-[13px] lg:text-[14px] xl:text-[15px] font-black uppercase leading-none">
                        {m.team1.map((p) => p.name).join(' & ')}
                      </p>
                      <div className="flex items-center gap-2 py-1">
                        <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                        <span className="text-[7px] md:text-[9px] lg:text-[10px] font-black text-slate-400 uppercase">
                          VS
                        </span>
                        <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                      </div>
                      <p className="text-[11px] md:text-[13px] lg:text-[14px] xl:text-[15px] font-black uppercase leading-none">
                        {m.team2.map((p) => p.name).join(' & ')}
                      </p>
                    </div>
                  </div>
                ))}
                {round.sittingOut.length > 0 && (
                  <div className="mt-2 pt-3 border-t-2 border-dotted border-orange-200 dark:border-orange-900/30">
                    <div className="flex items-center gap-1.5 mb-1 text-orange-500">
                      <Coffee className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" />
                      <p className="text-[8px] md:text-[10px] lg:text-[11px] font-black uppercase text-orange-400">
                        Resting:
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {round.sittingOut.map((p) => (
                        <span
                          key={p.id}
                          className="text-[10px] md:text-[12px] lg:text-[13px] font-bold text-orange-700/80 dark:text-orange-500/80 px-1"
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

      {/* Edit Match Overlay Modal */}
      {editingMatch && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 md:p-8 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingMatch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl md:text-3xl font-black uppercase italic text-lime-600 flex items-center gap-2 mb-6">
              <Pencil size={24} /> Edit Match
            </h3>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-6">
              Round {editingMatch.match.id.split('-')[0].slice(1) * 1 + 1} • Court {editingMatch.match.court}
            </p>

            <div className="space-y-6">
              {/* Team 1 */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-[10px] font-black text-lime-600 uppercase tracking-widest mb-3">
                  Team 1
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Player 1
                    </label>
                    <select
                      value={t1p1}
                      onChange={(e) => setT1p1(parseInt(e.target.value, 10))}
                      className="w-full bg-white dark:bg-slate-850 border dark:border-slate-700 p-2.5 rounded-lg font-bold text-sm outline-none focus:border-lime-500 dark:text-white"
                    >
                      {sortedPlayers.map((p) => (
                        <option key={p.id} value={p.id} className="dark:bg-slate-800">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Player 2
                    </label>
                    <select
                      value={t1p2}
                      onChange={(e) => setT1p2(parseInt(e.target.value, 10))}
                      className="w-full bg-white dark:bg-slate-850 border dark:border-slate-700 p-2.5 rounded-lg font-bold text-sm outline-none focus:border-lime-500 dark:text-white"
                    >
                      {sortedPlayers.map((p) => (
                        <option key={p.id} value={p.id} className="dark:bg-slate-800">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Team 2 */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">
                  Team 2
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Player 1
                    </label>
                    <select
                      value={t2p1}
                      onChange={(e) => setT2p1(parseInt(e.target.value, 10))}
                      className="w-full bg-white dark:bg-slate-850 border dark:border-slate-700 p-2.5 rounded-lg font-bold text-sm outline-none focus:border-lime-500 dark:text-white"
                    >
                      {sortedPlayers.map((p) => (
                        <option key={p.id} value={p.id} className="dark:bg-slate-800">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Player 2
                    </label>
                    <select
                      value={t2p2}
                      onChange={(e) => setT2p2(parseInt(e.target.value, 10))}
                      className="w-full bg-white dark:bg-slate-850 border dark:border-slate-700 p-2.5 rounded-lg font-bold text-sm outline-none focus:border-lime-500 dark:text-white"
                    >
                      {sortedPlayers.map((p) => (
                        <option key={p.id} value={p.id} className="dark:bg-slate-800">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {hasDuplicates && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg animate-in fade-in duration-200">
                A player cannot be selected more than once in the same match.
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setEditingMatch(null)}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={hasDuplicates}
                className={`flex-1 py-4 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg transition-all cursor-pointer ${
                  hasDuplicates
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none dark:bg-slate-800'
                    : 'bg-lime-600 text-white hover:bg-lime-700 active:scale-[0.98]'
                }`}
              >
                Save Changes
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
