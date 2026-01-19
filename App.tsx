import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Trophy,
  Settings,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  AlertCircle,
  Timer,
  PlayCircle,
  Edit2,
  LayoutGrid,
  Play,
  Medal,
  Activity
} from 'lucide-react';
import { Card } from './components/Card';
import { PickleFlowLogo, DEFAULT_PLAYERS, ROUND_OPTIONS, DURATION_OPTIONS, COURT_OPTIONS } from './constants';
import { Player, Match, Round, PlayerStats, View } from './types';

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

  // UI Utility State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [error, setError] = useState('');
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(selectedDuration * 60); 
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Persistence Engine
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
  const resetTimer = () => { setTimerActive(false); setTargetTime(null); setTimeLeft(selectedDuration * 60); };

  // Naming Validation Logic
  const nameValidation = useMemo(() => {
    const name = newPlayerName.trim();
    if (!name) return null;
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return { msg: 'Duplicate name detected', color: 'text-rose-500' };
    }
    if (name.split(' ').length < 2) {
      return { msg: 'Enter First + Last Name/Initial', color: 'text-amber-500' };
    }
    return { msg: 'Name is valid', color: 'text-lime-600' };
  }, [newPlayerName, players]);

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name || name.split(' ').length < 2 || players.some(p => p.name.toLowerCase() === name.toLowerCase())) return;
    setPlayers([...players, { id: Date.now(), name }]);
    setNewPlayerName('');
  };

  /**
   * ADVANCED ROUND ROBIN GENERATOR
   * Optimizes for:
   * 1. Equal Playing Time (Resting rotation)
   * 2. Partner Diversity (Minimum repeat partners)
   */
  const generateSchedule = () => {
    if (players.length < 4) {
      setError("Add at least 4 players.");
      setTimeout(() => setError(''), 3000);
      return;
    }
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
      // 1. Determine who sits out (Equal rest logic)
      const sortedByPlay = [...players].sort((a, b) => playCount[a.id] - playCount[b.id] || Math.random() - 0.5);
      const slotsAvailable = Math.min(players.length - (players.length % 4), courtCount * 4);
      const activePlayers = sortedByPlay.slice(0, slotsAvailable);
      const sittingOut = sortedByPlay.slice(slotsAvailable);
      
      const available = [...activePlayers];
      const roundMatches: Match[] = [];
      let courtNum = 1;

      while (available.length >= 4) {
        // Pick 4 players for a court
        const group = available.splice(0, 4);
        
        // 2. Find best pairing within the 4 to avoid repeat partners
        const pairings = [
          { t1: [group[0], group[1]], t2: [group[2], group[3]] },
          { t1: [group[0], group[2]], t2: [group[1], group[3]] },
          { t1: [group[0], group[3]], t2: [group[1], group[2]] }
        ];

        pairings.sort((a, b) => {
          const getHist = (p1: Player, p2: Player) => partnerHistory[`${Math.min(p1.id, p2.id)}-${Math.max(p1.id, p2.id)}`];
          const scoreA = getHist(a.t1[0], a.t1[1]) + getHist(a.t2[0], a.t2[1]);
          const scoreB = getHist(b.t1[0], b.t1[1]) + getHist(b.t2[0], b.t2[1]);
          return scoreA - scoreB;
        });

        const best = pairings[0];
        
        // Update tracking
        best.t1.forEach(p => playCount[p.id]++);
        best.t2.forEach(p => playCount[p.id]++);
        partnerHistory[`${Math.min(best.t1[0].id, best.t1[1].id)}-${Math.max(best.t1[0].id, best.t1[1].id)}`]++;
        partnerHistory[`${Math.min(best.t2[0].id, best.t2[1].id)}-${Math.max(best.t2[0].id, best.t2[1].id)}`]++;

        roundMatches.push({
          id: `r${r}-c${courtNum}`,
          court: courtNum++,
          team1: best.t1,
          team2: best.t2,
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
  };

  const updateScore = (matchId: string, team: 1 | 2, value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setRounds(prev => prev.map((round, idx) => idx !== currentRoundIndex ? round : {
      ...round,
      matches: round.matches.map(m => m.id === matchId ? (team === 1 ? { ...m, score1: numericValue } : { ...m, score2: numericValue }) : m)
    }));
  };

  const handleScoreFocus = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select();

  const finalizeMatch = (matchId: string) => {
    setRounds(prev => prev.map((r, idx) => idx !== currentRoundIndex ? r : {
      ...r,
      matches: r.matches.map(m => m.id === matchId ? { ...m, completed: true } : m)
    }));
  };

  const leaderboard = useMemo<PlayerStats[]>(() => {
    const stats: Record<number, any> = {};
    let hasData = false;
    players.forEach(p => {
      stats[p.id] = { id: p.id, name: p.name, wins: 0, losses: 0, gamesPlayed: 0, pointsFor: 0, pointsAgainst: 0, diff: 0, displayRank: 0 };
    });
    rounds.forEach(r => r.matches.forEach(m => {
      if (!m.completed) return;
      hasData = true;
      const s1 = parseInt(m.score1) || 0;
      const s2 = parseInt(m.score2) || 0;
      const process = (pId: number, my: number, opp: number) => {
        stats[pId].gamesPlayed++;
        stats[pId].pointsFor += my;
        stats[pId].pointsAgainst += opp;
        if (my > opp) stats[pId].wins++; else if (my < opp) stats[pId].losses++;
      };
      m.team1.forEach(p => process(p.id, s1, s2));
      m.team2.forEach(p => process(p.id, s2, s1));
    }));
    
    if (!hasData) return [];

    return Object.values(stats).map(s => {
      const avgPoints = s.gamesPlayed > 0 ? s.pointsFor / s.gamesPlayed : 0;
      const avgDiff = s.gamesPlayed > 0 ? (s.pointsFor - s.pointsAgainst) / s.gamesPlayed : 0;
      return { ...s, avgPoints, avgDiff, diff: s.pointsFor - s.pointsAgainst };
    }).sort((a, b) => (b.avgPoints - a.avgPoints) || (b.avgDiff - a.avgDiff))
      .map((p, i) => ({ ...p, displayRank: i + 1 })) as PlayerStats[];
  }, [rounds, players]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 overflow-x-hidden">
      <header className="sticky top-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b px-4 py-3 mb-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <PickleFlowLogo />
          {rounds.length > 0 && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {[
                { id: 'setup', icon: Settings, label: 'Setup' },
                { id: 'play', icon: PlayCircle, label: 'Play' },
                { id: 'summary', icon: LayoutGrid, label: 'Schedule' },
                { id: 'leaderboard', icon: Trophy, label: 'Stats' }
              ].map(item => (
                <button key={item.id} onClick={() => setView(item.id as View)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black transition-all ${view === item.id ? 'bg-white dark:bg-slate-700 text-lime-600 shadow-sm' : 'text-slate-500'}`}>
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
            <Card className="p-6">
              <h2 className="text-xl font-black text-lime-600 uppercase flex items-center gap-3 mb-6"><Users size={24} /> Squad ({players.length})</h2>
              <div className="space-y-2 mb-6">
                <div className="flex gap-2">
                  <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleAddPlayer(); }} placeholder="First Last" className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-4 outline-none font-bold" />
                  <button onClick={handleAddPlayer} className="bg-lime-600 text-white px-7 rounded-xl active:scale-95 transition-transform"><Plus size={32} /></button>
                </div>
                {nameValidation && <p className={`text-[10px] font-black uppercase tracking-widest pl-2 ${nameValidation.color}`}>{nameValidation.msg}</p>}
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[30vh] overflow-y-auto pr-1">
                {players.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-black truncate flex-1">{idx + 1}. {p.name}</span>
                    <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 size={20} /></button>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-tighter">Rounds</h3>
                <select value={numRounds} onChange={(e) => setNumRounds(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">{ROUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-tighter">Time</h3>
                <select value={selectedDuration} onChange={(e) => setSelectedDuration(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">{DURATION_OPTIONS.map(o => <option key={o} value={o}>{o}m</option>)}</select>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-tighter">Courts</h3>
                <select value={courtCount} onChange={(e) => setCourtCount(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600 outline-none">{COURT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
              </div>
            </div>

            <button onClick={generateSchedule} className="w-full py-6 bg-lime-600 text-white rounded-2xl font-black text-2xl uppercase italic tracking-tighter shadow-xl hover:bg-lime-700 transition-all">Launch Session</button>
          </div>
        )}

        {view === 'play' && rounds[currentRoundIndex] && (
          <div className="max-w-2xl mx-auto space-y-6">
             <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-md">
                <button onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))} disabled={currentRoundIndex === 0} className="p-2 text-slate-400 disabled:opacity-20"><ChevronLeft size={32} /></button>
                <div className="text-center">
                  <p className="text-2xl font-black uppercase italic">Round {currentRoundIndex + 1}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatTime(timeLeft)} remaining</p>
                </div>
                <button onClick={() => { if (currentRoundIndex < rounds.length - 1) setCurrentRoundIndex(currentRoundIndex + 1); else setView('leaderboard'); }} className="p-2 text-slate-400 rotate-180"><ChevronLeft size={32} /></button>
             </div>

             <div className="space-y-4">
                {rounds[currentRoundIndex].matches.map((match) => (
                  <Card key={match.id} className={`${match.completed ? 'opacity-70 grayscale-[0.3]' : 'border-l-8 border-lime-500'}`}>
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1"><p className="text-sm font-black uppercase truncate">{match.team1[0].name}</p><p className="text-sm font-black uppercase truncate">{match.team1[1].name}</p></div>
                          <input type="tel" inputMode="numeric" value={match.score1} disabled={match.completed} onFocus={handleScoreFocus} onChange={(e) => updateScore(match.id, 1, e.target.value)} className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl text-center text-3xl font-black outline-none border-2 border-transparent focus:border-lime-500" />
                        </div>
                        <div className="flex items-center gap-2"><div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /><span className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase italic">VS</span><div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1"><p className="text-sm font-black uppercase truncate">{match.team2[0].name}</p><p className="text-sm font-black uppercase truncate">{match.team2[1].name}</p></div>
                          <input type="tel" inputMode="numeric" value={match.score2} disabled={match.completed} onFocus={handleScoreFocus} onChange={(e) => updateScore(match.id, 2, e.target.value)} className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl text-center text-3xl font-black outline-none border-2 border-transparent focus:border-lime-500" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!match.completed ? <button onClick={() => finalizeMatch(match.id)} className="w-14 h-14 bg-lime-600 text-white rounded-xl flex items-center justify-center shadow-lg"><CheckCircle2 size={28} /></button> : <button onClick={() => updateScore(match.id, 1, '0')} className="w-14 h-14 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center"><Edit2 size={24} /></button>}
                      </div>
                    </div>
                  </Card>
                ))}
             </div>
             
             <button onClick={() => { if (currentRoundIndex < rounds.length - 1) { setCurrentRoundIndex(currentRoundIndex + 1); resetTimer(); } else setView('leaderboard'); }} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-xl uppercase tracking-widest shadow-xl active:scale-[0.99] transition-all">Next Round →</button>
          </div>
        )}

        {view === 'summary' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            {rounds.map((round, rIdx) => (
              <Card key={rIdx} className="p-4 border-t-4 border-slate-200">
                <h3 className="text-xs font-black uppercase text-lime-600 mb-4 flex justify-between">Round {round.number} {rIdx === currentRoundIndex && <span className="text-rose-500 animate-pulse">Live</span>}</h3>
                <div className="space-y-4">
                  {round.matches.map((m, mIdx) => (
                    <div key={mIdx} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between text-[9px] text-slate-400 mb-2"><span>Court {m.court}</span>{m.completed && <span className="text-lime-600 font-black">{m.score1}-{m.score2}</span>}</div>
                      <p className="text-[11px] font-bold truncate">{m.team1.map(p => p.name).join(' & ')}</p>
                      <p className="text-[9px] font-black text-slate-300 uppercase italic my-0.5">vs</p>
                      <p className="text-[11px] font-bold truncate">{m.team2.map(p => p.name).join(' & ')}</p>
                    </div>
                  ))}
                  {round.sittingOut && round.sittingOut.length > 0 && (
                    <div className="pt-2 border-t mt-2">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Sitting Out</p>
                       <p className="text-[10px] font-bold text-slate-500 truncate">{round.sittingOut.map(p => p.name).join(', ')}</p>
                    </div>
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
              <Card className="p-12 text-center space-y-4">
                <Activity size={48} className="mx-auto text-slate-300 animate-pulse" />
                <p className="text-slate-500 font-bold italic uppercase tracking-tight">Standings available after first score entry.</p>
                <button onClick={() => setView('play')} className="bg-lime-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs">Back to Games</button>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3">
                  {leaderboard.map((stat, idx) => (
                    <div key={stat.id} className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 ${idx < 4 ? 'border-lime-500' : 'border-slate-100 dark:border-slate-800'}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${idx < 4 ? 'bg-lime-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{stat.displayRank}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-lg uppercase truncate">{stat.name}</h4>
                          {idx < 4 && <Medal size={16} className="text-amber-400" />}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.wins}W - {stat.losses}L • Total: {stat.pointsFor} Pts</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-lime-600">{(stat as any).avgPoints.toFixed(1)}</div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Avg PPG</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-2xl border-2 border-amber-500/30">
                      <h3 className="text-amber-600 font-black uppercase text-xs mb-4">Gold Bracket (Finals)</h3>
                      {leaderboard.slice(0, 4).map(p => <div key={p.id} className="flex justify-between font-bold text-sm mb-1 uppercase tracking-tight"><span>{p.name}</span> <span className="text-amber-600">#{p.displayRank}</span></div>)}
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
                      <h3 className="text-slate-500 font-black uppercase text-xs mb-4">Bronze Bracket</h3>
                      {leaderboard.slice(4, 8).map(p => <div key={p.id} className="flex justify-between font-bold text-sm mb-1 uppercase tracking-tight"><span>{p.name}</span> <span className="text-slate-500">#{p.displayRank}</span></div>)}
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
