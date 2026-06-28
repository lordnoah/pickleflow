import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Bell } from 'lucide-react';

interface TimerProps {
  duration: number; // in minutes
}

export const Timer: React.FC<TimerProps> = ({ duration }) => {
  const [timeLeftMs, setTimeLeftMs] = useState(duration * 60 * 1000);
  const [timerActive, setTimerActive] = useState(false);
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [showTimeUp, setShowTimeUp] = useState(false);

  const timerRef = useRef<number | null>(null);

  // --- AUDIO ALERTS ---
  const playAlert = () => {
    try {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
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
    } catch {
      /* ignore audio error */
    }
  };

  // --- INTERVAL TICKING WITH WAKE-UP SELF-CORRECTION & MILLISECOND PRECISION ---
  useEffect(() => {
    if (timerActive && targetTime) {
      timerRef.current = window.setInterval(() => {
        const remaining = Math.max(0, targetTime - Date.now());
        setTimeLeftMs(remaining);
        if (remaining === 0) {
          setTimerActive(false);
          setTargetTime(null);
          setShowTimeUp(true);
          playAlert();
        }
      }, 100); // check every 100ms for high responsiveness
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, targetTime]);

  // --- SCREEN WAKE LOCK API ---
  useEffect(() => {
    let activeSentinel: WakeLockSentinel | null = null;

    const acquireWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          activeSentinel = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock acquisition failed:', err);
      }
    };

    const releaseWakeLock = async () => {
      try {
        if (activeSentinel) {
          await activeSentinel.release();
          activeSentinel = null;
        }
      } catch (err) {
        console.warn('Wake Lock release failed:', err);
      }
    };

    if (timerActive) {
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [timerActive]);

  const toggleTimer = () => {
    if (timerActive) {
      setTimerActive(false);
      setTargetTime(null);
    } else {
      setTargetTime(Date.now() + timeLeftMs);
      setTimerActive(true);
    }
  };

  const handleReset = () => {
    setTimerActive(false);
    setTargetTime(null);
    setTimeLeftMs(duration * 60 * 1000);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-3 mt-1">
        <button
          onClick={handleReset}
          className="text-slate-400 hover:text-lime-600 p-1 rounded-lg transition-colors"
          title="Reset timer"
        >
          <RotateCcw size={16} />
        </button>
        <span className="font-mono font-black text-lime-600 tracking-widest text-lg select-none">
          {formatTime(timeLeftMs)}
        </span>
        <button
          onClick={toggleTimer}
          className="text-slate-400 hover:text-lime-600 p-1 rounded-lg transition-colors"
          title={timerActive ? 'Pause timer' : 'Start timer'}
        >
          {timerActive ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" />
          )}
        </button>
      </div>

      {showTimeUp && (
        <div className="fixed inset-0 z-[200] bg-rose-600/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="text-center space-y-8 animate-in zoom-in-95">
            <Bell size={100} className="text-white mx-auto animate-bounce" />
            <h2 className="text-5xl font-black italic uppercase text-white tracking-tighter select-none">
              Time's Up!
            </h2>
            <button
              onClick={() => setShowTimeUp(false)}
              className="px-12 py-6 bg-white text-rose-600 hover:bg-slate-50 rounded-[2rem] font-black text-2xl uppercase italic tracking-tighter shadow-2xl active:scale-95 transition-all"
            >
              Clear Alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
