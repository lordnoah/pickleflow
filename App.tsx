import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Trophy,
  Settings,
  Play,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronLeft,
  AlertCircle,
  Timer,
  Pause,
  PlayCircle,
  Edit2,
  Share2
} from 'lucide-react';
import { Card } from './components/Card';
import { PickleFlowLogo, DEFAULT_PLAYERS, ROUND_OPTIONS, DURATION_OPTIONS, COURT_OPTIONS } from './constants';
import { Player, Match, Round, PlayerStats, View } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<View>('setup');
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('pickleflow_players');
    return saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
  });
  const [newPlayerName, setNewPlayerName] = useState('');
  const [error, setError] = useState('');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [courtCount, setCourtCount] = useState(3);
  const [numRounds, setNumRounds] = useState(8);

  // Timer States
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins default (900s)
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('pickleflow_players', JSON.stringify(players));
  }, [players]);

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

  // Update timeLeft when selectedDuration changes in setup
  useEffect(() => {
    if (view === 'setup') {
      setTimeLeft(selectedDuration * 60);
    }
  }, [selectedDuration, view]);

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

  const generateSchedule = () => {
    if (players.length < 4) {
      setError("Add at least 4 players.");
      setTimeout(() => setError(''), 3000);
      return;
    }

    const newRounds: Round[] = [];
    const playCount: Record<number, number> = {};
    const meetCount: Record<string, number> = {};
    
    players.forEach(p => {
      playCount[p.id] = 0;
      players.forEach(p2 => {
        if (p.id !== p2.id) meetCount[[p.id, p2.id].sort().join('-')] = 0;
      });
    });

    for (let r = 0; r < numRounds; r++) {
      const sortedByPlay = [...players].sort((a, b) => 
        (playCount[a.id] - playCount[b.id]) || (Math.random() - 0.5)
      );
      const maxPlayers = Math.min(players.length - (players.length % 4), courtCount * 4);
      const active = sortedByPlay.slice(0, maxPlayers);
      const sittingOut = sortedByPlay.slice(maxPlayers);
      const available = [...active];
      const roundMatches: Match[] = [];
      let courtIdx = 1;

      while (available.length >= 4) {
        const p1 = available.shift()!;
        available.sort((a, b) => (meetCount[[p1.id, a.id].sort().join('-')] - meetCount[[p1.id, b.id].sort().join('-')]) || (Math.random() - 0.5));
        const p2 = available.shift()!;
        const p3 = available.shift()!;
        const p4 = available.shift()!;
        const group = [p1, p2, p3, p4];
        group.forEach(p => playCount[p.id]++);
        for (let i = 0; i < 4; i++) {
          for (let j = i + 1; j < 4; j++) {
            meetCount[[group[i].id, group[j].id].sort().join('-')]++;
          }
        }
        const shuffled = [...group].sort(() => Math.random() - 0.5);
        roundMatches.push({
          id: `r${r}-c${courtIdx}`,
          court: courtIdx++,
          team1: [shuffled[0], shuffled[1]],
          team2: [shuffled[2], shuffled[3]],
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
    setRounds(prev => prev.map((r, idx) => idx !== currentRoundIndex ? r : {
      ...r,
      matches: r.matches.map(m => m.id === matchId ? { ...m, completed: true } : m)
    }));
  };

  const editMatch = (matchId: string) => {
    setRounds(prev => prev.map((r, idx) => idx !== currentRoundIndex ? r : {
      ...r,
      matches: r.matches.map(m => m.id === matchId ? { ...m, completed: false } : m)
    }));
  };

  const nextRound = () => {
    if (currentRoundIndex < rounds.length - 1) {
      setCurrentRoundIndex(prev => prev + 1);
      resetTimer();
    } else {
      setView('leaderboard');
    }
    window.scrollTo(0, 0);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-8 pt-4">
      {/* Top Header */}
      <header className="sticky top-0 z-[60] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:py-5 mb-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <PickleFlowLogo />
            {rounds.length > 0 && view === 'play' && (
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-slate-500">
                Round {currentRoundIndex + 1}/{rounds.length}
              </div>
            )}
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner">
            {[
              { id: 'setup', icon: Settings, label: 'Setup' },
              { id: 'play', icon: PlayCircle, label: 'Play' },
              { id: 'leaderboard', icon: Trophy, label: 'Stats' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id as View)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${view === item.id ? 'bg-white dark:bg-slate-700 text-lime-600 shadow-sm scale-[1.02]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                <item.icon size={20} />
                <span className="uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 pb-4">
        {error && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] w-[90%] max-w-sm animate-in fade-in slide-in-from-top-4">
            <div className="bg-rose-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-base border-2 border-white/20">
              <AlertCircle size={24} className="shrink-0" /> {error}
            </div>
          </div>
        )}

        {view === 'setup' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <Card className="p-6">
              <h2 className="text-lg font-black text-lime-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users size={24} /> Squad ({players.length})
              </h2>
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newPlayerName} 
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter' && newPlayerName.trim()) { setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]); setNewPlayerName(''); }}}
                  placeholder="Player Name..." 
                  className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-lime-500 font-bold text-lg" 
                />
                <button 
                  onClick={() => { if(newPlayerName.trim()) { setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]); setNewPlayerName(''); } }} 
                  className="bg-lime-600 text-white px-6 rounded-xl shadow-lg active:scale-90 transition-transform"
                > 
                  <Plus size={28} /> 
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
                {players.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 pl-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-slate-300 w-5">{idx + 1}</span>
                      <input 
                        type="text" 
                        value={p.name} 
                        onChange={(e) => handleEditPlayerName(p.id, e.target.value)} 
                        className="bg-transparent border-none outline-none font-bold text-lg w-full" 
                      />
                    </div>
                    <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-slate-300 hover:text-rose-500 p-3"> <Trash2 size={20} /> </button>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Rounds</h3>
                <select value={numRounds} onChange={(e) => setNumRounds(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">
                  {ROUND_OPTIONS.map(o => <option key={o} value={o}>{o} Rounds</option>)}
                </select>
              </Card>
              <Card className="p-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Duration</h3>
                <select value={selectedDuration} onChange={(e) => setSelectedDuration(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">
                  {DURATION_OPTIONS.map(o => <option key={o} value={o}>{o} Mins</option>)}
                </select>
              </Card>
              <Card className="p-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Courts</h3>
                <select value={courtCount} onChange={(e) => setCourtCount(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">
                  {COURT_OPTIONS.map(o => <option key={o} value={o}>{o} Courts</option>)}
                </select>
              </Card>
            </div>

            <button onClick={generateSchedule} className="w-full py-6 rounded-2xl bg-lime-600 text-white font-black text-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest">Start Rotation</button>
          </div>
        )}

        {view === 'play' && rounds.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Timer Strip */}
            <div className={`sticky top-32 z-50 flex items-center justify-between p-4 rounded-2xl shadow-xl transition-all border-l-8 ${timeLeft === 0 ? 'bg-rose-50 border-rose-500' : timerActive ? 'bg-white dark:bg-slate-800 border-lime-500' : 'bg-slate-200 border-slate-400'}`}>
              <div className="flex items-center gap-4">
                <span className={`text-5xl font-black tabular-nums tracking-tighter ${timeLeft < 60 && timerActive ? 'text-rose-600 animate-pulse' : ''}`}>{formatTime(timeLeft)}</span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Match<br/>Clock</span>
              </div>
              <div className="flex gap-3">
                {!timerActive ? (
                  <button onClick={startTimer} className="bg-lime-600 text-white p-4 rounded-2xl shadow-md active:scale-90"><Play size={28} fill="currentColor" /></button>
                ) : (
                  <button onClick={pauseTimer} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 p-4 rounded-2xl active:scale-90"><Pause size={28} fill="currentColor" /></button>
                )}
                <button onClick={resetTimer} className="bg-slate-100 dark:bg-slate-700 text-slate-400 p-4 rounded-2xl active:scale-90"><RotateCcw size={28} /></button>
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <button onClick={() => currentRoundIndex > 0 && setCurrentRoundIndex(currentRoundIndex - 1)} disabled={currentRoundIndex === 0} className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm disabled:opacity-30 border-2 border-slate-100 dark:border-slate-700"><ChevronLeft size={28}/></button>
              <h2 className="font-black text-2xl italic uppercase tracking-tighter">Round {currentRoundIndex + 1}</h2>
              <button onClick={nextRound} className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg flex items-center gap-2 font-black text-sm uppercase px-6">{currentRoundIndex < rounds.length - 1 ? "Next" : "Finish"}</button>
            </div>

            <div className="grid gap-6">
              {rounds[currentRoundIndex].matches.map((m) => (
                <Card key={m.id} className={`relative pt-14 pb-6 transition-all ${m.completed ? 'opacity-40 scale-[0.97]' : 'border-t-8 border-t-lime-500 shadow-xl'}`}>
                   <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-xs font-black text-white uppercase tracking-widest shadow-sm ${m.completed ? 'bg-slate-400' : 'bg-lime-500'}`}>Court {m.court}</div>
                   
                   <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex-1 space-y-1">
                          {m.team1.map(p => {
                            const info = getPlayerLabel(p);
                            return <div key={p.id} className="font-black text-2xl text-slate-800 dark:text-slate-100">{info.name} <span className="text-xs text-slate-400">#{info.number}</span></div>
                          })}
                        </div>
                        <div className="flex items-center">
                           <input 
                             type="text" 
                             inputMode="numeric" 
                             value={m.score1} 
                             onFocus={(e) => e.target.select()}
                             onChange={(e) => updateScore(m.id, 1, e.target.value)}
                             disabled={m.completed}
                             className="w-20 h-20 text-center text-5xl font-black bg-slate-50 dark:bg-slate-900 rounded-2xl border-4 border-transparent focus:border-lime-500 focus:ring-4 focus:ring-lime-500/20 outline-none text-lime-600 transition-all" 
                           />
                        </div>
                      </div>

                      <div className="relative flex items-center justify-center py-2">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t-2 border-slate-100 dark:border-slate-700"></div>
                        </div>
                        <div className="relative bg-white dark:bg-slate-800 px-6 py-1 text-xs font-black italic uppercase text-slate-400 tracking-[0.3em] border-2 border-slate-100 dark:border-slate-700 rounded-full shadow-sm">
                          vs
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-2">
                        <div className="flex-1 space-y-1">
                          {m.team2.map(p => {
                            const info = getPlayerLabel(p);
                            return <div key={p.id} className="font-black text-2xl text-slate-800 dark:text-slate-100">{info.name} <span className="text-xs text-slate-400">#{info.number}</span></div>
                          })}
                        </div>
                        <div className="flex items-center">
                           <input 
                             type="text" 
                             inputMode="numeric" 
                             value={m.score2} 
                             onFocus={(e) => e.target.select()}
                             onChange={(e) => updateScore(m.id, 2, e.target.value)}
                             disabled={m.completed}
                             className="w-20 h-20 text-center text-5xl font-black bg-slate-50 dark:bg-slate-900 rounded-2xl border-4 border-transparent focus:border-lime-500 focus:ring-4 focus:ring-lime-500/20 outline-none text-lime-600 transition-all" 
                           />
                        </div>
                      </div>
                   </div>

                   {!m.completed ? (
                     <button onClick={() => finalizeMatch(m.id)} className="w-full mt-8 py-5 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-transform">Confirm Score</button>
                   ) : (
                     <div className="mt-8 flex gap-3">
                       <div className="flex-1 flex items-center justify-center gap-2 py-4 bg-lime-50 dark:bg-lime-900/20 text-lime-600 rounded-2xl font-black text-sm uppercase border border-lime-100"> <CheckCircle2 size={20}/> Recorded</div>
                       <button onClick={() => editMatch(m.id)} className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400"> <Edit2 size={20}/></button>
                     </div>
                   )}
                </Card>
              ))}
            </div>

            {rounds[currentRoundIndex].sittingOut.length > 0 && (
              <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900 p-6 border-l-8 border-l-amber-500">
                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2"> <Clock size={20} /> Resting Squad </h3>
                <div className="flex flex-wrap gap-3">
                  {rounds[currentRoundIndex].sittingOut.map(p => {
                    const info = getPlayerLabel(p);
                    return <span key={p.id} className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl text-sm font-black shadow-sm text-slate-600 dark:text-slate-300 border border-amber-50">{info.name}</span>
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        {view === 'leaderboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center px-1">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-2"><Trophy className="text-amber-500" /> Standings</h2>
              <button onClick={() => { if(confirm('Reset session?')) { setRounds([]); setView('setup'); } }} className="text-xs font-black text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-widest"> Reset </button>
            </div>

            <div className="space-y-4">
              {leaderboard.map((p) => (
                <Card key={p.id} className="p-4 flex items-center gap-5 hover:border-lime-300 transition-colors">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm ${p.displayRank === 1 ? 'bg-amber-100 text-amber-600 ring-4 ring-amber-400/50 scale-105' : p.displayRank === 2 ? 'bg-slate-100 text-slate-400 border-2 border-slate-200' : p.displayRank === 3 ? 'bg-orange-50 text-orange-600 border-2 border-orange-200' : 'bg-slate-50 text-slate-300'}`}>
                    {p.displayRank}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-2xl text-slate-800 dark:text-slate-100 leading-tight">{p.name}</div>
                    <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-slate-400 mt-1">
                       <span>{p.wins}W - {p.losses}L</span>
                       <span className="text-slate-200">|</span>
                       <span className={p.diff > 0 ? 'text-lime-600' : p.diff < 0 ? 'text-rose-600' : ''}>Net: {p.diff > 0 ? `+${p.diff}` : p.diff}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">Total Pts</div>
                    <div className="font-black text-3xl text-lime-600">{p.pointsFor}</div>
                  </div>
                </Card>
              ))}
            </div>

            <button 
              onClick={() => {
                const text = leaderboard.map(p => `${p.displayRank}. ${p.name}: ${p.wins}-${p.losses} (+${p.diff})`).join('\n');
                if (navigator.share) {
                  navigator.share({ title: 'PickleFlow Stats', text });
                } else {
                  navigator.clipboard.writeText(text);
                  alert('Summary copied to clipboard!');
                }
              }}
              className="w-full py-5 border-4 border-slate-200 dark:border-slate-800 text-slate-500 rounded-3xl font-black uppercase text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
            >
              <Share2 size={20} /> Share Results
            </button>
          </div>
        )}
      </main>

      {/* Global Finish Modal */}
      {timeLeft === 0 && view === 'play' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in">
          <Card className="max-w-xs w-full text-center space-y-6 border-4 border-lime-500 shadow-2xl p-8">
            <div className="mx-auto bg-lime-100 text-lime-600 w-24 h-24 rounded-full flex items-center justify-center animate-bounce shadow-lg">
              <Timer size={48} />
            </div>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Time!</h2>
            <p className="text-slate-500 font-bold text-lg">Rotation complete. Call the final scores and rotate!</p>
            <button onClick={resetTimer} className="w-full bg-lime-600 text-white py-5 rounded-2xl font-black text-xl uppercase tracking-widest shadow-xl active:scale-95 transition-transform">Next Rotation</button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default App;
