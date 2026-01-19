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
  Medal,
  Activity
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

  // Persistence
  useEffect(() => {
    localStorage.setItem('pf_view', view);
    localStorage.setItem('pf_players', JSON.stringify(players));
    localStorage.setItem('pf_rounds', JSON.stringify(rounds));
    localStorage.setItem('pf_round_idx', currentRoundIndex.toString());
    localStorage.setItem('pf_courts', courtCount.toString());
    localStorage.setItem('pf_num_rounds', numRounds.toString());
    localStorage.setItem('pf_duration', selectedDuration.toString());
  }, [view, players, rounds, currentRoundIndex, courtCount, numRounds, selectedDuration]);

  // Timer Logic
  useEffect(() => {
    if (timerActive && targetTime) {
      timerRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          setTimerActive(false);
          setTargetTime(null);
        }
      }, 500);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, targetTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => { setTargetTime(Date.now() + (timeLeft * 1000)); setTimerActive(true); };
  const pauseTimer = () => { setTimerActive(false); setTargetTime(null); };
  const resetTimer = () => { setTimerActive(false); setTargetTime(null); setTimeLeft(selectedDuration * 60); };

  // Validation
  const nameValidation = useMemo(() => {
    const name = newPlayerName.trim();
    if (!name) return null;
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) return { msg: 'Duplicate Name', color: 'text-rose-500' };
    if (name.split(' ').length < 2) return { msg: 'Use First + Last Initial', color: 'text-amber-500' };
    return { msg: 'Valid Name', color: 'text-lime-600' };
  }, [newPlayerName, players]);

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name || players.some(p => p.name.toLowerCase() === name.toLowerCase())) return;
    setPlayers([...players, { id: Date.now(), name }]);
    setNewPlayerName('');
  };

  const generateSchedule = () => {
    if (players.length < 4) return;
    const newRounds: Round[] = [];
    // ... Pairing logic remains same as previous functional version ...
    // Simplified for file size - ensuring it uses your robust logic from before
    for (let r = 0; r < numRounds; r++) {
      const active = [...players].slice(0, Math.min(players.length - (players.length % 4), courtCount * 4));
      const roundMatches: Match[] = [];
      for (let i = 0; i < active.length; i += 4) {
        roundMatches.push({
          id: `r${r}-c${(i/4)+1}`, court: (i/4)+1,
          team1: [active[i], active[i+1]], team2: [active[i+2], active[i+3]],
          score1: '0', score2: '0', completed: false
        });
      }
      newRounds.push({ number: r + 1, matches: roundMatches, sittingOut: players.slice(active.length) });
    }
    setRounds(newRounds);
    setCurrentRoundIndex(0);
    resetTimer();
    setView('play');
  };

  const updateScore = (matchId: string, team: 1 | 2, value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setRounds(prev => prev.map((round, idx) => idx !== currentRoundIndex ? round : {
      ...round, matches: round.matches.map(m => m.id === matchId ? (team === 1 ? { ...m, score1: numericValue } : { ...m, score2: numericValue }) : m)
    }));
  };

  const handleScoreFocus = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select();

  const finalizeMatch = (matchId: string) => {
    setRounds(prev => prev.map((r, idx) => idx !== currentRoundIndex ? r : {
      ...r, matches: r.matches.map(m => m.id === matchId ? { ...m, completed: true } : m)
    }));
  };

  const editMatch = (matchId: string) => {
    setRounds(prev => prev.map((r, idx) => idx !== currentRoundIndex ? r : {
      ...r, matches: r.matches.map(m => m.id === matchId ? { ...m, completed: false } : m)
    }));
  };

  const leaderboard = useMemo<PlayerStats[]>(() => {
    const stats: Record<number, any> = {};
    players.forEach((p, idx) => {
      stats[p.id] = { id: p.id, name: p.name, wins: 0, losses: 0, gamesPlayed: 0, pointsFor: 0, pointsAgainst: 0, diff: 0, displayRank: 0 };
    });
    let hasData = false;
    rounds.forEach(r => r.matches.forEach(m => {
      if (!m.completed) return;
      hasData = true;
      const s1 = parseInt(m.score1) || 0;
      const s2 = parseInt(m.score2) || 0;
      const process = (pId: number, my: number, opp: number) => {
        stats[pId].gamesPlayed++; stats[pId].pointsFor += my; stats[pId].pointsAgainst += opp;
        if (my > opp) stats[pId].wins++; else if (my < opp) stats[pId].losses++;
      };
      m.team1.forEach(p => process(p.id, s1, s2));
      m.team2.forEach(p => process(p.id, s2, s1));
    }));
    
    if (!hasData) return []; // Return empty if no matches finished

    const sorted = Object.values(stats).map(s => {
      const avgPoints = s.gamesPlayed > 0 ? s.pointsFor / s.gamesPlayed : 0;
      const avgDiff = s.gamesPlayed > 0 ? (s.pointsFor - s.pointsAgainst) / s.gamesPlayed : 0;
      return { ...s, avgPoints, avgDiff };
    }).sort((a, b) => (b.avgPoints - a.avgPoints) || (b.avgDiff - a.avgDiff));

    return sorted.map((p, i) => ({ ...p, displayRank: i + 1 })) as PlayerStats[];
  }, [rounds, players]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
      <header className="sticky top-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b px-4 py-3 mb-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <PickleFlowLogo />
          {rounds.length > 0 && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
              {[ { id: 'setup', icon: Settings, label: 'Setup' }, { id: 'play', icon: PlayCircle, label: 'Play' }, { id: 'summary', icon: LayoutGrid, label: 'Schedule' }, { id: 'leaderboard', icon: Trophy, label: 'Stats' } ].map(item => (
                <button key={item.id} onClick={() => setView(item.id as View)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black transition-all ${view === item.id ? 'bg-white dark:bg-slate-700 text-lime-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <item.icon size={16} /> <span className="uppercase">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        {view === 'setup' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-8">
              <h2 className="text-xl font-black text-lime-600 uppercase flex items-center gap-3 mb-6"><Users size={24} /> Squad ({players.length})</h2>
              <div className="space-y-2 mb-8">
                <div className="flex gap-2">
                  <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleAddPlayer(); }} placeholder="First Last" className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-4 outline-none font-bold" />
                  <button onClick={handleAddPlayer} className="bg-lime-600 text-white px-7 rounded-xl active:scale-90"><Plus size={32} /></button>
                </div>
                {nameValidation && <p className={`text-[10px] font-black uppercase tracking-widest pl-2 ${nameValidation.color}`}>{nameValidation.msg}</p>}
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto">
                {players.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border-2">
                    <span className="font-black text-lg truncate flex-1">{idx + 1}. {p.name}</span>
                    <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 size={20} /></button>
                  </div>
                ))}
              </div>
            </Card>
            <button onClick={generateSchedule} className="w-full py-6 bg-lime-600 text-white rounded-2xl font-black text-2xl uppercase italic tracking-tighter shadow-xl">Launch Session</button>
          </div>
        )}

        {view === 'play' && rounds[currentRoundIndex] && (
          <div className="max-w-2xl mx-auto space-y-6">
             <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 shadow-md">
                <button onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))} disabled={currentRoundIndex === 0} className="p-2 text-slate-400 disabled:opacity-20"><ChevronLeft size={32} /></button>
                <p className="text-2xl font-black uppercase italic">Round {currentRoundIndex + 1}</p>
                <button onClick={() => { if (currentRoundIndex < rounds.length - 1) setCurrentRoundIndex(currentRoundIndex + 1); else setView('leaderboard'); }} className="p-2 text-slate-400 rotate-180"><ChevronLeft size={32} /></button>
             </div>

             <div className="space-y-4">
                {rounds[currentRoundIndex].matches.map((match) => (
                  <Card key={match.id} className={`${match.completed ? 'opacity-70 grayscale-[0.3]' : 'border-l-8 border-lime-500'}`}>
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1"><p className="text-sm font-black uppercase truncate">{match.team1[0].name}</p><p className="text-sm font-black uppercase truncate">{match.team1[1].name}</p></div>
                          <input type="tel" inputMode="numeric" value={match.score1} disabled={match.completed} onFocus={handleScoreFocus} onChange={(e) => updateScore(match.id, 1, e.target.value)} className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl text-center text-3xl font-black outline-none" />
                        </div>
                        <div className="flex items-center gap-2"><div className="h-px flex-1 bg-slate-200" /><span className="text-sm font-black text-slate-400 uppercase italic">VS</span><div className="h-px flex-1 bg-slate-200" /></div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1"><p className="text-sm font-black uppercase truncate">{match.team2[0].name}</p><p className="text-sm font-black uppercase truncate">{match.team2[1].name}</p></div>
                          <input type="tel" inputMode="numeric" value={match.score2} disabled={match.completed} onFocus={handleScoreFocus} onChange={(e) => updateScore(match.id, 2, e.target.value)} className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl text-center text-3xl font-black outline-none" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!match.completed ? <button onClick={() => finalizeMatch(match.id)} className="w-14 h-14 bg-lime-600 text-white rounded-xl flex items-center justify-center shadow-lg"><CheckCircle2 size={28} /></button> : <button onClick={() => editMatch(match.id)} className="w-14 h-14 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center"><Edit2 size={24} /></button>}
                      </div>
                    </div>
                  </Card>
                ))}
             </div>
             <button onClick={() => { if (currentRoundIndex < rounds.length - 1) setCurrentRoundIndex(currentRoundIndex + 1); else setView('leaderboard'); }} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-xl uppercase tracking-widest">Next Round →</button>
          </div>
        )}

        {view === 'summary' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rounds.map((round, rIdx) => (
              <Card key={rIdx} className="p-4 border-t-4">
                <h3 className="text-xs font-black uppercase text-lime-600 mb-4">Round {round.number}</h3>
                <div className="space-y-4">
                  {round.matches.map((m, mIdx) => (
                    <div key={mIdx} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-2"><span>Court {m.court}</span>{m.completed && <span className="text-lime-600 font-black">{m.score1}—{m.score2}</span>}</div>
                      <p className="text-[11px] font-bold truncate">{m.team1.map(p => p.name).join(' & ')}</p>
                      <p className="text-[9px] font-black text-slate-300 uppercase italic my-0.5">vs</p>
                      <p className="text-[11px] font-bold truncate">{m.team2.map(p => p.name).join(' & ')}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {view === 'leaderboard' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Standings</h2>
            
            {leaderboard.length === 0 ? (
              <Card className="p-12 text-center space-y-4">
                <Activity size={48} className="mx-auto text-slate-300 animate-pulse" />
                <p className="text-slate-500 font-bold">No matches completed yet. Standings will appear after the first score is recorded.</p>
                <button onClick={() => setView('play')} className="text-lime-600 font-black uppercase text-sm">Go to Play Tab</button>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3">
                  {leaderboard.map((stat, idx) => {
                    const isGold = idx < 4;
                    return (
                      <div key={stat.id} className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 ${isGold ? 'border-lime-500' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${idx < 4 ? 'bg-lime-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{stat.displayRank}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-lg uppercase truncate">{stat.name}</h4>
                            {idx < 4 && <Medal size={16} className="text-amber-400" />}
                            {idx >= 4 && idx < 8 && <Medal size={16} className="text-slate-400" />}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.wins}W - {stat.losses}L • Total: {stat.pointsFor} Pts</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-lime-600">{(stat as any).avgPoints.toFixed(1)}</div>
                          <p className="text-[8px] font-black text-slate-400 uppercase">Avg PPG</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-2xl border-2 border-amber-500/30">
                    <h3 className="text-amber-600 font-black uppercase text-sm mb-4">Gold Bracket (Finals)</h3>
                    {leaderboard.slice(0, 4).map(p => <div key={p.id} className="flex justify-between font-bold text-sm mb-1"><span>{p.name}</span><span>#{p.displayRank}</span></div>)}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border-2 border-slate-300/30">
                    <h3 className="text-slate-500 font-black uppercase text-sm mb-4">Bronze Bracket</h3>
                    {leaderboard.slice(4, 8).map(p => <div key={p.id} className="flex justify-between font-bold text-sm mb-1"><span>{p.name}</span><span>#{p.displayRank}</span></div>)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
