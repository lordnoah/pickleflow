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
  X,
  Medal
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
  }, [view, players, rounds, currentRoundIndex, courtCount, numRounds, selectedDuration]);

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
    setTargetTime(Date.now() + (timeLeft * 1000));
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

  // PLAYER VALIDATION LOGIC
  const nameValidation = useMemo(() => {
    const name = newPlayerName.trim();
    if (!name) return null;
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return { msg: 'Name already exists', color: 'text-rose-500' };
    }
    if (name.split(' ').length < 2) {
      return { msg: 'Use First + Last Initial', color: 'text-amber-500' };
    }
    return { msg: 'Name looks good!', color: 'text-lime-600' };
  }, [newPlayerName, players]);

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setError("Duplicate name detected.");
      setTimeout(() => setError(''), 3000);
      return;
    }
    setPlayers([...players, { id: Date.now(), name }]);
    setNewPlayerName('');
  };

  const handleEditPlayerName = (id: number, newName: string) => {
    setPlayers(players.map(p => p.id === id ? { ...p, name: newName } : p));
  };

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
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setSuccessMessage('Session Ended');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    });
  };

  const requestClearAllPlayers = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Wipe Squad?',
      message: 'This will remove all players from the active roster.',
      variant: 'danger',
      onConfirm: () => {
        setPlayers([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

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
    resetTimer();
    setView('play');
    createSnapshot(`RR Start - ${players.length} Players`);
  };

  const updateScore = (matchId: string, team: 1 | 2, value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setRounds(prev => prev.map((round, idx) => idx !== currentRoundIndex ? round : {
      ...round,
      matches: round.matches.map(m => m.id === matchId ? (team === 1 ? { ...m, score1: numericValue } : { ...m, score2: numericValue }) : m)
    }));
  };

  const finalizeMatch = (matchId: string) => {
    setRounds(prev => prev.map((r, idx) => idx !== currentRoundIndex ? r : {
      ...r,
      matches: r.matches.map(m => m.id === matchId ? { ...m, completed: true } : m)
    }));
    createSnapshot();
  };

  const editMatch = (matchId: string) => {
    setRounds(prev => prev.map((r, idx) => idx !== currentRoundIndex ? r : {
      ...r,
      matches: r.matches.map(m => m.id === matchId ? { ...m, completed: false } : m)
    }));
  };

  const exportTournament = () => {
    const data = { players, rounds, currentRoundIndex, exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pickleflow_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const leaderboard = useMemo<PlayerStats[]>(() => {
    const stats: Record<number, any> = {};
    const h2h: Record<string, number> = {};
    players.forEach((p, idx) => {
      stats[p.id] = { id: p.id, name: p.name, number: idx + 1, wins: 0, losses: 0, gamesPlayed: 0, pointsFor: 0, pointsAgainst: 0, diff: 0, displayRank: 0 };
    });
    rounds.forEach(r => r.matches.forEach(m => {
      if (!m.completed) return;
      const s1 = parseInt(m.score1) || 0;
      const s2 = parseInt(m.score2) || 0;
      const processPlayer = (pId: number, myScore: number, oppScore: number) => {
        stats[pId].gamesPlayed++;
        stats[pId].pointsFor += myScore;
        stats[pId].pointsAgainst += oppScore;
        if (myScore > oppScore) stats[pId].wins++;
        else if (myScore < oppScore) stats[pId].losses++;
      };
      m.team1.forEach(p => processPlayer(p.id, s1, s2));
      m.team2.forEach(p => processPlayer(p.id, s2, s1));
    }));
    const sorted = Object.values(stats).map(s => {
      const avgPoints = s.gamesPlayed > 0 ? s.pointsFor / s.gamesPlayed : 0;
      const avgDiff = s.gamesPlayed > 0 ? (s.pointsFor - s.pointsAgainst) / s.gamesPlayed : 0;
      return { ...s, avgPoints, avgDiff, diff: s.pointsFor - s.pointsAgainst };
    }).sort((a, b) => (b.avgPoints - a.avgPoints) || (b.avgDiff - a.avgDiff));
    let rank = 1;
    return sorted.map((p, i) => {
      if (i > 0 && (p.avgPoints !== sorted[i - 1].avgPoints || p.avgDiff !== sorted[i - 1].avgDiff)) rank = i + 1;
      return { ...p, displayRank: rank };
    }) as PlayerStats[];
  }, [rounds, players]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 pt-1 sm:pt-4 overflow-x-hidden">
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <Card className="max-w-sm w-full space-y-6 p-8 shadow-2xl rounded-[2rem] border-4 border-slate-100 dark:border-slate-800">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">{confirmModal.title}</h2>
            <p className="text-slate-500 font-bold text-base leading-snug">{confirmModal.message}</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmModal.onConfirm} className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg ${confirmModal.variant === 'danger' ? 'bg-rose-600 text-white' : 'bg-lime-600 text-white'}`}>Confirm Action</button>
              <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Cancel</button>
            </div>
          </Card>
        </div>
      )}

      <header className="sticky top-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 mb-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <PickleFlowLogo />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700">
                {saveStatus === 'saving' ? <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" /> : <div className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse" />}
                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">Auto-Sync</span>
              </div>
            </div>
          </div>
          {rounds.length > 0 && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700 overflow-hidden">
              {[
                { id: 'setup', icon: Settings, label: 'Setup' },
                { id: 'play', icon: PlayCircle, label: 'Play' },
                { id: 'summary', icon: LayoutGrid, label: 'Schedule' },
                { id: 'leaderboard', icon: Trophy, label: 'Stats' }
              ].map(item => (
                <button key={item.id} onClick={() => setView(item.id as View)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black transition-all ${view === item.id ? 'bg-white dark:bg-slate-700 text-lime-600 shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                  <item.icon size={16} /> <span className="uppercase tracking-tight truncate">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-4">
        {(error || successMessage) && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] w-[90%] max-w-sm">
            <div className={`${error ? 'bg-rose-600' : 'bg-lime-600'} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-bold border-2 border-white/20`}>
              {error ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />} {error || successMessage}
            </div>
          </div>
        )}

        {view === 'setup' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-4 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-lime-600 uppercase flex items-center gap-3"><Users size={24} /> Squad ({players.length})</h2>
                <button onClick={requestClearAllPlayers} className="text-[10px] font-black text-slate-400 hover:text-rose-500 flex items-center gap-1.5 uppercase transition-colors"><UserMinus size={14} /> Wipe</button>
              </div>
              <div className="space-y-2 mb-8">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newPlayerName} 
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') handleAddPlayer(); }}
                    placeholder="E.g. David M." 
                    className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-lime-500 font-bold text-lg" 
                  />
                  <button onClick={handleAddPlayer} className="bg-lime-600 text-white px-7 rounded-xl shadow-lg active:scale-90 transition-transform"><Plus size={32} /></button>
                </div>
                {nameValidation && <p className={`text-[10px] font-black uppercase tracking-widest pl-2 ${nameValidation.color}`}>{nameValidation.msg}</p>}
              </div>
              <div className="grid grid-cols-1 gap-2.5 max-h-[40vh] overflow-y-auto pr-1">
                {players.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3.5 pl-5 rounded-xl border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <span className="text-sm font-black text-slate-300">#{idx + 1}</span>
                      <input type="text" value={p.name} onChange={(e) => handleEditPlayerName(p.id, e.target.value)} className="bg-transparent border-none outline-none font-black text-lg text-slate-800 dark:text-slate-100 w-full" />
                    </div>
                    <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 size={20} /></button>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border-2 border-slate-100 dark:border-slate-700 shadow-sm text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-2">Rounds</h3>
                <select value={numRounds} onChange={(e) => setNumRounds(parseInt(e.target.value))} className="w-full bg-transparent font-black text-2xl text-lime-600 outline-none cursor-pointer">{ROUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border-2 border-slate-100 dark:border-slate-700 shadow-sm text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-2">Time</h3>
                <select value={selectedDuration} onChange={(e) => setSelectedDuration(parseInt(e.target.value))} className="w-full bg-transparent font-black text-2xl text-lime-600 outline-none cursor-pointer">{DURATION_OPTIONS.map(o => <option key={o} value={o}>{o}m</option>)}</select>
              </div>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border-2 border-slate-100 dark:border-slate-700 shadow-sm text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-2">Courts</h3>
                <select value={courtCount} onChange={(e) => setCourtCount(parseInt(e.target.value))} className="w-full bg-transparent font-black text-2xl text-lime-600 outline-none cursor-pointer">{COURT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
              </div>
            </div>

            <button onClick={generateSchedule} className="w-full py-6 bg-lime-600 text-white rounded-2xl font-black text-2xl uppercase italic tracking-tighter shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-4">
              <Play className="fill-current" size={28} /> {rounds.length > 0 ? "Regenerate" : "Launch Session"}
            </button>
          </div>
        )}

        {view === 'play' && rounds[currentRoundIndex] && (
          <div className="max-w-2xl mx-auto space-y-6">
             <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-md">
                <button onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))} disabled={currentRoundIndex === 0} className="p-2 text-slate-400 hover:text-lime-600 disabled:opacity-30"><ChevronLeft size={32} /></button>
                <p className="text-2xl font-black italic uppercase tracking-tighter">Round {currentRoundIndex + 1}</p>
                <button onClick={() => { if (currentRoundIndex < rounds.length - 1) setCurrentRoundIndex(currentRoundIndex + 1); else setView('leaderboard'); }} className="p-2 text-slate-400 hover:text-lime-600 rotate-180"><ChevronLeft size={32} /></button>
             </div>

             <Card className="p-6 border-b-8 border-lime-600 flex flex-col items-center">
                <div className="text-6xl sm:text-7xl font-black tabular-nums tracking-tighter mb-4 flex items-center gap-4">
                  <Timer className={`${timerActive ? 'text-lime-500 animate-pulse' : 'text-slate-300'}`} size={48} /> {formatTime(timeLeft)}
                </div>
                <div className="flex gap-3 w-full">
                  {!timerActive ? <button onClick={startTimer} className="flex-1 py-4 bg-lime-600 text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2">Start Round</button> : <button onClick={pauseTimer} className="flex-1 py-4 bg-amber-500 text-white rounded-xl font-black uppercase tracking-widest">Pause</button>}
                  <button onClick={resetTimer} className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl"><RotateCcw size={20} /></button>
                </div>
             </Card>

             <div className="space-y-4">
                {rounds[currentRoundIndex].matches.map((match) => (
                  <Card key={match.id} className={`${match.completed ? 'opacity-70 grayscale-[0.3]' : 'border-l-8 border-lime-500'}`}>
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-2">
                            {match.team1.map(p => <p key={p.id} className="text-sm font-black uppercase tracking-tight truncate max-w-[140px]">{p.name}</p>)}
                          </div>
                          <input type="number" value={match.score1} disabled={match.completed} onChange={(e) => updateScore(match.id, 1, e.target.value)} className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl text-center text-3xl font-black outline-none" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                          <span className="text-xs font-black text-slate-400 uppercase italic">VS</span>
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-2">
                            {match.team2.map(p => <p key={p.id} className="text-sm font-black uppercase tracking-tight truncate max-w-[140px]">{p.name}</p>)}
                          </div>
                          <input type="number" value={match.score2} disabled={match.completed} onChange={(e) => updateScore(match.id, 2, e.target.value)} className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl text-center text-3xl font-black outline-none" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!match.completed ? <button onClick={() => finalizeMatch(match.id)} className="w-14 h-14 bg-lime-600 text-white rounded-xl flex items-center justify-center shadow-lg"><CheckCircle2 size={28} /></button> : <button onClick={() => editMatch(match.id)} className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center"><Edit2 size={24} /></button>}
                      </div>
                    </div>
                  </Card>
                ))}
             </div>
             
             <button onClick={() => { createSnapshot(); if (currentRoundIndex < rounds.length - 1) { setCurrentRoundIndex(prev => prev + 1); resetTimer(); } else setView('leaderboard'); }} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-xl uppercase tracking-widest">Next Phase →</button>
          </div>
        )}

        {view === 'summary' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rounds.map((round, rIdx) => (
              <Card key={rIdx} className="p-4 border-t-4 border-slate-200">
                <h3 className="text-xs font-black uppercase text-lime-600 mb-4 flex justify-between items-center">Round {round.number} {rIdx === currentRoundIndex && <span className="text-[8px] bg-lime-500 text-white px-2 py-0.5 rounded">Active</span>}</h3>
                <div className="space-y-4">
                  {round.matches.map((m, mIdx) => (
                    <div key={mIdx} className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between text-slate-400 mb-2"><span>Court {m.court}</span>{m.completed && <span className="text-lime-600">{m.score1}—{m.score2}</span>}</div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[11px] truncate">{m.team1.map(p => p.name).join(' & ')}</p>
                        <p className="text-[9px] font-black text-slate-300 uppercase italic">vs</p>
                        <p className="text-[11px] truncate">{m.team2.map(p => p.name).join(' & ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {view === 'leaderboard' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Standings</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sorted by Avg PPG + Avg Diff</p>
              </div>
              <button onClick={() => window.print()} className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase shadow-sm border"><Download size={14} className="inline mr-2" /> PDF</button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {leaderboard.map((stat, idx) => {
                const isGold = idx < 4;
                const isBronze = idx >= 4 && idx < 8;
                return (
                  <div key={stat.id} className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all ${isGold ? 'border-lime-500 shadow-lg shadow-lime-500/5' : 'border-slate-100 dark:border-slate-800'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${idx < 4 ? 'bg-lime-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      {stat.displayRank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-lg uppercase tracking-tight truncate">{stat.name}</h4>
                        {isGold && <Medal size={16} className="text-amber-400" />}
                        {isBronze && <Medal size={16} className="text-slate-400" />}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {stat.wins}W - {stat.losses}L • Total: {stat.pointsFor} Pts
                      </p>
                      {idx === 0 && <span className="text-[8px] font-black bg-lime-100 text-lime-700 px-2 py-0.5 rounded">GOLD SEED #1</span>}
                      {idx === 4 && <span className="text-[8px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded">BRONZE SEED #1</span>}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-lime-600 tabular-nums">{(stat as any).avgPoints.toFixed(1)}</div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Avg PPG</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
               <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-2xl border-2 border-amber-500/30">
                  <h3 className="text-amber-600 font-black uppercase text-sm mb-4">Gold Bracket (Finals)</h3>
                  <div className="space-y-2">
                    {leaderboard.slice(0, 4).map(p => (
                      <div key={p.id} className="flex justify-between font-bold text-sm"><span>{p.name}</span> <span className="text-amber-600">#{p.displayRank}</span></div>
                    ))}
                  </div>
               </div>
               <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border-2 border-slate-300/30">
                  <h3 className="text-slate-500 font-black uppercase text-sm mb-4">Bronze Bracket</h3>
                  <div className="space-y-2">
                    {leaderboard.slice(4, 8).map(p => (
                      <div key={p.id} className="flex justify-between font-bold text-sm"><span>{p.name}</span> <span className="text-slate-500">#{p.displayRank}</span></div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
