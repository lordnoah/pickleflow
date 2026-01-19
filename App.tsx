import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users, Trophy, Settings, Plus, Trash2, CheckCircle2, ChevronLeft, 
  PlayCircle, Edit2, LayoutGrid, Medal, Activity, Download, Upload, 
  RefreshCw, Play, Pause, RotateCcw, Info, X, Check
} from 'lucide-react';
import { Card } from './components/Card';
import { PickleFlowLogo, DEFAULT_PLAYERS, ROUND_OPTIONS, DURATION_OPTIONS, COURT_OPTIONS } from './constants';
import { Player, Match, Round, PlayerStats, View, TournamentSession } from './types';

const App: React.FC = () => {
  // --- CORE STATE ---
  const [view, setView] = useState<View>(() => (localStorage.getItem('pf_view') as View) || 'setup');
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('pf_players');
    return saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
  });
  const [rounds, setRounds] = useState<Round[]>(() => JSON.parse(localStorage.getItem('pf_rounds') || '[]'));
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(() => parseInt(localStorage.getItem('pf_round_idx') || '0'));
  const [courtCount, setCourtCount] = useState(() => parseInt(localStorage.getItem('pf_courts') || '3'));
  const [numRounds, setNumRounds] = useState(() => parseInt(localStorage.getItem('pf_num_rounds') || '8'));
  const [selectedDuration, setSelectedDuration] = useState(() => parseInt(localStorage.getItem('pf_duration') || '15'));
  
  // Timer & UI Utility
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(selectedDuration * 60);
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [sortKey, setSortKey] = useState<'avgPoints' | 'pointsFor'>('avgPoints');
  const [newPlayerName, setNewPlayerName] = useState('');
  
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('pf_view', view);
    localStorage.setItem('pf_players', JSON.stringify(players));
    localStorage.setItem('pf_rounds', JSON.stringify(rounds));
    localStorage.setItem('pf_round_idx', currentRoundIndex.toString());
    localStorage.setItem('pf_courts', courtCount.toString());
    localStorage.setItem('pf_num_rounds', numRounds.toString());
    localStorage.setItem('pf_duration', selectedDuration.toString());
  }, [view, players, rounds, currentRoundIndex, courtCount, numRounds, selectedDuration]);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (timerActive && targetTime) {
      timerRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) setTimerActive(false);
      }, 500);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, targetTime]);

  const toggleTimer = () => {
    if (timerActive) { setTimerActive(false); setTargetTime(null); }
    else { setTargetTime(Date.now() + (timeLeft * 1000)); setTimerActive(true); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // --- SCHEDULER ---
  const generateSchedule = () => {
    if (players.length < 4) return;
    const newRounds: Round[] = [];
    const playCount: Record<number, number> = {};
    const partnerHistory: Record<string, number> = {};
    players.forEach(p => {
      playCount[p.id] = 0;
      players.forEach(p2 => { if (p.id !== p2.id) partnerHistory[`${Math.min(p.id, p2.id)}-${Math.max(p.id, p2.id)}`] = 0; });
    });

    for (let r = 0; r < numRounds; r++) {
      const sorted = [...players].sort((a, b) => playCount[a.id] - playCount[b.id] || Math.random() - 0.5);
      const slots = Math.min(players.length - (players.length % 4), courtCount * 4);
      const active = sorted.slice(0, slots);
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
        best.t1.forEach(p => playCount[p.id]++); best.t2.forEach(p => playCount[p.id]++);
        partnerHistory[`${Math.min(best.t1[0].id, best.t1[1].id)}-${Math.max(best.t1[0].id, best.t1[1].id)}`]++;
        partnerHistory[`${Math.min(best.t2[0].id, best.t2[1].id)}-${Math.max(best.t2[0].id, best.t2[1].id)}`]++;
        roundMatches.push({ id: `r${r}-c${cNum}`, court: cNum++, team1: best.t1, team2: best.t2, score1: '0', score2: '0', completed: false });
      }
      newRounds.push({ number: r + 1, matches: roundMatches, sittingOut: sorted.slice(slots) });
    }
    setRounds(newRounds); setCurrentRoundIndex(0); setTimeLeft(selectedDuration * 60); setView('play');
  };

  const updateScore = (matchId: string, team: 1 | 2, value: string) => {
    const val = value.replace(/\D/g, '');
    setRounds(prev => prev.map((round, idx) => idx !== currentRoundIndex ? round : {
      ...round, matches: round.matches.map(m => m.id === matchId ? (team === 1 ? { ...m, score1: val } : { ...m, score2: val }) : m)
    }));
  };

  const leaderboard = useMemo<PlayerStats[]>(() => {
    const stats: Record<number, any> = {};
    players.forEach(p => stats[p.id] = { id: p.id, name: p.name, wins: 0, losses: 0, gamesPlayed: 0, pointsFor: 0, pointsAgainst: 0 });
    rounds.forEach(r => r.matches.forEach(m => {
      if (!m.completed) return;
      const s1 = parseInt(m.score1) || 0, s2 = parseInt(m.score2) || 0;
      m.team1.forEach(p => { if(stats[p.id]) { stats[p.id].gamesPlayed++; stats[p.id].pointsFor += s1; stats[p.id].pointsAgainst += s2; if(s1 > s2) stats[p.id].wins++; else if(s1 < s2) stats[p.id].losses++; }});
      m.team2.forEach(p => { if(stats[p.id]) { stats[p.id].gamesPlayed++; stats[p.id].pointsFor += s2; stats[p.id].pointsAgainst += s1; if(s2 > s1) stats[p.id].wins++; else if(s2 < s1) stats[p.id].losses++; }});
    }));
    return Object.values(stats).filter((s:any) => s.gamesPlayed > 0).map((s: any) => ({
      ...s, avgPoints: s.pointsFor / s.gamesPlayed
    })).sort((a, b) => b[sortKey] - a[sortKey]).map((p, i) => ({ ...p, displayRank: i + 1 })) as PlayerStats[];
  }, [rounds, players, sortKey]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 font-sans selection:bg-lime-200">
      <header className="sticky top-0 z-[60] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b px-4 py-3">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <PickleFlowLogo />
            <button onClick={() => confirm("Reset all data?") && (localStorage.clear() || window.location.reload())} className="flex flex-col items-center text-slate-400 hover:text-rose-500 transition-colors">
              <RefreshCw size={18} /><span className="text-[8px] font-black uppercase mt-1">Wipe</span>
            </button>
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

      <main className="max-w-4xl mx-auto px-4 mt-6">
        {/* --- SETUP VIEW --- */}
        {view === 'setup' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <Card className="p-6">
              <h2 className="text-xl font-black text-lime-600 uppercase flex items-center gap-3 mb-6"><Users size={24} /> Players ({players.length})</h2>
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newPlayerName} 
                  onChange={(e) => setNewPlayerName(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPlayerName.trim()) {
                      setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]);
                      setNewPlayerName('');
                    }
                  }} 
                  placeholder="Enter Name" 
                  className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-4 outline-none font-bold" 
                />
                <button 
                  onClick={() => { 
                    if(newPlayerName.trim()) { 
                      setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]); 
                      setNewPlayerName(''); 
                    }
                  }} 
                  className="bg-lime-600 text-white px-7 rounded-xl active:scale-95 transition-transform"
                >
                  <Plus size={32} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-1">
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
            <button onClick={generateSchedule} className="w-full py-6 bg-lime-600 text-white rounded-2xl font-black text-2xl uppercase italic tracking-tighter shadow-xl hover:bg-lime-700 active:scale-[0.98] transition-all">Start Tournament</button>
          </div>
        )}

        {/* --- PLAY VIEW --- */}
        {view === 'play' && rounds[currentRoundIndex] && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-md flex items-center justify-between">
                <button onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))} className="p-2 text-slate-400 disabled:opacity-20"><ChevronLeft size={32}/></button>
                <div className="text-center">
                  <p className="text-2xl font-black uppercase italic">Round {currentRoundIndex + 1}</p>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <button onClick={() => setTimeLeft(selectedDuration * 60)} className="text-slate-400"><RotateCcw size={14}/></button>
                    <span className="font-mono font-black text-lime-600 tracking-widest">{formatTime(timeLeft)}</span>
                    <button onClick={toggleTimer} className="text-slate-400">{timerActive ? <Pause size={14} fill="currentColor"/> : <Play size={14} fill="currentColor"/>}</button>
                  </div>
                </div>
                <button onClick={() => currentRoundIndex < rounds.length - 1 ? setCurrentRoundIndex(currentRoundIndex + 1) : setView('leaderboard')} className="p-2 text-slate-400 rotate-180"><ChevronLeft size={32}/></button>
             </div>

             <div className="space-y-6">
                {rounds[currentRoundIndex].matches.map((match) => (
                  <Card key={match.id} className={`${match.completed ? 'opacity-60 grayscale-[0.5]' : 'border-l-8 border-lime-500 shadow-lg'}`}>
                    <div className="p-4 space-y-4">
                      <div className="flex-1 space-y-4">
                        {/* Team 1 Highlighted Block */}
                        <div className="flex justify-between items-center bg-lime-50/50 dark:bg-lime-900/10 p-3 rounded-xl border border-lime-100 dark:border-lime-900/30">
                          <div className="flex-1 font-black uppercase text-sm leading-tight text-lime-800 dark:text-lime-400">{match.team1[0]?.name}<br/>{match.team1[1]?.name}</div>
                          <input type="tel" value={match.score1} onChange={(e) => updateScore(match.id, 1, e.target.value)} onFocus={(e) => e.target.select()} className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl text-center text-3xl font-black border-2 border-lime-200 focus:border-lime-500 outline-none" />
                        </div>
                        
                        {/* Divider with VS */}
                        <div className="relative py-1">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-dashed border-slate-200 dark:border-slate-800" /></div>
                          <div className="relative flex justify-center"><span className="bg-white dark:bg-slate-900 px-4 text-[10px] font-black text-slate-400 italic uppercase border-2 border-slate-100 dark:border-slate-800 rounded-full">Versus</span></div>
                        </div>

                        {/* Team 2 Highlighted Block */}
                        <div className="flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                          <div className="flex-1 font-black uppercase text-sm leading-tight text-blue-800 dark:text-blue-400">{match.team2[0]?.name}<br/>{match.team2[1]?.name}</div>
                          <input type="tel" value={match.score2} onChange={(e) => updateScore(match.id, 2, e.target.value)} onFocus={(e) => e.target.select()} className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl text-center text-3xl font-black border-2 border-blue-200 focus:border-blue-500 outline-none" />
                        </div>
                      </div>
                      
                      {/* Horizontal Finalize Button */}
                      {match.completed ? (
                         <button onClick={() => setRounds(prev => prev.map(r => ({...r, matches: r.matches.map(m => m.id === match.id ? {...m, completed: false} : m)})))} className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
                           <Edit2 size={14}/> Edit Scores
                         </button>
                      ) : (
                        <button onClick={() => setRounds(prev => prev.map(r => ({...r, matches: r.matches.map(m => m.id === match.id ? {...m, completed: true} : m)})))} className="w-full py-4 bg-lime-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-lime-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
                          <CheckCircle2 size={18}/> Add Final Score
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
             </div>
          </div>
        )}

        {/* --- SCHEDULE VIEW --- */}
        {view === 'summary' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95">
            {rounds.map((round, rIdx) => {
              const isActive = rIdx === currentRoundIndex;
              return (
                <Card key={rIdx} className={`p-4 transition-all duration-500 ${isActive ? 'ring-4 ring-lime-500 ring-offset-4 dark:ring-offset-slate-950 scale-[1.02] shadow-2xl bg-white dark:bg-slate-900 z-10' : 'opacity-60 grayscale-[0.2]'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`font-black uppercase italic ${isActive ? 'text-lime-600 text-lg' : 'text-slate-400 text-xs'}`}>
                      {isActive && '▶ '}Round {round.number}
                    </h3>
                    {isActive && <span className="bg-lime-500 text-white text-[8px] px-2 py-1 rounded-full font-black animate-pulse">CURRENTLY PLAYING</span>}
                  </div>
                  <div className="space-y-3">
                    {round.matches.map((m, mIdx) => (
                      <div key={mIdx} className={`p-2 rounded-lg border ${isActive ? 'border-lime-100 bg-lime-50/30' : 'border-slate-100'}`}>
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-1 uppercase"><span>Court {m.court}</span>{m.completed && <span className="text-lime-600">Final: {m.score1}-{m.score2}</span>}</div>
                        <p className="text-[10px] font-black truncate text-slate-700 dark:text-slate-300">{m.team1.map(p => p.name).join(' & ')}</p>
                        <p className="text-[10px] font-black truncate text-slate-700 dark:text-slate-300">{m.team2.map(p => p.name).join(' & ')}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* --- LEADERBOARD VIEW --- */}
        {view === 'leaderboard' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">Standings</h2>
                <button onClick={() => setShowInfo(true)} className="mt-2 flex items-center gap-1.5 text-lime-600 font-black text-[10px] uppercase tracking-widest hover:underline">
                  <Info size={14}/> How is this calculated?
                </button>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border">
                <button onClick={() => setSortKey('avgPoints')} className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${sortKey === 'avgPoints' ? 'bg-white dark:bg-slate-700 shadow-sm text-lime-600' : 'text-slate-400'}`}>PPG Avg</button>
                <button onClick={() => setSortKey('pointsFor')} className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${sortKey === 'pointsFor' ? 'bg-white dark:bg-slate-700 shadow-sm text-lime-600' : 'text-slate-400'}`}>Total Pts</button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pb-24">
              {leaderboard.map((stat, idx) => (
                <div key={stat.id} className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all ${idx < 4 ? 'border-lime-500 shadow-lg scale-[1.01]' : 'border-slate-100 opacity-90'}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${idx < 4 ? 'bg-lime-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{stat.displayRank}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-lg uppercase truncate flex items-center gap-2">{stat.name} {idx < 4 && <Medal size={18} className="text-amber-400" />}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wins: {stat.wins} • Games: {stat.gamesPlayed}</p>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div className={sortKey === 'pointsFor' ? 'opacity-100' : 'opacity-40'}>
                      <div className="text-xl font-black">{stat.pointsFor}</div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Total</p>
                    </div>
                    <div className={sortKey === 'avgPoints' ? 'opacity-100' : 'opacity-40'}>
                      <div className="text-xl font-black text-lime-600">{stat.avgPoints.toFixed(1)}</div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">PPG</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* --- SCORING MODAL --- */}
        {showInfo && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500"><X size={24}/></button>
              <h3 className="text-2xl font-black uppercase italic text-lime-600 mb-4">Scoring Logic</h3>
              <div className="space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>PickleFlow ranks players individually based on their performance across all rounds.</p>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl space-y-2">
                  <p>1. <span className="text-lime-600 font-black">PPG (Points Per Game):</span> Total Points ÷ Games Played. This is the primary rank stat.</p>
                  <p>2. <span className="text-lime-600 font-black">Total Points:</span> The cumulative sum of every point you earned.</p>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Ties are broken by total point differential.</p>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
