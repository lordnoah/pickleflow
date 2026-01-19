import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users, Trophy, Settings, Plus, Trash2, CheckCircle2, ChevronLeft, 
  PlayCircle, Edit2, LayoutGrid, Medal, RefreshCw, Play, Pause, 
  RotateCcw, Info, X, AlertCircle, CheckCircle, Coffee, Upload, Download, ExternalLink, Scale, Hash, Bell, Timer
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
  
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(selectedDuration * 60);
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [sortKey, setSortKey] = useState<'avgPoints' | 'pointsFor'>('avgPoints');
  const [newPlayerName, setNewPlayerName] = useState('');
  
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- AUDIO LOGIC (Safe wrapper) ---
  const playAlert = () => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, context.currentTime); 
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1);
      osc.start();
      osc.stop(context.currentTime + 1);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const trueActiveRoundIndex = useMemo(() => {
    if (rounds.length === 0) return 0;
    const firstIncompleteIdx = rounds.findIndex(r => r.matches.some(m => !m.completed));
    return firstIncompleteIdx === -1 ? rounds.length - 1 : firstIncompleteIdx;
  }, [rounds]);

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

  // --- TIMER EFFECT ---
  useEffect(() => {
    if (timerActive && targetTime) {
      timerRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          setTimerActive(false);
          setShowTimeUp(true);
          playAlert();
        }
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, targetTime]);

  const toggleTimer = () => {
    if (timerActive) { setTimerActive(false); setTargetTime(null); }
    else { setTargetTime(Date.now() + (timeLeft * 1000)); setTimerActive(true); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleAddPlayer = () => {
    const nameParts = newPlayerName.trim().split(/\s+/);
    const isBasicValid = nameParts.length >= 2 && nameParts[0].length > 0;
    const first = nameParts[0];
    const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    const formatted = `${first} ${lastInitial}.`;
    
    if (!isBasicValid || players.some(p => p.name === formatted)) return;
    setPlayers([...players, { id: Date.now(), name: formatted }]);
    setNewPlayerName('');
  };

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
    })).sort((a, b) => b[sortKey] - a[sortKey] || b.wins - a.wins).map((p, i) => ({ ...p, displayRank: i + 1 })) as PlayerStats[];
  }, [rounds, players, sortKey]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 font-sans text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-[60] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <PickleFlowLogo />
            <div className="flex gap-4">
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-slate-400 hover:text-lime-600"><Upload size={18} /><span className="text-[8px] font-black uppercase mt-1">Import</span></button>
              <button onClick={() => {}} className="flex flex-col items-center text-slate-400 hover:text-lime-600"><Download size={18} /><span className="text-[8px] font-black uppercase mt-1">Export</span></button>
              <button onClick={() => {localStorage.clear(); window.location.reload();}} className="flex flex-col items-center text-slate-400 hover:text-rose-500"><RefreshCw size={18} /><span className="text-[8px] font-black uppercase mt-1">Wipe</span></button>
            </div>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" />
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
        {view === 'setup' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-black text-lime-600 uppercase flex items-center gap-3 mb-6"><Users size={24} /> Players ({players.length})</h2>
              <div className="flex gap-2 mb-6">
                <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Full Name" className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-4 font-bold outline-none" />
                <button onClick={handleAddPlayer} className="px-7 rounded-xl bg-lime-600 text-white"><Plus size={32} /></button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto">
                {players.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
                    <span className="font-black">{idx + 1}. {p.name}</span>
                    <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-slate-300 hover:text-rose-500"><Trash2 size={20} /></button>
                  </div>
                ))}
              </div>
            </Card>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase">Rounds</h3>
                <select value={numRounds} onChange={(e) => setNumRounds(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">
                  {ROUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase">Min / Round</h3>
                <select value={selectedDuration} onChange={(e) => {setSelectedDuration(parseInt(e.target.value)); setTimeLeft(parseInt(e.target.value)*60);}} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">
                  {DURATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase">Courts</h3>
                <select value={courtCount} onChange={(e) => setCourtCount(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">
                  {COURT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <button onClick={generateSchedule} className="w-full py-6 bg-lime-600 text-white rounded-2xl font-black text-2xl uppercase italic shadow-xl">Start Tournament</button>
          </div>
        )}

        {view === 'play' && rounds[currentRoundIndex] && (
          <div className="max-w-2xl mx-auto space-y-6">
             <div className="bg-white dark:bg-slate-900 rounded-[2rem] border-4 border-slate-100 dark:border-slate-800 shadow-2xl p-6 relative">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))} className="p-3 text-slate-300"><ChevronLeft size={32}/></button>
                    <div className="text-center">
                      <p className="text-5xl font-black italic uppercase tracking-tighter">Round {currentRoundIndex + 1}</p>
                    </div>
                    <button onClick={() => currentRoundIndex < rounds.length - 1 ? setCurrentRoundIndex(currentRoundIndex + 1) : setView('leaderboard')} className="p-3 text-slate-300 rotate-180"><ChevronLeft size={32}/></button>
                  </div>
                  <div className="w-full max-w-xs bg-slate-50 dark:bg-slate-950/50 rounded-3xl p-6 border-2 mt-2">
                    <div className="flex flex-col items-center gap-4">
                      <div className={`text-7xl font-mono font-black ${timerActive ? 'text-lime-600' : 'text-slate-400'}`}>{formatTime(timeLeft)}</div>
                      <div className="flex items-center gap-4 w-full">
                        <button onClick={() => { setTimeLeft(selectedDuration * 60); setTimerActive(false); }} className="flex-1 py-4 bg-slate-100 rounded-2xl text-slate-400"><RotateCcw size={28}/></button>
                        <button onClick={toggleTimer} className={`flex-[2] py-4 rounded-2xl flex justify-center text-white ${timerActive ? 'bg-rose-500' : 'bg-lime-600'}`}>
                          {timerActive ? <Pause size={32} fill="currentColor"/> : <Play size={32} fill="currentColor"/>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
             </div>

             <div className="space-y-6">
                {rounds[currentRoundIndex].matches.map((match) => (
                  <Card key={match.id} className={`${match.completed ? 'opacity-60 grayscale' : 'border-l-8 border-lime-500'}`}>
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center bg-lime-50/50 dark:bg-lime-900/10 p-4 rounded-2xl border">
                        <div className="flex-1 font-black uppercase text-base">{match.team1[0]?.name}<br/>{match.team1[1]?.name}</div>
                        <input type="tel" value={match.score1} onChange={(e) => updateScore(match.id, 1, e.target.value)} className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl text-center text-4xl font-black border-4 border-lime-200 outline-none" />
                      </div>
                      <div className="flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border">
                        <div className="flex-1 font-black uppercase text-base">{match.team2[0]?.name}<br/>{match.team2[1]?.name}</div>
                        <input type="tel" value={match.score2} onChange={(e) => updateScore(match.id, 2, e.target.value)} className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl text-center text-4xl font-black border-4 border-blue-200 outline-none" />
                      </div>
                      <button onClick={() => setRounds(prev => prev.map(r => ({...r, matches: r.matches.map(m => m.id === match.id ? {...m, completed: !m.completed} : m)})))} className={`w-full py-5 rounded-2xl font-black text-sm uppercase ${match.completed ? 'bg-slate-100 text-slate-500' : 'bg-lime-600 text-white'}`}>
                        {match.completed ? "Edit Score" : "Add Final Score"}
                      </button>
                    </div>
                  </Card>
                ))}

                {rounds[currentRoundIndex].sittingOut.length > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-dashed border-orange-200 p-6 rounded-[2rem]">
                    <div className="flex items-center gap-2 mb-4 text-orange-600"><Coffee size={24} /><h3 className="text-xl font-black uppercase italic">Sitting Out</h3></div>
                    <div className="flex flex-wrap gap-2">
                      {rounds[currentRoundIndex].sittingOut.map(p => (
                        <span key={p.id} className="bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-orange-100 font-black text-sm uppercase text-orange-700">{p.name}</span>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {view === 'summary' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95">
            {rounds.map((round, rIdx) => {
              const isActive = rIdx === trueActiveRoundIndex;
              return (
                <Card key={rIdx} className={`p-4 ${isActive ? 'ring-4 ring-lime-500 scale-[1.02] shadow-2xl' : 'opacity-60 grayscale'}`}>
                  <div className="flex justify-between mb-4">
                    <button onClick={() => { setCurrentRoundIndex(rIdx); setView('play'); }} className="flex flex-col items-start"><h3 className={`font-black uppercase italic ${isActive ? 'text-lime-600 text-lg' : 'text-slate-400 text-xs'}`}>Round {round.number}</h3></button>
                    {isActive && <span className="bg-lime-500 text-white text-[8px] px-2 py-1 rounded-full font-black">ACTIVE</span>}
                  </div>
                  <div className="space-y-4">
                    {round.matches.map((m, mIdx) => (
                      <div key={mIdx} className="p-3 rounded-xl border border-slate-100">
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-2 uppercase"><span>Court {m.court}</span>{m.completed && <span className="text-lime-600">Final: {m.score1}-{m.score2}</span>}</div>
                        <div className="space-y-1"><p className="text-[11px] font-black uppercase">{m.team1.map(p => p.name).join(' & ')}</p><p className="text-[7px] font-black text-slate-300 uppercase">VS</p><p className="text-[11px] font-black uppercase">{m.team2.map(p => p.name).join(' & ')}</p></div>
                      </div>
                    ))}
                    {round.sittingOut.length > 0 && (
                      <div className="mt-2 pt-3 border-t-2 border-dotted border-orange-200">
                        <div className="flex items-center gap-1.5 mb-1 text-orange-500"><Coffee size={10} /><p className="text-[8px] font-black uppercase text-orange-400">Resting:</p></div>
                        <p className="text-[10px] font-bold text-orange-700/80 leading-tight">{round.sittingOut.map(p => p.name).join(', ')}</p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {view === 'leaderboard' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
              <div><h2 className="text-4xl font-black italic uppercase">Standings</h2><button onClick={() => setShowInfo(true)} className="mt-2 flex items-center gap-1.5 text-lime-600 font-black text-[10px] uppercase hover:underline"><Info size={14}/> How scoring works</button></div>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setSortKey('avgPoints')} className={`px-3 py-1.5 rounded-md text-[10px] font-black ${sortKey === 'avgPoints' ? 'bg-white text-lime-600' : 'text-slate-400'}`}>Avg PPG</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 pb-24">
              {leaderboard.map((stat, idx) => (
                <div key={stat.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white border-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${idx < 4 ? 'bg-lime-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{stat.displayRank}</div>
                  <div className="flex-1"><h4 className="font-black text-lg uppercase">{stat.name}</h4><p className="text-[10px] font-bold text-slate-400 uppercase">W-L: {stat.wins}-{stat.losses} • G: {stat.gamesPlayed}</p></div>
                  <div className="text-right"><div className="text-xl font-black text-lime-600">{stat.avgPoints.toFixed(1)}</div><p className="text-[8px] font-black text-slate-400 uppercase">Avg</p></div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {showTimeUp && (
          <div className="fixed inset-0 z-[200] bg-rose-600/95 backdrop-blur-xl flex items-center justify-center p-4">
             <div className="text-center space-y-8">
                <Bell size={120} className="text-white mx-auto animate-bounce" />
                <h2 className="text-6xl font-black italic uppercase text-white tracking-tighter">Time's Up!</h2>
                <button onClick={() => setShowTimeUp(false)} className="px-12 py-6 bg-white text-rose-600 rounded-[2rem] font-black text-2xl uppercase italic tracking-tighter">Clear Alert</button>
             </div>
          </div>
        )}

        {showInfo && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
            <Card className="max-w-xl w-full p-8 relative animate-in zoom-in-95">
              <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500"><X size={24}/></button>
              <div className="space-y-6">
                <h3 className="text-3xl font-black uppercase italic text-lime-600 tracking-tighter flex items-center gap-2"><Trophy size={28}/> Tournament Scoring</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border"><div className="flex items-center gap-2 text-lime-600 mb-2 font-black uppercase text-xs"><Hash size={16}/> Primary: PPG</div><p className="text-sm font-medium leading-relaxed">Players ranked by <strong>Avg Pts Per Game</strong>. This ensures no penalty for resting.</p></div>
                  <div className="bg-slate-50 p-4 rounded-2xl border"><div className="flex items-center gap-2 text-lime-600 mb-2 font-black uppercase text-xs"><Scale size={16}/> Tie-Breaking</div><p className="text-sm font-medium leading-relaxed">If PPG is tied, the player with the most <strong>Total Wins</strong> ranks higher.</p></div>
                </div>
                <div className="bg-lime-600/5 p-5 rounded-2xl border border-lime-200/50"><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-600 mb-3">Fairness Guarantee</h4><ul className="text-xs font-bold text-slate-600 space-y-3"><li>• <strong>Rotating Partners:</strong> Maximize variety of partners.</li><li>• <strong>Rest Equity:</strong> Sitters are prioritized to play next.</li></ul></div>
              </div>
              <button onClick={() => setShowInfo(false)} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg">Return to Standings</button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
