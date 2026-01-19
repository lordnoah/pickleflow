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
  RefreshCw
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

  const [newPlayerName, setNewPlayerName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(selectedDuration * 60); 
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PERSISTENCE ---
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
      console.error("Save failed", e);
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
    link.download = `pickleflow_backup.json`;
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
      } catch (err) { alert("Invalid File"); }
    };
    reader.readAsText(file);
  };

  // --- TIMER ---
  useEffect(() => {
    if (timerActive && targetTime) {
      timerRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) { setTimerActive(false); setTargetTime(null); }
      }, 500);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, targetTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- ROUND ROBIN GENERATOR ---
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
      const slots = Math.min(players.length - (players.length % 4), courtCount * 4);
      const active = sorted.slice(0, slots);
      const sittingOut = sorted.slice(slots);
      
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

        roundMatches.push({
          id: `r${r}-c${cNum}`, court: cNum++, team1: best.t1, team2: best.t2, score1: '0', score2: '0', completed: false
        });
      }
      newRounds.push({ number: r + 1, matches: roundMatches, sittingOut });
    }
    setRounds(newRounds);
    setCurrentRoundIndex(0);
    setTimeLeft(selectedDuration * 60);
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
    let hasData = false;
    if (!players || players.length === 0) return [];
    
    players.forEach(p => stats[p.id] = { id: p.id, name: p.name, wins: 0, losses: 0, gamesPlayed: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 });
    
    rounds.forEach(r => r.matches.forEach(m => {
      if (!m.completed) return;
      hasData = true;
      const s1 = parseInt(m.score1) || 0;
      const s2 = parseInt(m.score2) || 0;
      m.team1.forEach(p => {
        if (!stats[p.id]) return;
        stats[p.id].gamesPlayed++; stats[p.id].pointsFor += s1; stats[p.id].pointsAgainst += s2;
        if (s1 > s2) stats[p.id].wins++; else if (s1 < s2) stats[p.id].losses++;
      });
      m.team2.forEach(p => {
        if (!stats[p.id]) return;
        stats[p.id].gamesPlayed++; stats[p.id].pointsFor += s2; stats[p.id].pointsAgainst += s1;
        if (s2 > s1) stats[p.id].wins++; else if (s2 < s1) stats[p.id].losses++;
      });
    }));
    
    if (!hasData) return [];
    return Object.values(stats).map(s => ({
      ...s, avgPoints: s.gamesPlayed > 0 ? s.pointsFor / s.gamesPlayed : 0,
      avgDiff: s.gamesPlayed > 0 ? (s.pointsFor - s.pointsAgainst) / s.gamesPlayed : 0
    })).sort((a, b) => (b.avgPoints - a.avgPoints) || (b.avgDiff - a.avgDiff))
      .map((p, i) => ({ ...p, displayRank: i + 1 })) as PlayerStats[];
  }, [rounds, players]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 overflow-x-hidden font-sans">
      <header className="sticky top-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-3">
            <PickleFlowLogo />
            <div className="flex items-center gap-1">
              <button onClick={exportData} className="p-2 text-slate-400 hover:text-lime-600"><Download size={18} /></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-lime-600"><Upload size={18} /></button>
              <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="p-2 text-slate-400 hover:text-rose-500"><RefreshCw size={18} /></button>
            </div>
          </div>
          {rounds.length > 0 && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {[ { id: 'setup', icon: Settings, label: 'Setup' }, { id: 'play', icon: PlayCircle, label: 'Play' }, { id: 'summary', icon: LayoutGrid, label: 'Full' }, { id: 'leaderboard', icon: Trophy, label: 'Stats' } ].map(item => (
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
              <h2 className="text-xl font-black text-lime-600 uppercase flex items-center gap-3 mb-6"><Users size={24} /> Squad ({players.length})</h2>
              <div className="flex gap-2 mb-6">
                <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }])} placeholder="Name" className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-4 outline-none font-bold" />
                <button onClick={() => { if(newPlayerName.trim()) { setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]); setNewPlayerName(''); }}} className="bg-lime-600 text-white px-7 rounded-xl active:scale-95 transition-transform"><Plus size={32} /></button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[30vh] overflow-y-auto">
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
                <h3 className="text-[10px] font-black text-slate-400 uppercase">Time</h3>
                <select value={selectedDuration} onChange={(e) => setSelectedDuration(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">{DURATION_OPTIONS.map(o => <option key={o} value={o}>{o}m</option>)}</select>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase">Courts</h3>
                <select value={courtCount} onChange={(e) => setCourtCount(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">{COURT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
              </div>
            </div>

            <button onClick={generateSchedule} className="w-full py-6 bg-lime-600 text-white rounded-2xl font-black text-2xl uppercase italic tracking-tighter shadow-xl">Launch Session</button>
          </div>
        )}

        {view === 'play' && rounds[currentRoundIndex] && (
          <div className="max-w-2xl mx-auto space-y-6">
             <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-md">
                <button onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))} disabled={currentRoundIndex === 0} className="p-2 text-slate-400 disabled:opacity-20"><ChevronLeft size={32} /></button>
                <div className="text-center">
                  <p className="text-2xl font-black uppercase italic">Round {currentRoundIndex + 1}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{formatTime(timeLeft)}</p>
                </div>
                <button onClick={() => currentRoundIndex < rounds.length - 1 ? setCurrentRoundIndex(currentRoundIndex + 1) : setView('leaderboard')} className="p-2 text-slate-400 rotate-180"><ChevronLeft size={32} /></button>
             </div>

             <div className="space-y-4">
                {rounds[currentRoundIndex].matches.map((match) => (
                  <Card key={match.id} className={`${match.completed ? 'opacity-70' : 'border-l-8 border-lime-500'}`}>
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex-1 font-black uppercase text-sm">{match.team1[0]?.name}<br/>{match.team1[1]?.name}</div>
                          <input type="tel" value={match.score1} onChange={(e) => updateScore(match.id, 1, e.target.value)} onFocus={(e) => e.target.select()} className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl text-center text-3xl font-black outline-none border-2 border-transparent focus:border-lime-500" />
                        </div>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 w-full" />
                        <div className="flex justify-between items-center">
                          <div className="flex-1 font-black uppercase text-sm">{match.team2[0]?.name}<br/>{match.team2[1]?.name}</div>
                          <input type="tel" value={match.score2} onChange={(e) => updateScore(match.id, 2, e.target.value)} onFocus={(e) => e.target.select()} className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl text-center text-3xl font-black outline-none border-2 border-transparent focus:border-lime-500" />
                        </div>
                      </div>
                      <button onClick={() => setRounds(prev => prev.map(r => ({...r, matches: r.matches.map(m => m.id === match.id ? {...m, completed: !m.completed} : m)})))} className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-colors ${match.completed ? 'bg-slate-100 text-slate-500' : 'bg-lime-600 text-white'}`}>
                        {match.completed ? <Edit2 size={24}/> : <CheckCircle2 size={28}/>}
                      </button>
                    </div>
                  </Card>
                ))}
             </div>
             
             <button onClick={() => currentRoundIndex < rounds.length - 1 ? setCurrentRoundIndex(currentRoundIndex + 1) : setView('leaderboard')} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-xl uppercase tracking-widest shadow-xl">Next Round →</button>
          </div>
        )}

        {view === 'summary' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rounds.map((round, rIdx) => (
              <Card key={rIdx} className="p-4 border-t-4 border-slate-200">
                <h3 className="text-xs font-black uppercase text-lime-600 mb-4">Round {round.number}</h3>
                <div className="space-y-4">
                  {round.matches.map((m, mIdx) => (
                    <div key={mIdx} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border">
                      <div className="flex justify-between text-[9px] text-slate-400 mb-1"><span>Court {m.court}</span>{m.completed && <span className="text-lime-600 font-black">{m.score1}-{m.score2}</span>}</div>
                      <p className="text-[10px] font-bold truncate">{m.team1.map(p => p.name).join(' & ')}</p>
                      <p className="text-[10px] font-bold truncate">{m.team2.map(p => p.name).join(' & ')}</p>
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
