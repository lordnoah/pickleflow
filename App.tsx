import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Settings,
  PlayCircle,
  LayoutGrid,
  Trophy,
  Upload,
  Download,
  RefreshCw,
} from 'lucide-react';
import { SetupView } from './components/SetupView';
import { PlayView } from './components/PlayView';
import { ScheduleView } from './components/ScheduleView';
import { StatsView } from './components/StatsView';
import { PickleFlowLogo, DEFAULT_PLAYERS } from './constants';
import { Player, Round, PlayerStats, View, TournamentSession } from './types';
import { getEngine } from './lib/games/index';
import { validateSession } from './lib/games/session';

const App: React.FC = () => {
  const handleWipe = () => {
    if (confirm('Reset all data?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // --- CORE STATE WITH TRY/CATCH PROTECTION ---
  const [view, setView] = useState<View>(() => {
    try {
      return (localStorage.getItem('pf_view') as View) || 'setup';
    } catch {
      return 'setup';
    }
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('pf_players');
      return saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
    } catch {
      return DEFAULT_PLAYERS;
    }
  });

  const [rounds, setRounds] = useState<Round[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pf_rounds') || '[]');
    } catch {
      return [];
    }
  });

  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('pf_round_idx') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [courtCount, setCourtCount] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('pf_courts') || '3', 10);
    } catch {
      return 3;
    }
  });

  const [numRounds, setNumRounds] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('pf_num_rounds') || '8', 10);
    } catch {
      return 8;
    }
  });

  const [selectedDuration, setSelectedDuration] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('pf_duration') || '15', 10);
    } catch {
      return 15;
    }
  });

  const [gameType, setGameType] = useState<string>(() => {
    try {
      return localStorage.getItem('pf_game_type') || 'standard';
    } catch {
      return 'standard';
    }
  });

  const [showInfo, setShowInfo] = useState(false);
  const [sortKey, setSortKey] = useState<'avgPoints' | 'pointsFor'>('avgPoints');
  const [newPlayerName, setNewPlayerName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const trueActiveRoundIndex = useMemo(() => {
    if (rounds.length === 0) return 0;
    const firstIncompleteIdx = rounds.findIndex((r) => r.matches.some((m) => !m.completed));
    return firstIncompleteIdx === -1 ? rounds.length - 1 : firstIncompleteIdx;
  }, [rounds]);

  // --- INDIVIDUAL EFFECT WRITING TO DEBOUNCE / PREVENT EXCESS WORK ---
  useEffect(() => {
    try {
      localStorage.setItem('pf_view', view);
    } catch (e) {
      console.warn('Failed to save pf_view:', e);
    }
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem('pf_players', JSON.stringify(players));
    } catch (e) {
      console.warn('Failed to save pf_players:', e);
    }
  }, [players]);

  useEffect(() => {
    try {
      localStorage.setItem('pf_rounds', JSON.stringify(rounds));
    } catch (e) {
      console.warn('Failed to save pf_rounds:', e);
    }
  }, [rounds]);

  useEffect(() => {
    try {
      localStorage.setItem('pf_round_idx', currentRoundIndex.toString());
    } catch (e) {
      console.warn('Failed to save pf_round_idx:', e);
    }
  }, [currentRoundIndex]);

  useEffect(() => {
    try {
      localStorage.setItem('pf_courts', courtCount.toString());
    } catch (e) {
      console.warn('Failed to save pf_courts:', e);
    }
  }, [courtCount]);

  useEffect(() => {
    try {
      localStorage.setItem('pf_num_rounds', numRounds.toString());
    } catch (e) {
      console.warn('Failed to save pf_num_rounds:', e);
    }
  }, [numRounds]);

  useEffect(() => {
    try {
      localStorage.setItem('pf_duration', selectedDuration.toString());
    } catch (e) {
      console.warn('Failed to save pf_duration:', e);
    }
  }, [selectedDuration]);

  useEffect(() => {
    try {
      localStorage.setItem('pf_game_type', gameType);
    } catch (e) {
      console.warn('Failed to save pf_game_type:', e);
    }
  }, [gameType]);

  // --- EXPORT/IMPORT ---
  const handleExport = () => {
    const data: TournamentSession = {
      players,
      rounds,
      currentRoundIndex,
      courtCount,
      numRounds,
      selectedDuration,
      view,
      gameType,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pickleflow-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawData = JSON.parse(e.target?.result as string);
        const data = validateSession(rawData);
        if (data) {
          setPlayers(data.players);
          if (data.rounds) setRounds(data.rounds);
          if (data.courtCount) setCourtCount(data.courtCount);
          if (data.numRounds) setNumRounds(data.numRounds);
          if (data.selectedDuration) setSelectedDuration(data.selectedDuration);
          if (typeof data.currentRoundIndex === 'number') {
            setCurrentRoundIndex(data.currentRoundIndex);
          }
          if (data.gameType) setGameType(data.gameType);
          setView(data.view || 'play');
        } else {
          alert('Invalid tournament data file.');
        }
      } catch {
        alert('Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  // --- PLAYER PREVIEW MEMO WITH PROPER DEPENDENCIES ---
  const { isValidName, formattedPreview } = useMemo(() => {
    const nameParts = newPlayerName
      .trim()
      .split(/\s+/)
      .filter((p) => p.length > 0);
    const valid = nameParts.length >= 2 && nameParts[0].length > 1;
    if (!valid) {
      return { isValidName: false, formattedPreview: '' };
    }
    const first = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
    const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    return {
      isValidName: true,
      formattedPreview: `${first} ${lastInitial}.`,
    };
  }, [newPlayerName]);

  const isDuplicate = useMemo(
    () =>
      isValidName &&
      players.some(
        (p) => p.name.trim() !== '' && p.name.toLowerCase() === formattedPreview.toLowerCase()
      ),
    [isValidName, players, formattedPreview],
  );

  const handleAddPlayer = () => {
    if (!isValidName || isDuplicate) return;
    setPlayers([...players, { id: Date.now(), name: formattedPreview }]);
    setNewPlayerName('');
  };

  const handleRenamePlayer = (id: number, newName: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: newName } : p)));
    setRounds((prev) =>
      prev.map((r) => ({
        ...r,
        matches: r.matches.map((m) => ({
          ...m,
          team1: m.team1.map((p) => (p.id === id ? { ...p, name: newName } : p)),
          team2: m.team2.map((p) => (p.id === id ? { ...p, name: newName } : p)),
        })),
        sittingOut: r.sittingOut.map((p) => (p.id === id ? { ...p, name: newName } : p)),
      })),
    );
  };

  const handleDeletePlayer = (id: number) => {
    const deletedPlayer = players.find((p) => p.id === id);
    if (rounds.length > 0) {
      // Use unique negative offset based on timestamp to avoid collisions
      const subId = -(Date.now() + Math.floor(Math.random() * 1000));
      setPlayers((prev) =>
        prev.map((p) => (p.id === id ? { id: subId, name: `[SUB] ${p.name}` } : p))
      );
      setRounds((prev) =>
        prev.map((round, rIdx) => {
          const isFutureOrCurrent = rIdx >= currentRoundIndex;
          return {
            ...round,
            matches: round.matches.map((m) => {
              if (isFutureOrCurrent && !m.completed) {
                return {
                  ...m,
                  team1: m.team1.map((p) =>
                    p.id === id ? { id: subId, name: `[SUB] ${deletedPlayer?.name || ''}` } : p
                  ),
                  team2: m.team2.map((p) =>
                    p.id === id ? { id: subId, name: `[SUB] ${deletedPlayer?.name || ''}` } : p
                  ),
                };
              }
              return m;
            }),
            sittingOut: round.sittingOut.map((p) =>
              p.id === id ? { id: subId, name: `[SUB] ${deletedPlayer?.name || ''}` } : p
            ),
          };
        }),
      );
    } else {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // --- SCHEDULER ---
  const engine = getEngine(gameType);

  const handleGenerateSchedule = () => {
    const finalizedPlayers = players.map((p, idx) => ({
      ...p,
      name: p.name.trim() || `Player ${idx + 1}`,
    }));
    setPlayers(finalizedPlayers);

    const newRounds = engine.generateInitialRounds(finalizedPlayers, numRounds, courtCount);
    if (newRounds.length > 0) {
      setRounds(newRounds);
      setCurrentRoundIndex(0);
      setView('play');
    }
  };

  const handleGenerateNextRound = () => {
    const nextRound = engine.generateNextRound(players, rounds, courtCount);
    if (nextRound) {
      const updated = [...rounds, nextRound];
      setRounds(updated);
      setCurrentRoundIndex(updated.length - 1);
    }
  };

  const currentRoundComplete =
    rounds[currentRoundIndex]?.matches.every((m) => m.completed) ?? false;
  const isLastRound = currentRoundIndex === rounds.length - 1;
  const kqPlayerCountValid = players.length === courtCount * 4;

  const updateScore = (matchId: string, team: 1 | 2, value: string) => {
    const val = value.replace(/\D/g, '');
    setRounds((prev) =>
      prev.map((round, idx) =>
        idx !== currentRoundIndex
          ? round
          : {
              ...round,
              matches: round.matches.map((m) =>
                m.id === matchId ? (team === 1 ? { ...m, score1: val } : { ...m, score2: val }) : m
              ),
            }
      )
    );
  };

  const leaderboard = useMemo<PlayerStats[]>(() => {
    return engine.calculateLeaderboard(players, rounds, sortKey);
  }, [rounds, players, sortKey, engine]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 font-sans text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <header className="sticky top-0 z-[60] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <PickleFlowLogo />
            <div className="flex gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center text-slate-400 hover:text-lime-600 transition-colors cursor-pointer"
              >
                <Upload size={18} />
                <span className="text-[8px] font-black uppercase mt-1">Import</span>
              </button>
              <button
                onClick={handleExport}
                className="flex flex-col items-center text-slate-400 hover:text-lime-600 transition-colors cursor-pointer"
              >
                <Download size={18} />
                <span className="text-[8px] font-black uppercase mt-1">Export</span>
              </button>
              <button
                onClick={handleWipe}
                className="flex flex-col items-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <RefreshCw size={18} />
                <span className="text-[8px] font-black uppercase mt-1">Wipe</span>
              </button>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
            accept=".json"
          />

          {rounds.length > 0 && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {[
                { id: 'setup', icon: Settings, label: 'Setup' },
                { id: 'play', icon: PlayCircle, label: 'Play' },
                { id: 'summary', icon: LayoutGrid, label: 'Schedule' },
                { id: 'leaderboard', icon: Trophy, label: 'Stats' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as View)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    view === item.id
                      ? 'bg-white dark:bg-slate-700 text-lime-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <item.icon size={16} /> <span className="uppercase">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        {view === 'setup' && (
          <SetupView
            players={players}
            newPlayerName={newPlayerName}
            setNewPlayerName={setNewPlayerName}
            handleAddPlayer={handleAddPlayer}
            handleRenamePlayer={handleRenamePlayer}
            handleDeletePlayer={handleDeletePlayer}
            gameType={gameType}
            setGameType={setGameType}
            courtCount={courtCount}
            setCourtCount={setCourtCount}
            numRounds={numRounds}
            setNumRounds={setNumRounds}
            selectedDuration={selectedDuration}
            setSelectedDuration={setSelectedDuration}
            handleGenerateSchedule={handleGenerateSchedule}
            kqPlayerCountValid={kqPlayerCountValid}
            isValidName={isValidName}
            isDuplicate={isDuplicate}
          />
        )}

        {view === 'play' && (
          <PlayView
            rounds={rounds}
            currentRoundIndex={currentRoundIndex}
            setCurrentRoundIndex={setCurrentRoundIndex}
            selectedDuration={selectedDuration}
            trueActiveRoundIndex={trueActiveRoundIndex}
            engine={engine}
            currentRoundComplete={currentRoundComplete}
            isLastRound={isLastRound}
            handleGenerateNextRound={handleGenerateNextRound}
            updateScore={updateScore}
            setRounds={setRounds}
            setView={setView}
          />
        )}

        {view === 'summary' && (
          <ScheduleView
            rounds={rounds}
            trueActiveRoundIndex={trueActiveRoundIndex}
            setCurrentRoundIndex={setCurrentRoundIndex}
            setView={setView}
          />
        )}

        {view === 'leaderboard' && (
          <StatsView
            leaderboard={leaderboard}
            sortKey={sortKey}
            setSortKey={setSortKey}
            showInfo={showInfo}
            setShowInfo={setShowInfo}
          />
        )}
      </main>
    </div>
  );
};

export default App;
