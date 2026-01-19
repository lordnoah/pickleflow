import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Trophy,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronLeft,
  PlayCircle,
  Edit2,
  LayoutGrid,
  Medal,
  Activity,
  Download,
  Upload,
  RefreshCw,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { Card } from './components/Card';
import { PickleFlowLogo, DEFAULT_PLAYERS, ROUND_OPTIONS, DURATION_OPTIONS, COURT_OPTIONS } from './constants';
import { Player, Match, Round, PlayerStats, View, TournamentSession } from './types';

const App: React.FC = () => {
  // --- CORE STATE ---
  const [view, setView] = useState<View>(() => {
    try {
      return (localStorage.getItem('pf_view') as View) || 'setup';
    } catch { return 'setup'; }
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('pf_players');
      return saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
    } catch { return DEFAULT_PLAYERS; }
  });

  const [rounds, setRounds] = useState<Round[]>(() => {
    try {
      const saved = localStorage.getItem('pf_rounds');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pf_round_idx');
      return saved ? parseInt(saved) : 0;
    } catch { return 0; }
  });

  const [courtCount, setCourtCount] = useState(() => parseInt(localStorage.getItem('pf_courts') || '3'));
  const [numRounds, setNumRounds] = useState(() => parseInt(localStorage.getItem('pf_num_rounds') || '8'));
  const [selectedDuration, setSelectedDuration] = useState(() => parseInt(localStorage.getItem('pf_duration') || '15'));

  // Timer States
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(selectedDuration * 60);
  const [targetTime, setTargetTime] = useState<number | null>(null);
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PERSISTENCE (AUTOSAVE) ---
  useEffect(() => {
    try {
      setSaveStatus('saving');
      localStorage.setItem('pf_view', view);
      localStorage.setItem('pf_players', JSON.stringify(players));
      localStorage.setItem('pf_rounds', JSON.stringify(rounds));
      localStorage.setItem('pf_round_idx', currentRoundIndex.toString());
      localStorage.setItem('pf_courts', courtCount.toString());
      localStorage.setItem('pf_num_rounds', numRounds.toString());
      localStorage.setItem('pf_duration', selectedDuration.toString());
      const timeout = setTimeout(() => setSaveStatus('saved'), 600);
      return () => clearTimeout(timeout);
    } catch (e) {
      console.error("Autosave failed", e);
    }
  }, [view, players, rounds, currentRoundIndex, courtCount, numRounds, selectedDuration]);

  // --- EXPORT/IMPORT ---
  const exportData = () => {
    const data: TournamentSession = {
      id: `pf_${Date.now()}`,
      date: new Date().toISOString(),
      players,
      rounds,
      config: { courtCount, numRounds, selectedDuration }
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pickleflow_backup_${new Date().toLocaleDateString()}.json`;
    link.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.players && data.rounds) {
          setPlayers(data.players);
          setRounds(data.rounds);
          setView('play');
        }
      } catch (err) { alert("Invalid Backup File"); }
    };
    reader.readAsText(file);
  };

  // --- TIMER LOGIC ---
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

  const toggleTimer = () => {
    if (timerActive) {
      setTimerActive(false);
      setTargetTime(null);
    } else {
      setTargetTime(Date.now() + (timeLeft * 1000));
      setTimerActive(true);
    }
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTargetTime(null);
    setTimeLeft(selectedDuration * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- SCHEDULER (Diversity Optimized) ---
  const generateSchedule = () => {
    if (players.length < 4) return;
    const newRounds: Round[] = [];
    const playCount: Record<number, number> = {};
    const partnerHistory: Record<string, number> = {};
    
    players.forEach(p => {
      playCount[p.id] = 0;
      players.forEach(p2 => {
        if (p.id !== p2.id) partnerHistory[`${Math.min(p.id, p2.id)}-${Math.max(p.id, p2.id)}`] = 0;
      });
    });

    for (let r = 0; r < numRounds; r++) {
      const sorted = [...players].sort((a, b) => playCount[a.id] - playCount[b.id] || Math.random() - 0.5);
      const slotsAvailable = Math.min(players.length - (players.length % 4), courtCount * 4);
      const active = sorted.slice(0, slotsAvailable);
      const sittingOut = sorted.slice(slotsAvailable);
      const available = [...active];
      const roundMatches: Match[] = [];
      let cNum = 1;

      while (available.length >= 4) {
        const group = available.splice(0, 4);
        const pairings = [
          { t1: [group[0], group[1]], t2: [group[2], group[3]] },
          { t1: [group[0], group[2]], t2: [group[1], group[3]] },
          { t1: [group[0], group[3]], t2: [group[1], group[2]] }
        ];
        pairings.sort((a, b) => {
          const getH = (p1: Player, p2: Player) => partnerHistory[`${Math.min(p1.id, p2.id)}-${Math.max(p1.id, p2.id)}`] || 0;
          return (getH(a.t1[0], a.t1[1]) + getH(a.t2[0], a.t2[1])) - (getH(b.t1[0], b.t1[1]) + getH(b.t2[0], b.t2[1]));
        });
        const best = pairings[0];
        best.t1.forEach(p => playCount[p.id]++);
        best.t2.forEach(p => playCount[p.id]++);
        partnerHistory[`${Math.min(best.t1[0].id, best.t1[1].id)}-${Math.max(best.t1[0].id, best.t1[1].id)}`]++;
        partnerHistory[`${Math.min(best.t2[0].id, best.t2[1].id)}-${Math.max(best.t2[0].id, best.t2[1].id)}`]++;
        roundMatches.push({ id: `r${r}-c${cNum}`, court: cNum++, team1: best.t1, team2: best.t2, score1: '0', score2: '0', completed: false });
      }
      newRounds.push({ number: r + 1, matches: roundMatches, sittingOut });
    }
    setRounds(newRounds);
    setCurrentRoundIndex(0);
    resetTimer();
    setView('play');
  };

  const updateScore = (matchId: string, team: 1 | 2, value: string) => {
    const val = value.replace(/\D/g, '');
    setRounds(prev => prev.map((round, idx) => idx !== currentRoundIndex ? round : {
      ...round, matches: round.matches.map(m => m.id === matchId ? (team === 1 ? { ...m, score1: val } : { ...m, score2: val }) : m)
    }));
  };

  const leaderboard = useMemo<PlayerStats[]>(() => {
    const stats: Record<number, any> = {};
    if (!players.length) return [];
    players.forEach(p => stats[p.id] = { id: p.id, name: p.name, wins: 0, losses: 0, gamesPlayed: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 });
    rounds.forEach(r => r.matches.forEach(m => {
      if (!m.completed) return;
      const s1 = parseInt(m.score1) || 0, s2 = parseInt(m.score2) || 0;
      m.team1.forEach(p => { if(stats[p.id]) { stats[p.id].gamesPlayed++; stats[p.id].pointsFor += s1; stats[p.id].pointsAgainst += s2; if(s1 > s2) stats[p.id].wins++; else if(s1 < s2) stats[p.id].losses++; }});
      m.team2.forEach(p => { if(stats[p.id]) { stats[p.id].gamesPlayed++; stats[p.id].pointsFor += s2; stats[p.id].pointsAgainst += s1; if(s2 > s1) stats[p.id].wins++; else if(s2 < s1) stats[p.id].losses++; }});
    }));
    return Object.values(stats).filter((s:any) => s.gamesPlayed > 0).map((s: any) => ({
      ...s, avgPoints: s.pointsFor / s.gamesPlayed
    })).sort((a, b) => b.avgPoints - a.avgPoints).map((p, i) => ({ ...p, displayRank: i + 1 })) as PlayerStats[];
  }, [rounds, players]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 overflow-x-hidden font-sans">
      <header className="sticky top-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <PickleFlowLogo />
            <div className="flex items-center gap-3">
              <button onClick={exportData} className="flex flex-col items-center text-slate-400 hover:text-lime-600">
                <Download size={18} /><span className="text-[8px] font-black uppercase">Backup</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-slate-400 hover:text-lime-600">
                <Upload size={18} /><span className="text-[8px] font-black uppercase">Restore</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />
              <button onClick={() => confirm("Reset all data?") && (localStorage.clear() || window.location.reload())} className="flex flex-col items-center text-slate-400 hover:text-rose-500">
                <RefreshCw size={18} /><span className="text-[8px] font-black uppercase">Wipe</span>
              </button>
            </div>
          </div>
          {rounds.length > 0 && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {[ { id: 'setup', icon: Settings, label: 'Setup' }, { id: 'play', icon: PlayCircle, label: 'Play' }, { id: 'summary', icon: LayoutGrid, label: 'Schedule' }, { id: 'leaderboard', icon: Trophy, label: 'Stats' } ].map(item => (
                <button key={item.id} onClick={() => setView(item.id as View)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black transition-all ${view === item.id ? 'bg-white dark:bg-slate-700 text-lime-600 shadow-sm' : 'text-slate-500'}`}>
                  <item.icon size={16} /> <span className="uppercase">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-4">
        {view === 'setup' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-black text-lime-600 uppercase flex items-center gap-3 mb-6"><Users size={24} /> Players ({players.length})</h2>
              <div className="flex gap-2 mb-6">
                <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]) || setNewPlayerName(''))} placeholder="Enter Name" className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-4 outline-none font-bold" />
                <button onClick={() => { if(newPlayerName.trim()) { setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]); setNewPlayerName(''); }}} className="bg-lime-600 text-white px-7 rounded-xl active:scale-95 transition-transform"><Plus size={32} /></button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto">
                {players.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-black truncate flex-1">{idx + 1}. {p.name}</span>
                    <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 size={20} /></button>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase">Rounds</h3>
                <select value={numRounds} onChange={(e) => setNumRounds(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">{ROUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase">Min / Round</h3>
                <select value={selectedDuration} onChange={(e) => {setSelectedDuration(parseInt(e.target.value)); setTimeLeft(parseInt(e.target.value)*60);}} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">{DURATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase">Courts</h3>
                <select value={courtCount} onChange={(e) => setCourtCount(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">{COURT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
              </div>
            </div>
            <button onClick={generateSchedule} className="w-full py-6 bg-lime-600 text-white rounded-2xl font-black text-2xl uppercase italic tracking-tighter shadow-xl">Start Session</button>
          </div>
        )}

        {view === 'play' && rounds[currentRoundIndex] && (
          <div className="max-w-2xl mx-auto space-y-6">
             <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <button onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))} disabled={currentRoundIndex === 0} className="p-2 text-slate-400 disabled:opacity-20"><ChevronLeft size={32} /></button>
                  <div className="text-center"><p className="text-2xl font-black uppercase italic">Round {currentRoundIndex + 1}</p></div>
                  <button onClick={() => currentRoundIndex < rounds.length - 1 ? (setCurrentRoundIndex(currentRoundIndex + 1) || resetTimer()) : setView('leaderboard')} className="p-2 text-slate-400 rotate-180"><ChevronLeft size={32} /></button>
                </div>
                
                {/* ROUND TIMER */}
                <div className="flex items-center justify-center gap-6 bg-slate-50 dark:bg-slate-800/50 py-4 rounded-xl border border-dashed">
                  <button onClick={resetTimer} className="text-slate-400 hover:text-rose-500"><RotateCcw size={20}/></button>
                  <div className="text-4xl font-black font-mono tracking-widest text-lime-600">{formatTime(timeLeft)}</div>
                  <button onClick={toggleTimer} className={`w-12 h-12 rounded-full flex items-center justify-center ${timerActive ? 'bg-amber-100 text-amber-600' : 'bg-lime-100 text-lime-600'}`}>
                    {timerActive ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor" className="ml-1"/>}
                  </button>
                </div>
             </div>

             <div className="space-y-4">
                {rounds[currentRoundIndex].matches.map((match) => (
                  <Card key={match.id} className={`${match.completed ? 'opacity-70 bg-slate-50' : 'border-l-8 border-lime-500'}`}>
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                        <span>Court {match.court}</span>
                        {match.completed && <span className="text-lime-600 italic">Game Completed</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex-1 font-black uppercase text-sm leading-tight">{match.team1[0]?.name}<br/>{match.team1[1]?.name}</div>
                            <input type="tel" value={match.score1} onChange={(e) => updateScore(match.id, 1, e.target.value)} onFocus={(e) => e.target.select()} className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl text-center text-3xl font-black outline-none border-2 border-transparent focus:border-lime-500" />
                          </div>
                          <div className="h-px bg-slate-200 dark:bg-slate-800 w-full" />
                          <div className="flex justify-between items-center">
                            <div className="flex-1 font-black uppercase text-sm leading-tight">{match.team2[0]?.name}<br/>{match.team2[1]?.name}</div>
                            <input type="tel" value={match.score2} onChange={(e) => updateScore(match.id, 2, e.target.value)} onFocus={(e) => e.target.select()} className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl text-center text-3xl font-black outline-none border-2 border-transparent focus:border-lime-500" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          {match.completed ? (
                            <button onClick={() => setRounds(prev => prev.map(r => ({...r, matches: r.matches.map(m => m.id === match.id ? {...m, completed: false} : m)})))} className="flex flex-col items-center gap-1 text-slate-400 hover:text-lime-600">
                              <Edit2 size={24}/><span className="text-[8px] font-black uppercase">Edit</span>
                            </button>
                          ) : (
                            <button onClick={() => setRounds(prev => prev.map(r => ({...r, matches: r.matches.map(m => m.id === match.id ? {...m, completed: true} : m)})))} className="bg-lime-600 text-white px-3 py-6 rounded-xl font-black text-[10px] uppercase vertical-rl tracking-widest shadow-lg hover:bg-lime-700 active:scale-95 transition-all">
                              Add Final Score
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
             </div>
             <button onClick={() => currentRoundIndex < rounds.length - 1 ? (setCurrentRoundIndex(currentRoundIndex + 1) || resetTimer()) : setView('leaderboard')} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-xl uppercase tracking-widest shadow-xl">Next Round →</button>
          </div>
        )}

        {view === 'summary' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rounds.map((round, rIdx) => (
              <Card key={rIdx} className={`p-4 border-t-4 ${rIdx === currentRoundIndex ? 'border-lime-500 bg-lime-50/30' : 'border-slate-200'}`}>
                <h3 className="text-xs font-black uppercase text-lime-600 mb-4 flex justify-between">Round {round.number} {rIdx === currentRoundIndex && <span className="text-[8px] animate-pulse">ACTIVE</span>}</h3>
                <div className="space-y-4">
                  {round.matches.map((m, mIdx) => (
                    <div key={mIdx} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between text-[9px] text-slate-400 mb-1"><span>Court {m.court}</span>{m.completed && <span className="text-lime-600 font-black">{m.score1}-{m.score2}</span>}</div>
                      <p className="text-[10px] font-bold truncate">{m.team1.map(p => p.name).join(' & ')}</p>
                      <p className="text-[10px] font-bold truncate">{m.team2.map(p => p.name).join(' & ')}</p>
                    </div>
                  ))}
                  {round.sittingOut && round.sittingOut.length > 0 && (
                    <div className="pt-2 border-t mt-2"><p className="text-[8px] font-black text-slate-400 uppercase">Resting</p><p className="text-[9px] font-bold text-slate-500 truncate">{round.sittingOut.map(p => p.name).join(', ')}</p></div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {view === 'leaderboard' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Standings</h2>
            {leaderboard.length === 0 ? (
              <Card className="p-12 text-center text-slate-500 font-bold uppercase tracking-tight"><Activity size={48} className="mx-auto mb-4 opacity-20"/>No data yet.</Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 pb-20">
                {leaderboard.map((stat, idx) => (
                  <div key={stat.id} className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 ${idx < 4 ? 'border-lime-500' : 'border-slate-100'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${idx < 4 ? 'bg-lime-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{stat.displayRank}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-lg uppercase truncate flex items-center gap-2">{stat.name} {idx < 4 && <Medal size={16} className="text-amber-400" />}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.wins}W - {stat.losses}L • {stat.pointsFor} Total Pts</p>
                    </div>
                    <div className="text-right font-black text-lime-600">{stat.avgPoints.toFixed(1)}<p className="text-[8px] text-slate-400 uppercase">PPG</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
