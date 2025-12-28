import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Trophy,
  Settings,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronDown,
  AlertCircle,
  Timer,
  Pause,
  PlayCircle,
  Edit2,
  Share2,
  RefreshCw,
  LayoutGrid,
  Calendar,
  Filter,
  Download,
  Upload,
  History,
  ShieldCheck,
  UserMinus,
  Eraser,
  Play,
  X
} from 'lucide-react';
import { Card } from './components/Card';
import { PickleFlowLogo, DEFAULT_PLAYERS, ROUND_OPTIONS, DURATION_OPTIONS, COURT_OPTIONS } from './constants';
import { Player, Match, Round, PlayerStats, View, TournamentSession } from './types';

const App: React.FC = () => {
  // Core State
  const [view, setView] = useState<View>(() => (localStorage.getItem('pf_view') as View) || 'setup');
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('pf_players');
    return saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
  });
  const [rounds, setRounds] = useState<Round[]>(() => {
    const saved = localStorage.getItem('pf_rounds');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(() => {
    const saved = localStorage.getItem('pf_round_idx');
    return saved ? parseInt(saved) : 0;
  });
  const [courtCount, setCourtCount] = useState(() => parseInt(localStorage.getItem('pf_courts') || '3'));
  const [numRounds, setNumRounds] = useState(() => parseInt(localStorage.getItem('pf_num_rounds') || '8'));
  const [selectedDuration, setSelectedDuration] = useState(() => parseInt(localStorage.getItem('pf_duration') || '15'));

  // Utility State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [playerFilter, setPlayerFilter] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [history, setHistory] = useState<TournamentSession[]>(() => {
    const saved = localStorage.getItem('pf_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'action';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'action'
  });

  // Timer States
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(selectedDuration * 60); 
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence Engine
  useEffect(() => {
    // Skip saving if we are in the middle of a reset
    if (saveStatus === 'idle' && localStorage.length === 0 && history.length === 0) return;

    setSaveStatus('saving');
    localStorage.setItem('pf_view', view);
    localStorage.setItem('pf_players', JSON.stringify(players));
    localStorage.setItem('pf_rounds', JSON.stringify(rounds));
    localStorage.setItem('pf_round_idx', currentRoundIndex.toString());
    localStorage.setItem('pf_courts', courtCount.toString());
    localStorage.setItem('pf_num_rounds', numRounds.toString());
    localStorage.setItem('pf_duration', selectedDuration.toString());
    
    const timeout = setTimeout(() => setSaveStatus('saved'), 500);
    return () => clearTimeout(timeout);
  }, [view, players, rounds, currentRoundIndex, courtCount, numRounds, selectedDuration, history]);

  useEffect(() => {
    localStorage.setItem('pf_history', JSON.stringify(history.slice(0, 10)));
  }, [history]);

  const createSnapshot = (name?: string) => {
    if (rounds.length === 0) return;
    const session: TournamentSession = {
      id: Date.now().toString(),
      name: name || `RR ${players.length} Players - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
      date: Date.now(),
      players,
      rounds,
      currentRoundIndex,
      courtCount,
      numRounds,
      view
    };
    setHistory(prev => [session, ...prev.filter(s => s.date !== session.date)].slice(0, 10));
  };

  // Timer Logic
  useEffect(() => {
    if (timerActive && targetTime) {
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.round((targetTime - now) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          setTimerActive(false);
          setTargetTime(null);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 500);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, targetTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    const endAt = Date.now() + (timeLeft * 1000);
    setTargetTime(endAt);
    setTimerActive(true);
  };

  const pauseTimer = () => {
    setTimerActive(false);
    setTargetTime(null);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTargetTime(null);
    setTimeLeft(selectedDuration * 60);
  };

  const getPlayerLabel = (player: Player) => {
    const playerIndex = players.findIndex(p => p.id === player.id);
    return { name: player.name, number: playerIndex + 1 };
  };

  const handleEditPlayerName = (id: number, newName: string) => {
    setPlayers(players.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  // TERMINATION & CLEANUP LOGIC
  const requestTerminateTournament = () => {
    setConfirmModal({
      isOpen: true,
      title: 'End Session?',
      message: 'This will archive the current matches and clear the active schedule. Your squad roster will remain.',
      variant: 'danger',
      onConfirm: () => {
        createSnapshot(`Incomplete Session: Round ${currentRoundIndex + 1}`);
        setRounds([]);
        setCurrentRoundIndex(0);
        setView('setup');
        setPlayerFilter(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setSuccessMessage('Session Ended & Archived');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    });
  };

  const requestClearAllPlayers = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Wipe Squad?',
      message: 'This will remove all players from the active roster. This cannot be undone.',
      variant: 'danger',
      onConfirm: () => {
        setPlayers([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setSuccessMessage('Squad Roster Wiped');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    });
  };

  const requestClearMatchData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'ERASE EVERYTHING?',
      message: 'This is a complete factory reset. You will lose all players, history, and active sessions on this device.',
      variant: 'danger',
      onConfirm: () => {
        // Clear all persistent storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Manual soft reset of all state variables to baseline
        setPlayers(DEFAULT_PLAYERS);
        setRounds([]);
        setHistory([]);
        setCurrentRoundIndex(0);
        setCourtCount(3);
        setNumRounds(8);
        setSelectedDuration(15);
        setView('setup');
        setTimerActive(false);
        setTargetTime(null);
        setTimeLeft(15 * 60);
        setPlayerFilter(null);
        
        // Close modal and show success feedback
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setSuccessMessage('Factory Reset Complete');
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Ensure we are at the top of the page
        window.scrollTo(0, 0);
      }
    });
  };

  const handleGenerateSchedule = () => {
    if (rounds.length > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Regenerate Schedule?',
        message: 'This will rewrite all rounds and clear current scores. Are you sure you want to proceed?',
        variant: 'action',
        onConfirm: () => {
          generateSchedule();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }
    generateSchedule();
  };

  const requestRestoreSession = (session: TournamentSession) => {
    setConfirmModal({
      isOpen: true,
      title: 'Restore Session?',
      message: `Restore "${session.name}"? Your current active game will be archived automatically.`,
      variant: 'action',
      onConfirm: () => {
        createSnapshot("Auto-Archive Before Restore");
        setPlayers(session.players);
        setRounds(session.rounds);
        setCurrentRoundIndex(session.currentRoundIndex);
        setCourtCount(session.courtCount);
        setNumRounds(session.numRounds);
        setView(session.view);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setSuccessMessage('Session Restored');
        setTimeout(() => setSuccessMessage(''), 3000);
        window.scrollTo(0, 0);
      }
    });
  };

  // SMART PAIRING LOGIC
  const generateSchedule = () => {
    if (players.length < 4) {
      setError("Add at least 4 players.");
      setTimeout(() => setError(''), 3000);
      return;
    }

    const newRounds: Round[] = [];
    const playCount: Record<number, number> = {};
    const meetCount: Record<string, number> = {};
    const teammateCount: Record<string, number> = {};
    
    players.forEach(p => {
      playCount[p.id] = 0;
      players.forEach(p2 => {
        if (p.id !== p2.id) {
          const pairId = [p.id, p2.id].sort().join('-');
          meetCount[pairId] = 0;
          teammateCount[pairId] = 0;
        }
      });
    });

    for (let r = 0; r < numRounds; r++) {
      const sortedByPlay = [...players].sort((a, b) => (playCount[a.id] - playCount[b.id]) || (Math.random() - 0.5));
      const maxSlots = Math.min(players.length - (players.length % 4), courtCount * 4);
      const active = sortedByPlay.slice(0, maxSlots);
      const sittingOut = sortedByPlay.slice(maxSlots);
      const available = [...active];
      const roundMatches: Match[] = [];
      let courtIdx = 1;

      while (available.length >= 4) {
        const p1 = available.shift()!;
        const group: Player[] = [p1];
        while (group.length < 4) {
          available.sort((a, b) => {
            const scoreA = group.reduce((sum, member) => sum + meetCount[[member.id, a.id].sort().join('-')], 0);
            const scoreB = group.reduce((sum, member) => sum + meetCount[[member.id, b.id].sort().join('-')], 0);
            return scoreA - scoreB || (Math.random() - 0.5);
          });
          group.push(available.shift()!);
        }

        group.forEach(p => playCount[p.id]++);
        for (let i = 0; i < 4; i++) {
          for (let j = i + 1; j < 4; j++) {
            meetCount[[group[i].id, group[j].id].sort().join('-')]++;
          }
        }

        const combos = [
          { t1: [group[0], group[1]], t2: [group[2], group[3]] },
          { t1: [group[0], group[2]], t2: [group[1], group[3]] },
          { t1: [group[0], group[3]], t2: [group[1], group[2]] }
        ];

        combos.sort((a, b) => {
          const scoreA = teammateCount[[a.t1[0].id, a.t1[1].id].sort().join('-')] + teammateCount[[a.t2[0].id, a.t2[1].id].sort().join('-')];
          const scoreB = teammateCount[[b.t1[0].id, b.t1[1].id].sort().join('-')] + teammateCount[[b.t2[0].id, b.t2[1].id].sort().join('-')];
          return scoreA - scoreB;
        });

        const bestSplit = combos[0];
        teammateCount[[bestSplit.t1[0].id, bestSplit.t1[1].id].sort().join('-')]++;
        teammateCount[[bestSplit.t2[0].id, bestSplit.t2[1].id].sort().join('-')]++;

        roundMatches.push({
          id: `r${r}-c${courtIdx}`,
          court: courtIdx++,
          team1: bestSplit.t1,
          team2: bestSplit.t2,
          score1: '0',
          score2: '0',
          completed: false
        });
      }
      newRounds.push({ number: r + 1, matches: roundMatches, sittingOut });
    }

    setRounds(newRounds);
    setCurrentRoundIndex(0);
    setTimeLeft(selectedDuration * 60);
    setTimerActive(false);
    setTargetTime(null);
    setView('play');
    setPlayerFilter(null);
    createSnapshot(`RR Start - ${players.length} Players`);
    window.scrollTo(0, 0);
  };

  const updateScore = (matchId: string, team: 1 | 2, value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setRounds(prev => prev.map((round, idx) => idx !== currentRoundIndex ? round : {
      ...round,
      matches: round.matches.map(m => m.id === matchId ? (team === 1 ? { ...m, score1: numericValue } : { ...m, score2: numericValue }) : m)
    }));
  };

  const finalizeMatch = (matchId: string) => {
    const round = rounds[currentRoundIndex];
    const match = round.matches.find(m => m.id === matchId);
    if (!match) return;
    const s1 = parseInt(match.score1) || 0;
    const s2 = parseInt(match.score2) || 0;
    if (s1 === s2) {
      setError("Scores cannot be tied.");
      setTimeout(() => setError(''), 3000);
      return;
    }
    setRounds(prev => {
      const updated = prev.map((r, idx) => idx !== currentRoundIndex ? r : {
        ...r,
        matches: r.matches.map(m => m.id === matchId ? { ...m, completed: true } : m)
      });
      return updated;
    });
    createSnapshot();
  };

  const editMatch = (matchId: string) => {
    setRounds(prev => prev.map((r, idx) => idx !== currentRoundIndex ? r : {
      ...r,
      matches: r.matches.map(m => m.id === matchId ? { ...m, completed: false } : m)
    }));
  };

  const nextRound = () => {
    createSnapshot();
    if (currentRoundIndex < rounds.length - 1) {
      setCurrentRoundIndex(prev => prev + 1);
      resetTimer();
    } else {
      setView('leaderboard');
    }
    window.scrollTo(0, 0);
  };

  const exportTournament = () => {
    const data = { players, rounds, currentRoundIndex, courtCount, numRounds, selectedDuration, exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pickleflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTournament = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.players && data.rounds) {
          setPlayers(data.players);
          setRounds(data.rounds);
          setCurrentRoundIndex(data.currentRoundIndex || 0);
          setCourtCount(data.courtCount || 3);
          setNumRounds(data.numRounds || 8);
          setSelectedDuration(data.selectedDuration || 15);
          setView('play');
          setSuccessMessage('Data Imported Successfully');
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      } catch (err) {
        setError('Invalid backup file.');
        setTimeout(() => setError(''), 3000);
      }
    };
    reader.readAsText(file);
  };

  const leaderboard = useMemo<PlayerStats[]>(() => {
    const stats: Record<number, PlayerStats> = {};
    const h2h: Record<string, number> = {};
    players.forEach((p, idx) => {
      stats[p.id] = { id: p.id, name: p.name, number: idx + 1, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0, displayRank: 0 };
    });
    rounds.forEach(r => r.matches.forEach(m => {
      if (!m.completed) return;
      const s1 = parseInt(m.score1) || 0;
      const s2 = parseInt(m.score2) || 0;
      m.team1.forEach(p1 => {
        if (s1 > s2) stats[p1.id].wins++; else stats[p1.id].losses++;
        stats[p1.id].pointsFor += s1; stats[p1.id].pointsAgainst += s2;
        m.team2.forEach(p2 => {
          const key = `${p1.id}-${p2.id}`, rKey = `${p2.id}-${p1.id}`;
          if (s1 > s2) h2h[key] = (h2h[key] || 0) + 1; else h2h[rKey] = (h2h[rKey] || 0) + 1;
        });
      });
      m.team2.forEach(p2 => {
        if (s2 > s1) stats[p2.id].wins++; else stats[p2.id].losses++;
        stats[p2.id].pointsFor += s2; stats[p2.id].pointsAgainst += s1;
      });
    }));
    const sorted = Object.values(stats).map(s => ({ ...s, diff: s.pointsFor - s.pointsAgainst }))
      .sort((a, b) => (b.wins - a.wins) || (b.diff - a.diff) || ((h2h[`${b.id}-${a.id}`] || 0) - (h2h[`${a.id}-${b.id}`] || 0)));
    let rank = 1;
    return sorted.map((p, i) => {
      if (i > 0) {
        const prev = sorted[i - 1];
        if (p.wins !== prev.wins || p.diff !== prev.diff) rank = i + 1;
      }
      return { ...p, displayRank: rank };
    });
  }, [rounds, players]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 pt-1 sm:pt-4 overflow-x-hidden">
      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <Card className="max-w-sm w-full space-y-6 p-8 shadow-2xl rounded-[2rem] border-4 border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">{confirmModal.title}</h2>
              <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-slate-600 transition-colors p-1"><X size={24}/></button>
            </div>
            <p className="text-slate-500 font-bold text-base leading-snug">{confirmModal.message}</p>
            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={confirmModal.onConfirm}
                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all ${confirmModal.variant === 'danger' ? 'bg-rose-600 text-white' : 'bg-lime-600 text-white'}`}
              >
                Confirm Action
              </button>
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}

      <header className="sticky top-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:py-5 mb-4 sm:mb-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-3 sm:gap-4">
          <div className="flex justify-between items-center">
            <PickleFlowLogo />
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700">
                {saveStatus === 'saving' ? (
                  <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />
                ) : (
                  <div className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse" />
                )}
                <span className="text-[10px] sm:text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-tight">Auto-Sync</span>
              </div>
              {rounds.length > 0 && (
                <button 
                  onClick={() => setView('play')}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700 active:scale-95 group"
                >
                  <PlayCircle className="size-3.5 text-lime-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] sm:text-xs font-black uppercase text-lime-600 dark:text-lime-400 tracking-tight">
                    Round {currentRoundIndex + 1} / {rounds.length}
                  </span>
                </button>
              )}
            </div>
          </div>
          
          {rounds.length > 0 && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl sm:rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 overflow-hidden">
              {[
                { id: 'setup', icon: Settings, label: 'Setup' },
                { id: 'play', icon: PlayCircle, label: 'Play' },
                { id: 'summary', icon: LayoutGrid, label: 'Schedule' },
                { id: 'leaderboard', icon: Trophy, label: 'Stats' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as View)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all ${view === item.id ? 'bg-white dark:bg-slate-700 text-lime-600 shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                  <item.icon className="size-3.5 sm:size-[18px]" />
                  <span className="uppercase tracking-tight truncate">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-4">
        {(error || successMessage) && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] w-[90%] max-w-sm animate-in fade-in slide-in-from-top-4">
            <div className={`${error ? 'bg-rose-600' : 'bg-lime-600'} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-bold text-base border-2 border-white/20`}>
              {error ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />} 
              {error || successMessage}
            </div>
          </div>
        )}

        {view === 'setup' && (
          <div className="max-w-2xl mx-auto space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2">
            {rounds.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border-2 border-lime-500/30 flex flex-col sm:flex-row items-center justify-between shadow-xl gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="bg-lime-100 dark:bg-lime-900/30 p-3 rounded-xl text-lime-600">
                    <PlayCircle size={28} />
                  </div>
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Active Game</h3>
                    <p className="text-lg font-black italic uppercase tracking-tighter">Round {currentRoundIndex + 1} / {rounds.length}</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => setView('play')} className="flex-1 sm:flex-none bg-lime-600 text-white px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest active:scale-95 shadow-lg">Resume</button>
                  <button onClick={requestTerminateTournament} className="flex-1 sm:flex-none bg-rose-50 dark:bg-rose-900/20 text-rose-600 px-6 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest active:scale-95">End</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={exportTournament}
                className="flex items-center justify-center gap-2 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-[10px] sm:text-xs font-black uppercase text-slate-600 hover:text-lime-600 active:scale-95 shadow-sm"
              >
                <Download size={16} /> Backup
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-[10px] sm:text-xs font-black uppercase text-slate-600 hover:text-lime-600 active:scale-95 shadow-sm"
              >
                <Upload size={16} /> Import
                <input type="file" ref={fileInputRef} onChange={importTournament} className="hidden" accept=".json" />
              </button>
            </div>

            <Card className="p-4 sm:p-8">
              <div className="flex justify-between items-center mb-4 sm:mb-6 gap-2">
                <h2 className="text-base sm:text-xl font-black text-lime-600 uppercase tracking-widest flex items-center gap-3">
                  <Users size={24} /> Squad ({players.length})
                </h2>
                <button onClick={requestClearAllPlayers} className="text-[10px] sm:text-xs font-black text-slate-400 hover:text-rose-500 flex items-center gap-1.5 uppercase tracking-tighter transition-colors shrink-0">
                  <UserMinus size={14} /> Wipe
                </button>
              </div>
              <div className="flex gap-2 mb-6 sm:mb-8">
                <input 
                  type="text" 
                  value={newPlayerName} 
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter' && newPlayerName.trim()) { setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]); setNewPlayerName(''); }}}
                  placeholder="Enter Player Name..." 
                  className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3 sm:py-4 outline-none focus:ring-2 focus:ring-lime-500 font-bold text-base sm:text-lg min-w-0" 
                />
                <button 
                  onClick={() => { if(newPlayerName.trim()) { setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]); setNewPlayerName(''); } }} 
                  className="bg-lime-600 text-white px-5 sm:px-7 rounded-xl shadow-lg active:scale-90 transition-transform shrink-0"
                > 
                  <Plus className="size-6 sm:size-8" /> 
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2.5 max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar">
                {players.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 sm:p-3.5 pl-3 sm:pl-5 rounded-xl border-2 border-slate-100 dark:border-slate-800 shadow-sm min-w-0">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <span className="text-[10px] sm:text-sm font-black text-slate-300 w-5 sm:w-6 shrink-0">#{idx + 1}</span>
                      <input 
                        type="text" 
                        value={p.name} 
                        onChange={(e) => handleEditPlayerName(p.id, e.target.value)} 
                        className="bg-transparent border-none outline-none font-black text-base sm:text-xl text-slate-800 dark:text-slate-100 w-full min-w-0" 
                      />
                    </div>
                    <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-slate-300 hover:text-rose-500 p-2 transition-colors shrink-0"> <Trash2 className="size-5 sm:size-[22px]" /> </button>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="bg-white dark:bg-slate-800 p-3 sm:p-5 rounded-xl border-2 border-slate-100 dark:border-slate-700 shadow-sm">
                <h3 className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-tight mb-2.5 truncate">Rounds</h3>
                <div className="relative">
                  <select value={numRounds} onChange={(e) => setNumRounds(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl sm:text-3xl text-lime-600 outline-none cursor-pointer appearance-none pr-10">
                    {ROUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 size-6 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 sm:p-5 rounded-xl border-2 border-slate-100 dark:border-slate-700 shadow-sm">
                <h3 className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-tight mb-2.5 truncate">Game Len</h3>
                <div className="relative">
                  <select value={selectedDuration} onChange={(e) => setSelectedDuration(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl sm:text-3xl text-lime-600 outline-none cursor-pointer appearance-none pr-10">
                    {DURATION_OPTIONS.map(o => <option key={o} value={o}>{o}m</option>)}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 size-6 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 sm:p-5 rounded-xl border-2 border-slate-100 dark:border-slate-700 shadow-sm">
                <h3 className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-tight mb-2.5 truncate">Courts</h3>
                <div className="relative">
                  <select value={courtCount} onChange={(e) => setCourtCount(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl sm:text-3xl text-lime-600 outline-none cursor-pointer appearance-none pr-10">
                    {COURT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 size-6 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {history.length > 0 && (
              <div className="space-y-3 pt-4">
                <h2 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <History size={14} /> History
                </h2>
                <div className="space-y-2.5 max-h-[25vh] overflow-y-auto pr-1 custom-scrollbar">
                  {history.map((session) => (
                    <div key={session.id} className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm group hover:border-lime-200 transition-colors">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate">{session.name}</h4>
                        <div className="flex gap-2 sm:gap-3 mt-1 text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-tight">
                          <span>{session.players.length}P</span>
                          <span>R{session.currentRoundIndex + 1}/{session.rounds.length}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2 shrink-0 ml-3 sm:ml-4">
                        <button onClick={() => requestRestoreSession(session)} className="bg-lime-50 dark:bg-lime-900/20 text-lime-600 p-2 sm:p-2.5 rounded-lg hover:bg-lime-100 transition-all active:scale-90"><RefreshCw className="size-4 sm:size-[18px]" /></button>
                        <button onClick={() => setHistory(prev => prev.filter(s => s.id !== session.id))} className="text-slate-300 hover:text-rose-500 p-2 sm:p-2.5 transition-all active:scale-90"><Trash2 className="size-4 sm:size-[18px]" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleGenerateSchedule} className="w-full py-5 sm:py-7 rounded-2xl bg-lime-600 text-white font-black text-lg sm:text-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest mt-4">
              {rounds.length > 0 ? "Regenerate Schedule" : "Launch Round Robin"}
            </button>

            <div className="pt-8 pb-4 border-t-2 border-slate-200 dark:border-slate-800">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Advanced Tools</h3>
                    <p className="text-[9px] sm:text-sm text-slate-400 mt-0.5 leading-snug">Wipe all match data and history from this device.</p>
                  </div>
                  <button onClick={requestClearMatchData} className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-rose-100 dark:border-rose-900/30 text-rose-500 rounded-xl text-xs font-black uppercase active:scale-95 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors w-full sm:w-auto">
                    <Eraser size={16} /> Clear Match Data
                  </button>
               </div>
            </div>
          </div>
        )}

        {view === 'play' && rounds.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className={`sticky top-28 sm:top-32 z-50 flex items-center justify-between p-5 rounded-3xl shadow-2xl transition-all border-l-[10px] ${timeLeft === 0 ? 'bg-rose-50 border-rose-500' : timerActive ? 'bg-white dark:bg-slate-800 border-lime-500' : 'bg-slate-200 border-slate-400'}`}>
              <div className="flex items-center gap-4 sm:gap-5">
                <span className={`text-4xl sm:text-6xl font-black tabular-nums tracking-tighter ${timeLeft < 60 && timerActive ? 'text-rose-600 animate-pulse' : ''}`}>{formatTime(timeLeft)}</span>
                <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Match<br/>Timer</span>
              </div>
              <div className="flex gap-2 sm:gap-3">
                {!timerActive ? (
                  <button onClick={startTimer} className="bg-lime-600 text-white p-3 sm:p-4 rounded-2xl shadow-lg active:scale-90"><Play className="size-6 sm:size-7" fill="currentColor" /></button>
                ) : (
                  <button onClick={pauseTimer} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 p-3 sm:p-4 rounded-2xl active:scale-90"><Pause className="size-6 sm:size-7" fill="currentColor" /></button>
                )}
                <button onClick={resetTimer} className="bg-slate-100 dark:bg-slate-700 text-slate-400 p-3 sm:p-4 rounded-2xl active:scale-90"><RotateCcw className="size-6 sm:size-7" /></button>
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <button onClick={() => currentRoundIndex > 0 && setCurrentRoundIndex(currentRoundIndex - 1)} disabled={currentRoundIndex === 0} className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm disabled:opacity-30 border-2 border-slate-100 dark:border-slate-800"><ChevronLeft size={24}/></button>
              <h2 className="font-black text-xl sm:text-2xl italic uppercase tracking-tighter">Round {currentRoundIndex + 1}</h2>
              <button onClick={nextRound} className="p-3 sm:p-4 bg-slate-900 text-white rounded-2xl shadow-lg flex items-center gap-2 font-black text-[10px] sm:text-xs uppercase px-5 sm:px-7">{currentRoundIndex < rounds.length - 1 ? "Next" : "Finish"}</button>
            </div>

            <div className="grid gap-8">
              {rounds[currentRoundIndex].matches.map((m) => (
                <Card key={m.id} className={`relative pt-12 sm:pt-14 pb-6 sm:pb-8 transition-all ${m.completed ? 'opacity-40 scale-[0.98]' : 'border-t-[10px] border-t-lime-500 shadow-2xl'}`}>
                   <div className={`absolute top-0 right-0 px-5 sm:px-7 py-2 rounded-bl-3xl text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest shadow-sm ${m.completed ? 'bg-slate-400' : 'bg-lime-500'}`}>Court {m.court}</div>
                   
                   <div className="flex flex-col gap-6 sm:gap-8">
                      <div className="flex items-center justify-between px-1 sm:px-2">
                        <div className="flex-1 space-y-1 min-w-0">
                          {m.team1.map(p => {
                            const info = getPlayerLabel(p);
                            return <div key={p.id} className="font-black text-lg sm:text-3xl text-slate-800 dark:text-slate-100 truncate">{info.name} <span className="text-[10px] sm:text-[11px] text-slate-400">#{info.number}</span></div>
                          })}
                        </div>
                        <div className="flex items-center shrink-0">
                           <input 
                             type="text" 
                             inputMode="numeric" 
                             value={m.score1} 
                             onFocus={(e) => e.target.select()}
                             onChange={(e) => updateScore(m.id, 1, e.target.value)}
                             disabled={m.completed}
                             className="w-14 h-14 sm:w-24 sm:h-24 text-center text-3xl sm:text-6xl font-black bg-slate-50 dark:bg-slate-900 rounded-2xl border-4 border-transparent focus:border-lime-500 outline-none text-lime-600 transition-all" 
                           />
                        </div>
                      </div>

                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t-2 border-slate-100 dark:border-slate-800"></div>
                        </div>
                        <div className="relative bg-white dark:bg-slate-800 px-4 sm:px-5 py-1 text-[9px] sm:text-[10px] font-black italic uppercase text-slate-400 tracking-[0.3em] border-2 border-slate-100 dark:border-slate-800 rounded-full shadow-sm">
                          vs
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-1 sm:px-2">
                        <div className="flex-1 space-y-1 min-w-0">
                          {m.team2.map(p => {
                            const info = getPlayerLabel(p);
                            return <div key={p.id} className="font-black text-lg sm:text-3xl text-slate-800 dark:text-slate-100 truncate">{info.name} <span className="text-[10px] sm:text-[11px] text-slate-400">#{info.number}</span></div>
                          })}
                        </div>
                        <div className="flex items-center shrink-0">
                           <input 
                             type="text" 
                             inputMode="numeric" 
                             value={m.score2} 
                             onFocus={(e) => e.target.select()}
                             onChange={(e) => updateScore(m.id, 2, e.target.value)}
                             disabled={m.completed}
                             className="w-14 h-14 sm:w-24 sm:h-24 text-center text-3xl sm:text-6xl font-black bg-slate-50 dark:bg-slate-900 rounded-2xl border-4 border-transparent focus:border-lime-500 outline-none text-lime-600 transition-all" 
                           />
                        </div>
                      </div>
                   </div>

                   {!m.completed ? (
                     <button onClick={() => finalizeMatch(m.id)} className="w-full mt-8 sm:mt-10 py-4 sm:py-5 rounded-2xl bg-slate-900 text-white font-black text-[10px] sm:text-sm uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Submit Final Score</button>
                   ) : (
                     <div className="mt-8 sm:mt-10 flex gap-2 sm:gap-3">
                       <div className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 bg-lime-50 dark:bg-lime-900/10 text-lime-600 rounded-2xl font-black text-[10px] sm:text-xs uppercase border-2 border-lime-100/50"> <CheckCircle2 className="size-[18px] sm:size-5"/> Result Locked</div>
                       <button onClick={() => editMatch(m.id)} className="p-3 sm:p-4 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-slate-600 transition-colors"> <Edit2 className="size-[18px] sm:size-5"/></button>
                     </div>
                   )}
                </Card>
              ))}
            </div>

            {rounds[currentRoundIndex].sittingOut.length > 0 && (
              <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900 p-4 sm:p-6 border-l-[8px] border-l-amber-500 shadow-lg">
                <h3 className="text-[10px] sm:text-xs font-black text-amber-600 uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2"> <Clock className="size-4 sm:size-[18px]" /> Resting Squad </h3>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {rounds[currentRoundIndex].sittingOut.map(p => {
                    const info = getPlayerLabel(p);
                    return <span key={p.id} className="bg-white dark:bg-slate-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black shadow-sm text-slate-700 dark:text-slate-200 border border-amber-100">{info.name} <span className="text-[9px] sm:text-[10px] opacity-50">#{info.number}</span></span>
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        {view === 'summary' && rounds.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 gap-3 sm:gap-4">
              <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                <Calendar className="text-lime-600 size-7 sm:size-10" /> Full Schedule
              </h2>
              <div className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                {rounds.length} Total Rounds
              </div>
            </div>

            <div className="px-1">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border-2 border-slate-100 dark:border-slate-700 shadow-xl flex items-center gap-3 sm:gap-4">
                <Filter className="text-lime-600 shrink-0 size-5 sm:size-6" />
                <div className="relative flex-1 min-w-0">
                  <select 
                    value={playerFilter === null ? '' : playerFilter} 
                    onChange={(e) => setPlayerFilter(e.target.value === '' ? null : parseInt(e.target.value))}
                    className="w-full bg-transparent font-black text-sm sm:text-lg outline-none cursor-pointer appearance-none pr-8 truncate"
                  >
                    <option value="">Full Squad Schedule</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (ID: {players.findIndex(pl => pl.id === p.id) + 1})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none size-5" />
                </div>
              </div>
            </div>

            <div className="space-y-10 sm:space-y-12">
              {rounds.map((round, rIdx) => {
                const filteredMatches = playerFilter 
                  ? round.matches.filter(m => [...m.team1, ...m.team2].some(p => p.id === playerFilter))
                  : round.matches;

                const isResting = playerFilter && round.sittingOut.some(p => p.id === playerFilter);
                if (playerFilter && filteredMatches.length === 0 && !isResting) return null;

                return (
                  <div key={`summary-r-${rIdx}`} className="space-y-4 sm:space-y-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <h3 className="text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white bg-slate-900 dark:bg-slate-700 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full shadow-lg">Round {round.number}</h3>
                      <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-800"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                      {filteredMatches.map((match) => (
                        <div key={match.id} className={`bg-white dark:bg-slate-800 rounded-[2rem] p-5 sm:p-8 border-2 transition-all shadow-xl relative overflow-hidden ${playerFilter ? 'border-lime-500 ring-8 sm:ring-[12px] ring-lime-500/10' : 'border-slate-100 dark:border-slate-700'}`}>
                          <div className="flex justify-between items-center mb-4 sm:mb-6 border-b-2 border-slate-50 dark:border-slate-900 pb-2 sm:pb-3">
                            <span className="text-[10px] sm:text-sm font-black text-lime-600 uppercase tracking-widest flex items-center gap-2">
                              <LayoutGrid className="size-[14px] sm:size-4" /> Court {match.court}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-center gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
                              {match.team1.map(p => (
                                <div key={p.id} className={`font-black text-lg sm:text-3xl truncate leading-tight transition-colors ${playerFilter === p.id ? 'text-lime-600 scale-105 origin-center' : 'text-slate-800 dark:text-slate-100'}`}>
                                  {p.name} <span className="text-[10px] sm:text-sm opacity-40 font-black">({getPlayerLabel(p).number})</span>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex flex-col items-center gap-1 sm:gap-2 shrink-0 px-2 sm:px-4">
                              <div className="w-px h-8 sm:h-12 bg-slate-100 dark:bg-slate-800"></div>
                              <span className="text-[9px] sm:text-xs font-black text-slate-300 italic uppercase">vs</span>
                              <div className="w-px h-8 sm:h-12 bg-slate-100 dark:bg-slate-800"></div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
                              {match.team2.map(p => (
                                <div key={p.id} className={`font-black text-lg sm:text-3xl truncate leading-tight transition-colors ${playerFilter === p.id ? 'text-lime-600 scale-105 origin-center' : 'text-slate-800 dark:text-slate-100'}`}>
                                  {p.name} <span className="text-[10px] sm:text-sm opacity-40 font-black">({getPlayerLabel(p).number})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {isResting && (
                      <div className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl p-6 sm:p-8 text-center border-2 border-amber-200/50 shadow-inner flex flex-col items-center gap-2 sm:gap-3">
                        <Clock className="text-amber-500 size-6 sm:size-8" />
                        <span className="text-base sm:text-2xl font-black text-amber-700 dark:text-amber-500 uppercase italic tracking-widest">Resting This Round</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'leaderboard' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
             <div className="flex justify-between items-center px-1">
              <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3"><Trophy className="text-amber-500 size-8 sm:size-10" /> Standings</h2>
            </div>

            <div className="space-y-4">
              {leaderboard.map((p) => (
                <Card key={p.id} className="p-4 sm:p-5 flex items-center gap-4 sm:gap-5 hover:border-lime-300 transition-all shadow-md">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-xl sm:text-3xl shadow-sm ${p.displayRank === 1 ? 'bg-amber-100 text-amber-600 border-2 border-amber-200' : p.displayRank === 2 ? 'bg-slate-100 text-slate-500 border-2 border-slate-200' : p.displayRank === 3 ? 'bg-orange-50 text-orange-600 border-2 border-orange-100' : 'bg-slate-50 text-slate-300'}`}>
                    {p.displayRank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-base sm:text-2xl text-slate-800 dark:text-slate-100 truncate leading-tight">{p.name}</div>
                    <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-black uppercase text-slate-400 mt-1 tracking-widest">
                       <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">{p.wins}W - {p.losses}L</span>
                       <span className={`px-2 py-0.5 rounded-md ${p.diff > 0 ? 'bg-lime-50 text-lime-600' : p.diff < 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50'}`}>{p.diff > 0 ? `+${p.diff}` : p.diff}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase leading-none mb-1 tracking-tighter">Points</div>
                    <div className="font-black text-2xl sm:text-4xl text-lime-600">{p.pointsFor}</div>
                  </div>
                </Card>
              ))}
            </div>

            <button 
              onClick={() => {
                const text = leaderboard.map(p => `${p.displayRank}. ${p.name}: ${p.wins}-${p.losses} (+${p.diff})`).join('\n');
                if (navigator.share) {
                  navigator.share({ title: 'PickleFlow Tournament Results', text: text });
                } else {
                  navigator.clipboard.writeText(text);
                  alert('Copied results to clipboard!');
                }
              }}
              className="w-full py-5 sm:py-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl sm:rounded-3xl font-black uppercase text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
            >
              <Share2 className="size-5 sm:size-6" /> Export Standings
            </button>
          </div>
        )}
      </main>

      {timeLeft === 0 && view === 'play' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in">
          <Card className="max-w-sm w-full text-center space-y-6 sm:space-y-8 border-[6px] border-lime-500 p-8 sm:p-12 shadow-2xl rounded-[2.5rem] sm:rounded-[3rem]">
            <div className="mx-auto bg-lime-100 text-lime-600 w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center animate-bounce shadow-xl">
              <Timer className="size-12 sm:size-16" />
            </div>
            <h2 className="text-4xl sm:text-6xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">Time!</h2>
            <p className="text-slate-500 font-black text-base sm:text-xl leading-snug">Round rotation complete.<br/>Record scores and rotate.</p>
            <button onClick={resetTimer} className="w-full bg-lime-600 text-white py-4 sm:py-6 rounded-2xl sm:rounded-3xl font-black text-xl sm:text-2xl uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Continue</button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default App;
