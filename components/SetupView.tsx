import React from 'react';
import { Users, Plus, Trash2, Settings } from 'lucide-react';
import { Card } from './Card';
import { Player } from '../types';
import { GAME_ENGINES } from '../lib/games/index';
import { ROUND_OPTIONS, DURATION_OPTIONS, COURT_OPTIONS } from '../constants';

interface SetupViewProps {
  players: Player[];
  newPlayerName: string;
  setNewPlayerName: (name: string) => void;
  handleAddPlayer: () => void;
  handleRenamePlayer: (id: number, name: string) => void;
  handleDeletePlayer: (id: number) => void;
  gameType: string;
  setGameType: (type: string) => void;
  courtCount: number;
  setCourtCount: (count: number) => void;
  numRounds: number;
  setNumRounds: (rounds: number) => void;
  selectedDuration: number;
  setSelectedDuration: (duration: number) => void;
  handleGenerateSchedule: () => void;
  kqPlayerCountValid: boolean;
  isValidName: boolean;
  isDuplicate: boolean;
}

export const SetupView: React.FC<SetupViewProps> = ({
  players,
  newPlayerName,
  setNewPlayerName,
  handleAddPlayer,
  handleRenamePlayer,
  handleDeletePlayer,
  gameType,
  setGameType,
  courtCount,
  setCourtCount,
  numRounds,
  setNumRounds,
  selectedDuration,
  setSelectedDuration,
  handleGenerateSchedule,
  kqPlayerCountValid,
  isValidName,
  isDuplicate,
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-black text-lime-600 uppercase flex items-center gap-3 mb-6">
          <Users size={24} /> Players ({players.length})
        </h2>
        <div className="space-y-3 mb-6">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              placeholder="First Last"
              className={`flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl pl-4 pr-12 py-4 outline-none font-bold border-2 transition-all ${
                newPlayerName.trim() === ''
                  ? 'border-transparent'
                  : isDuplicate
                    ? 'border-rose-500'
                    : isValidName
                      ? 'border-lime-500'
                      : 'border-orange-400'
              }`}
            />
            {isValidName && !isDuplicate && (
              <button
                onClick={handleAddPlayer}
                className="px-7 rounded-xl bg-lime-600 text-white shadow-lg cursor-pointer"
              >
                <Plus size={32} />
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-1">
          {players.map((p, idx) => (
            <div
              key={p.id}
              className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border"
            >
              <div className="flex items-center gap-2 flex-1 mr-4">
                <span className="font-black text-slate-400 text-sm">{idx + 1}.</span>
                <input
                  type="text"
                  value={p.name}
                  placeholder={`Player ${idx + 1}`}
                  onChange={(e) => handleRenamePlayer(p.id, e.target.value)}
                  className="bg-transparent font-black outline-none w-full border-b border-transparent focus:border-lime-500 transition-colors py-0.5"
                />
              </div>
              <button
                onClick={() => handleDeletePlayer(p.id)}
                className="text-slate-300 hover:text-rose-500 p-2 cursor-pointer"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Game Type Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border overflow-hidden">
        <h3 className="text-[10px] font-black text-slate-400 uppercase px-4 pt-4 pb-2">
          Game Type
        </h3>
        <div className="flex flex-col">
          {GAME_ENGINES.map((eng) => (
            <button
              key={eng.id}
              onClick={() => setGameType(eng.id)}
              className={`flex items-start gap-3 px-4 py-3 text-left transition-all border-t first:border-t-0 cursor-pointer ${
                gameType === eng.id
                  ? 'bg-lime-50 dark:bg-lime-900/20 border-lime-200 dark:border-lime-800'
                  : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                  gameType === eng.id ? 'border-lime-600' : 'border-slate-300'
                }`}
              >
                {gameType === eng.id && <div className="w-2 h-2 rounded-full bg-lime-600" />}
              </div>
              <div>
                <p
                  className={`font-black text-sm ${
                    gameType === eng.id
                      ? 'text-lime-700 dark:text-lime-400'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {eng.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{eng.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* K&Q player count warning */}
      {gameType === 'king_and_queen' && !kqPlayerCountValid && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm animate-in fade-in slide-in-from-top-2">
          <p className="font-black text-amber-700 dark:text-amber-400 uppercase text-xs mb-1">
            Player Count Required
          </p>
          <p className="text-amber-600 dark:text-amber-500 text-xs leading-relaxed">
            King &amp; Queen requires exactly <strong>{courtCount * 4} players</strong> for{' '}
            {courtCount} courts ({courtCount} × 4). You currently have{' '}
            <strong>{players.length}</strong>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {gameType === 'standard' && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase">Rounds</h3>
            <select
              value={numRounds}
              onChange={(e) => setNumRounds(parseInt(e.target.value, 10))}
              className="w-full bg-transparent font-black text-xl text-lime-600 outline-none"
            >
              {ROUND_OPTIONS.map((o) => (
                <option key={o} value={o} className="dark:bg-slate-800 dark:text-lime-500">
                  {o}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase">Min / Round</h3>
          <select
            value={selectedDuration}
            onChange={(e) => {
              setSelectedDuration(parseInt(e.target.value, 10));
            }}
            className="w-full bg-transparent font-black text-xl text-lime-600 outline-none"
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o} value={o} className="dark:bg-slate-800 dark:text-lime-500">
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase">Courts</h3>
          <select
            value={courtCount}
            onChange={(e) => setCourtCount(parseInt(e.target.value, 10))}
            className="w-full bg-transparent font-black text-xl text-lime-600 outline-none"
          >
            {COURT_OPTIONS.map((o) => (
              <option key={o} value={o} className="dark:bg-slate-800 dark:text-lime-500">
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={handleGenerateSchedule}
        disabled={
          players.length < 4 || (gameType === 'king_and_queen' && !kqPlayerCountValid)
        }
        className={`w-full py-6 rounded-2xl font-black text-2xl uppercase italic tracking-tighter shadow-xl transition-all cursor-pointer ${
          players.length < 4 || (gameType === 'king_and_queen' && !kqPlayerCountValid)
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            : 'bg-lime-600 text-white hover:bg-lime-700'
        }`}
      >
        Start Tournament
      </button>
    </div>
  );
};
