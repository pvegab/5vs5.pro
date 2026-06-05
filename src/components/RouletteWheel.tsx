import React, { useState, useEffect } from 'react';
import { HistoricalTeam, Region } from '../types';
import { RefreshCw, Compass, CheckCircle } from 'lucide-react';
import { Language, TRANSLATIONS } from '../locales';
import { playRouletteTick } from '../utils/audio';

interface RouletteWheelProps {
  teams: HistoricalTeam[];
  onResult: (team: HistoricalTeam) => void;
  canSpin: boolean;
  isDraftComplete: boolean;
  lang?: Language;
}

export default function RouletteWheel({
  teams,
  onResult,
  canSpin,
  isDraftComplete,
  lang = 'es',
}: RouletteWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [currentDisplayTeam, setCurrentDisplayTeam] = useState<HistoricalTeam | null>(null);

  const activeTrans = TRANSLATIONS[lang] || TRANSLATIONS['es'];

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (spinning) {
      let speed = 40;
      let elapsed = 0;
      const duration = 2500;

      const tick = () => {
        setTickerIndex((prev) => (prev + 1) % teams.length);
        const pitchFactor = Math.max(0.48, 1.0 - (elapsed / duration) * 0.45);
        playRouletteTick(pitchFactor);
        elapsed += speed;

        if (elapsed < duration) {
          speed = Math.min(250, speed + Math.floor(elapsed / 150));
          interval = setTimeout(tick, speed);
        } else {
          setSpinning(false);
          const randomIndex = Math.floor(Math.random() * teams.length);
          const finalTeam = teams[randomIndex];
          setCurrentDisplayTeam(finalTeam);
          onResult(finalTeam);
        }
      };

      interval = setTimeout(tick, speed);
    }

    return () => clearTimeout(interval);
  }, [spinning, teams, onResult]);

  const handleSpin = () => {
    if (!canSpin || spinning || isDraftComplete) return;
    setSpinning(true);
    setCurrentDisplayTeam(null);
  };

  const activeTickTeam = spinning ? teams[tickerIndex] : currentDisplayTeam;

  const getRegionColor = (region?: Region) => {
    switch (region) {
      case 'LCK':
        return 'from-sky-500/10 via-sky-900/40 to-slate-950 border-sky-500/50 text-sky-400';
      case 'LPL':
        return 'from-red-500/10 via-red-900/40 to-slate-950 border-red-500/50 text-red-400';
      case 'LEC':
        return 'from-amber-500/10 via-orange-950/40 to-slate-950 border-orange-500/50 text-orange-400';
      case 'LCS':
        return 'from-indigo-500/10 via-indigo-900/40 to-slate-950 border-indigo-500/50 text-indigo-400';
      default:
        return 'from-purple-500/10 via-purple-900/40 to-slate-950 border-purple-500/50 text-purple-400';
    }
  };

  const getRegionFlag = (region?: Region) => {
    switch (region) {
      case 'LCK':
        return 'KR 🇰🇷';
      case 'LPL':
        return 'CN 🇨🇳';
      case 'LEC':
        return 'EU 🇪🇺';
      case 'LCS':
        return 'NA 🇺🇸';
      default:
        return 'INT 🌐';
    }
  };

  return (
    <div id="roulette-wheel-container" className="bg-[#091428] border border-[#c8aa6e]/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Decorative cyber wires */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c8aa6e]/50 to-transparent" />

      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#010a13] rounded-full border border-[#c8aa6e]/10 mb-2">
          <Compass className="w-4 h-4 text-[#c8aa6e] animate-spin" style={{ animationDuration: spinning ? '1.5s' : '8s' }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#a09b8c]">
            {spinning ? activeTrans.spiningWheel : activeTrans.spinRuleta}
          </span>
        </div>
        <p className="text-xs text-[#a09b8c]">
          {lang === 'es'
            ? 'Gira para invocar un equipo del mundial y selecciona a uno de sus jugadores para tu Roster'
            : activeTrans.modeNormalDesc.slice(0, 90) + '...'}
        </p>
      </div>

      {/* Screen Interface Display */}
      <div className="relative h-28 my-4 flex items-center justify-center">
        {/* Roulette frame & arrow markers */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#c8aa6e] rotate-45 z-10 clip-path-triangle shadow-[0_0_8px_rgba(200,170,110,0.6)]" />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#c8aa6e] rotate-45 z-10 clip-path-triangle shadow-[0_0_8px_rgba(200,170,110,0.6)]" />

        {/* Dynamic Display Board */}
        <div className={`w-full max-w-sm h-full rounded-xl border flex flex-col justify-center items-center p-4 transition-all duration-300 relative overflow-hidden ${
          activeTickTeam ? getRegionColor(activeTickTeam.region) : 'bg-[#010a13]/80 border-[#c8aa6e]/20 text-[#a09b8c]'
        }`}>
          {activeTickTeam ? (
            <div className={`text-center transition-all duration-100 w-full min-w-0 ${spinning ? 'scale-95' : 'scale-100'}`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#010a13]/80 border border-[#c8aa6e]/10 tracking-wider">
                  {getRegionFlag(activeTickTeam.region)}
                </span>
                <span className="text-[10px] font-black text-[#c8aa6e] bg-[#c8aa6e]/10 border border-[#c8aa6e]/20 px-2 py-0.5 rounded-full tracking-wider">
                  {activeTrans.luckyTeam}
                </span>
              </div>

              <h3 className="text-2xl font-black text-[#f0e6d2] tracking-tight uppercase truncate font-display flex items-baseline justify-center gap-2 min-w-0">
                <span className="truncate">{activeTickTeam.name}</span>
                <span className="shrink-0">{activeTickTeam.year}</span>
              </h3>

              <p className="text-[11px] text-[#a09b8c] font-mono tracking-widest mt-1 uppercase">
                {activeTrans.title}
              </p>
            </div>
          ) : (
            <div className="text-center font-mono py-2">
              {isDraftComplete ? (
                <div className="flex flex-col items-center gap-1.5">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                  <span className="text-sm font-extrabold text-[#00c8c8] uppercase tracking-wider">{activeTrans.completedBadge}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm text-[#f0e6d2] font-sans font-bold">GRID READY</span>
                  <p className="text-[10px] text-[#a09b8c] uppercase tracking-widest">{lang === 'es' ? 'Presiona GIRAR abajo' : 'CLICK SPIN BELOW'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trigger CTA Button */}
      <div className="mt-4 flex justify-center">
        <button
          id="btn-spin-roulette"
          onClick={handleSpin}
          disabled={!canSpin || spinning || isDraftComplete}
          className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold uppercase text-sm tracking-widest transition-all duration-300 shadow-lg cursor-pointer ${
            isDraftComplete
              ? 'bg-[#1e2328] hover:bg-[#1e2328] text-[#a09b8c]/50 border border-[#c8aa6e]/10 cursor-not-allowed shadow-none'
              : !canSpin || spinning
              ? 'bg-[#010a13]/40 text-[#a09b8c]/50 border border-[#c8aa6e]/10 cursor-not-allowed shadow-none'
              : 'bg-[#c8aa6e] hover:brightness-110 text-[#010a13] font-black shadow-yellow-950/20 hover:-translate-y-0.5'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
          {spinning
            ? activeTrans.spiningWheel
            : isDraftComplete
            ? activeTrans.completedBadge
            : canSpin
            ? activeTrans.spinBtn
            : (lang === 'es' ? 'ELIGE POSICIÓN' : 'ASSIGN PLAYER')}
        </button>
      </div>

      {spinning && (
        <div className="text-center mt-3 animate-pulse">
          <span className="text-[10px] font-bold text-[#a09b8c] tracking-wider">
            {lang === 'es' ? 'Analizando estadísticas...' : 'Syncing Lol stats...'}
          </span>
        </div>
      )}
    </div>
  );
}
