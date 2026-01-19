import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users, Trophy, Settings, Plus, Trash2, CheckCircle2, ChevronLeft, 
  PlayCircle, Edit2, LayoutGrid, Medal, RefreshCw, Play, Pause, 
  RotateCcw, Info, X, AlertCircle, CheckCircle, Coffee, Upload, Download, ExternalLink, Scale, Hash, Bell, ArrowUpDown
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

  // --- AUDIO ---
  const playAlert = () => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain); gain.connect(context.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(880, context.currentTime); 
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1);
      osc.start(); osc.stop(context.currentTime + 1);
    } catch (e) {}
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

  // --- TIMER ---
  useEffect(() => {
    if (timerActive && targetTime) {
      timerRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) { setTimerActive(false); setShowTimeUp(true); playAlert(); }
      }, 500);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, targetTime]);

  const toggleTimer = () => {
    if (timerActive) { setTimerActive(false); setTargetTime(null); }
    else { setTargetTime(Date.now() + (timeLeft * 1000)); setTimerActive(true); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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
      timestamp: new Date().toISOString() 
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
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.players) setPlayers(data.players);
        if (data.rounds) setRounds(data.rounds);
        if (data.courtCount) setCourtCount(data.courtCount);
        if (data.numRounds) setNumRounds(data.numRounds);
        if (data.selectedDuration) setSelectedDuration(data.selectedDuration);
        if (typeof data.currentRoundIndex === 'number') setCurrentRoundIndex(data.currentRoundIndex);
        setView(data.view || 'play');
      } catch (err) { alert("Invalid file format."); }
    };
    reader.readAsText(file);
  };

  // --- PLAYER MANAGEMENT ---
  const nameParts = newPlayerName.trim().split(/\s+/).filter(p => p.length > 0);
  const isValidName = nameParts.length >= 2 && nameParts[0].length > 1;
  const formattedPreview = useMemo(() => {
    if (!isValidName) return '';
    const first = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
    const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    return `${first} ${lastInitial}.`;
  }, [nameParts, isValidName]);

  const isDuplicate = useMemo(() => players.some(p => p.name.toLowerCase() === formattedPreview.toLowerCase()), [players, formattedPreview]);

  const handleAddPlayer = () => {
    if (!isValidName || isDuplicate) return;
    setPlayers([...players, { id: Date.now(), name: formattedPreview }]);
    setNewPlayerName('');
  };

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
        ].sort((a, b) => {
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
    players.forEach(p => stats[p.id] = { id: p.id, name: p.name, wins: 0, losses: 0, ties: 0, gamesPlayed: 0, pointsFor: 0, pointsAgainst: 0 });
    
    rounds.forEach(r => r.matches.forEach(m => {
      if (!m.completed) return;
      const s1 = parseInt(m.score1) || 0, s2 = parseInt(m.score2) || 0;
      
      m.team1.forEach(p => { 
        if(stats[p.id]) { 
          stats[p.id].gamesPlayed++; 
          stats[p.id].pointsFor += s1; 
          stats[p.id].pointsAgainst += s2; 
          if(s1 > s2) stats[p.id].wins++; 
          else if(s1 < s2) stats[p.id].losses++;
          else stats[p.id].ties++;
        }
      });
      
      m.team2.forEach(p => { 
        if(stats[p.id]) { 
          stats[p.id].gamesPlayed++; 
          stats[p.id].pointsFor += s2; 
          stats[p.id].pointsAgainst += s1; 
          if(s2 > s1) stats[p.id].wins++; 
          else if(s2 < s1) stats[p.id].losses++;
          else stats[p.id].ties++;
        }
      });
    }));

    return Object.values(stats)
      .filter((s:any) => s.gamesPlayed > 0)
      .map((s: any) => ({
        ...s, 
        avgPoints: s.pointsFor / s.gamesPlayed
      }))
      .sort((a, b) => b[sortKey] - a[sortKey] || b.wins - a.wins)
      .map((p, i) => ({ ...p, displayRank: i + 1 })) as PlayerStats[];
  }, [rounds, players, sortKey]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 font-sans text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <header className="sticky top-0 z-[60] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <PickleFlowLogo />
            <div className="flex gap-4">
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-slate-400 hover:text-lime-600 transition-colors"><Upload size={18} /><span className="text-[8px] font-black uppercase mt-1">Import</span></button>
              <button onClick={handleExport} className="flex flex-col items-center text-slate-400 hover:text-lime-600 transition-colors"><Download size={18} /><span className="text-[8px] font-black uppercase mt-1">Export</span></button>
              <button onClick={() => confirm("Reset all data?") && (localStorage.clear() || window.location.reload())} className="flex flex-col items-center text-slate-400 hover:text-rose-500 transition-colors"><RefreshCw size={18} /><span className="text-[8px] font-black uppercase mt-1">Wipe</span></button>
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
          
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
              <div className="space-y-3 mb-6">
                <div className="flex gap-2 relative">
                  <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()} placeholder="First Last" className={`flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl pl-4 pr-12 py-4 outline-none font-bold border-2 transition-all ${newPlayerName.trim() === '' ? 'border-transparent' : isDuplicate ? 'border-rose-500' : isValidName ? 'border-lime-500' : 'border-orange-400'}`} />
                  {isValidName && !isDuplicate && <button onClick={handleAddPlayer} className="px-7 rounded-xl bg-lime-600 text-white shadow-lg"><Plus size={32} /></button>}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-1">
                {players.map((p, idx) => (<div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border"><span className="font-black">{idx + 1}. {p.name}</span><button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 size={20} /></button></div>))}
              </div>
            </Card>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center"><h3 className="text-[10px] font-black text-slate-400 uppercase">Rounds</h3><select value={numRounds} onChange={(e) => setNumRounds(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600">{ROUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center"><h3 className="text-[10px] font-black text-slate-400 uppercase">Min / Round</h3><select value={selectedDuration} onChange={(e) => {setSelectedDuration(parseInt(e.target.value)); setTimeLeft(parseInt(e.target.value)*60);}} className="w-full bg-transparent font-black text-xl text-lime-600">{DURATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border text-center"><h3 className="text-[10px] font-black text-slate-400 uppercase">Courts</h3><select value={courtCount} onChange={(e) => setCourtCount(parseInt(e.target.value))} className="w-full bg-transparent font-black text-xl text-lime-600">{COURT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            </div>
            <button onClick={generateSchedule} disabled={players.length < 4} className={`w-full py-6 rounded-2xl font-black text-2xl uppercase italic tracking-tighter shadow-xl transition-all ${players.length < 4 ? 'bg-slate-200 text-slate-400' : 'bg-lime-600 text-white'}`}>Start Tournament</button>
          </div>
        )}

        {view === 'play' && rounds[currentRoundIndex] && (
          <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-md flex items-center justify-between">
                <button onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))} disabled={currentRoundIndex === 0} className="p-2 text-slate-400 disabled:opacity-20"><ChevronLeft size={32}/></button>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-2xl font-black uppercase italic">Round {currentRoundIndex + 1}</p>
                    {currentRoundIndex === trueActiveRoundIndex && <span className="bg-lime-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black animate-pulse uppercase tracking-widest">ACTIVE</span>}
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <button onClick={() => setTimeLeft(selectedDuration * 60)} className="text-slate-400"><RotateCcw size={14}/></button>
                    <span className="font-mono font-black text-lime-600 tracking-widest text-lg">{formatTime(timeLeft)}</span>
                    <button onClick={toggleTimer} className="text-slate-400">{timerActive ? <Pause size={14} fill="currentColor"/> : <Play size={14} fill="currentColor"/>}</button>
                  </div>
                </div>
                <button onClick={() => currentRoundIndex < rounds.length - 1 ? setCurrentRoundIndex(currentRoundIndex + 1) : setView('leaderboard')} className="p-2 text-slate-400 rotate-180"><ChevronLeft size={32}/></button>
             </div>

             <div className="space-y-6">
                {rounds[currentRoundIndex].matches.map((match) => (
                  <Card key={match.id} className={`${match.completed ? 'opacity-60 grayscale-[0.5]' : 'border-l-8 border-lime-500 shadow-lg'}`}>
                    <div className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Court {match.court}</span>
                      {match.completed && <CheckCircle size={14} className="text-lime-400" />}
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-lime-50/50 dark:bg-lime-900/10 p-3 rounded-xl border border-lime-100">
                          <div className="flex-1 font-black uppercase text-sm text-lime-800 dark:text-lime-400">
                            {match.team1[0]?.name}<br/>{match.team1[1]?.name}
                          </div>
                          <input type="tel" value={match.score1} onChange={(e) => updateScore(match.id, 1, e.target.value)} onFocus={(e) => e.target.select()} className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl text-center text-3xl font-black border-2 border-lime-200 outline-none focus:border-lime-500 transition-colors" />
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                          <span className="text-[10px] font-black text-slate-400 uppercase italic">VS</span>
                          <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                        </div>

                        <div className="flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100">
                          <div className="flex-1 font-black uppercase text-sm text-blue-800 dark:text-blue-400">
                            {match.team2[0]?.name}<br/>{match.team2[1]?.name}
                          </div>
                          <input type="tel" value={match.score2} onChange={(e) => updateScore(match.id, 2, e.target.value)} onFocus={(e) => e.target.select()} className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl text-center text-3xl font-black border-2 border-blue-200 outline-none focus:border-blue-500 transition-colors" />
                        </div>
                      </div>

                      <button onClick={() => setRounds(prev => prev.map(r => ({...r, matches: r.matches.map(m => m.id === match.id ? {...m, completed: !m.completed} : m)})))} className={`w-full py-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${match.completed ? 'bg-slate-100 text-slate-500' : 'bg-lime-600 text-white shadow-lg'}`}>
                        {match.completed ? <><Edit2 size={18}/> Edit Scores</> : <><CheckCircle2 size={18}/> Add Final Score</>}
                      </button>
                    </div>
                  </Card>
                ))}

                {rounds[currentRoundIndex].sittingOut.length > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-dashed border-orange-200 dark:border-orange-900/50 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-orange-500 p-2 rounded-lg text-white"><Coffee size={20} /></div>
                      <h4 className="font-black uppercase italic text-orange-600 tracking-tight">Sitting Out This Round</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rounds[currentRoundIndex].sittingOut.map(p => (
                        <span key={p.id} className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-orange-100 dark:border-orange-900/30 font-black text-sm uppercase text-orange-700 shadow-sm">{p.name}</span>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {view === 'summary' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24 animate-in fade-in zoom-in-95">
            {rounds.map((round, rIdx) => {
              const isActive = rIdx === trueActiveRoundIndex;
              return (
                <Card key={rIdx} className={`p-4 transition-all duration-300 ${isActive ? 'ring-4 ring-lime-500 scale-[1.02] shadow-2xl bg-white z-10' : 'opacity-60 grayscale-[0.2]'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <button onClick={() => { setCurrentRoundIndex(rIdx); setView('play'); }} className="flex flex-col items-start group">
                      <h3 className={`font-black uppercase italic flex items-center gap-1 ${isActive ? 'text-lime-600 text-lg' : 'text-slate-400 text-xs'}`}>Round {round.number} <ExternalLink size={isActive ? 14 : 10} /></h3>
                    </button>
                    {isActive && <span className="bg-lime-500 text-white text-[8px] px-2 py-1 rounded-full font-black animate-pulse uppercase tracking-widest">ACTIVE</span>}
                  </div>
                  <div className="space-y-4">
                    {round.matches.map((m, mIdx) => (
                      <div key={mIdx} className={`p-3 rounded-xl border ${isActive ? 'border-lime-100 bg-lime-50/30' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-2 uppercase"><span>Court {m.court}</span>{m.completed && <span className="text-lime-600 font-black">Final: {m.score1}-{m.score2}</span>}</div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-black uppercase leading-none">{m.team1.map(p => p.name).join(' & ')}</p>
                          <div className="flex items-center gap-2 py-1"><div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" /><span className="text-[7px] font-black text-slate-400 uppercase">VS</span><div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" /></div>
                          <p className="text-[11px] font-black uppercase leading-none">{m.team2.map(p => p.name).join(' & ')}</p>
                        </div>
                      </div>
                    ))}
                    {round.sittingOut.length > 0 && (
                      <div className="mt-2 pt-3 border-t-2 border-dotted border-orange-200">
                        <div className="flex items-center gap-1.5 mb-1 text-orange-500"><Coffee size={10} /><p className="text-[8px] font-black uppercase text-orange-400">Resting:</p></div>
                        <div className="flex flex-wrap gap-1">
                          {round.sittingOut.map(p => (<span key={p.id} className="text-[10px] font-bold text-orange-700/80 px-1">{p.name}</span>))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {view === 'leaderboard' && (
          <div className="max-w-3xl mx-auto space-y-6 pb-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div><h2 className="text-4xl font-black italic uppercase tracking-tighter">Standings</h2><button onClick={() => setShowInfo(true)} className="mt-2 flex items-center gap-1.5 text-lime-600 font-black text-[10px] uppercase tracking-widest hover:underline"><Info size={14}/> How scoring works</button></div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border self-start">
                <span className="text-[8px] font-black uppercase text-slate-400 px-2 flex items-center gap-1"><ArrowUpDown size={10}/> Sort By:</span>
                <button onClick={() => setSortKey('avgPoints')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${sortKey === 'avgPoints' ? 'bg-white dark:bg-slate-700 text-lime-600 shadow-sm' : 'text-slate-500'}`}>Avg PPG</button>
                <button onClick={() => setSortKey('pointsFor')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${sortKey === 'pointsFor' ? 'bg-white dark:bg-slate-700 text-lime-600 shadow-sm' : 'text-slate-500'}`}>Total Pts</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {leaderboard.map((stat, idx) => (
                <div key={stat.id} className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all ${idx < 3 ? 'border-lime-500 shadow-lg scale-[1.01]' : 'border-slate-100 dark:border-slate-800 opacity-90'}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${idx < 3 ? 'bg-lime-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{stat.displayRank}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-lg uppercase truncate flex items-center gap-2">{stat.name} {idx === 0 && <Medal size={20} className="text-amber-400" />}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">W-L-T: {stat.wins}-{stat.losses}-{stat.ties} • {stat.gamesPlayed} Games</p>
                  </div>
                  <div className="flex gap-4 md:gap-8 items-center shrink-0 pr-2">
                    <div className={`text-right ${sortKey === 'pointsFor' ? 'opacity-100' : 'opacity-50'}`}><div className="text-lg font-black">{stat.pointsFor}</div><p className="text-[8px] font-black text-slate-400 uppercase">Total</p></div>
                    <div className={`text-right ${sortKey === 'avgPoints' ? 'opacity-100' : 'opacity-50'}`}><div className="text-lg font-black text-lime-600">{stat.avgPoints.toFixed(1)}</div><p className="text-[8px] font-black text-slate-400 uppercase">PPG</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showInfo && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
            <Card className="max-w-xl w-full p-8 relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
              <h3 className="text-3xl font-black uppercase italic text-lime-600 flex items-center gap-2 mb-6"><Trophy size={28}/> Scoring Logic</h3>
              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-lime-600 mb-3 font-black uppercase text-xs tracking-widest"><Hash size={18}/> Primary: Points Per Game (PPG)</div>
                  <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                    To maintain fairness when players sit out, we use <strong>PPG</strong> as the primary metric. It measures efficiency—how many points you generate every time you step on the court. This prevents a player from dropping in rank just because the schedule gave them a rest round.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-blue-600 mb-3 font-black uppercase text-xs tracking-widest"><Scale size={18}/> Secondary: Total Points For</div>
                  <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                    If two players have identical PPG, we look at <strong>Total Points For</strong>. This rewards volume and consistency across the entire session. It’s the ultimate tie-breaker to see who has been the most productive overall.
                  </p>
                </div>
                <div className="p-4 bg-lime-50 dark:bg-lime-900/10 rounded-xl border border-lime-100 dark:border-lime-900/30">
                  <p className="text-[10px] font-black text-lime-700 dark:text-lime-400 uppercase leading-normal tracking-wide italic">
                    Note: Wins/Losses/Ties are tracked for your personal record, but points are the currency of PickleFlow standings. Every point matters!
                  </p>
                </div>
              </div>
              <button onClick={() => setShowInfo(false)} className="w-full mt-8 py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95 transition-all">Back to Leaderboard</button>
            </Card>
          </div>
        )}

        {showTimeUp && (
          <div className="fixed inset-0 z-[200] bg-rose-600/95 backdrop-blur-xl flex items-center justify-center p-4">
             <div className="text-center space-y-8 animate-in zoom-in-95">
                <Bell size={100} className="text-white mx-auto animate-bounce" />
                <h2 className="text-5xl font-black italic uppercase text-white tracking-tighter">Time's Up!</h2>
                <button onClick={() => setShowTimeUp(false)} className="px-12 py-6 bg-white text-rose-600 rounded-[2rem] font-black text-2xl uppercase italic tracking-tighter shadow-2xl transition-all">Clear Alert</button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
