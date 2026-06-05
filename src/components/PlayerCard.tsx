import React from 'react';
import { Player, Region } from '../types';
import { Shield, Swords, Sparkles, User, Crosshair, Star, HelpCircle } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  region?: Region;
  teamName?: string;
  year?: number;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  isCompact?: boolean;
}

export default function PlayerCard({
  player,
  region,
  teamName,
  year,
  onClick,
  selected = false,
  disabled = false,
  isCompact = false,
}: PlayerCardProps) {
  const getRatingTier = (rating: number) => {
    if (rating >= 88) return 'gold';
    if (rating >= 80) return 'silver';
    return 'bronze';
  };

  const tier = getRatingTier(player.rating);

  const getRoleIcon = (roleStr: string) => {
    switch (roleStr) {
      case 'top':
        return <Shield className="w-4 h-4 text-[#c8aa6e]" />;
      case 'jungle':
        return <Swords className="w-4 h-4 text-emerald-500" />;
      case 'mid':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'adc':
        return <Crosshair className="w-4 h-4 text-red-400" />;
      case 'support':
        return <Star className="w-4 h-4 text-cyan-400" />;
      case 'coach':
        return <User className="w-4 h-4 text-[#c8aa6e]" />;
      default:
        return <HelpCircle className="w-4 h-4 text-[#a09b8c]" />;
    }
  };

  const getRoleLabel = (roleStr: string) => {
    switch (roleStr) {
      case 'top': return 'TOP';
      case 'jungle': return 'JUNG';
      case 'mid': return 'MID';
      case 'adc': return 'ADC';
      case 'support': return 'SUPP';
      case 'coach': return 'ENTR';
      default: return 'RES';
    }
  };

  const getTierStyles = () => {
    switch (tier) {
      case 'gold':
        return {
          cardBg: 'bg-gradient-to-b from-[#010a13] via-[#091428] to-[#1e2328]/50 border-2 border-[#c8aa6e] shadow-yellow-950/20',
          glow: 'shadow-[0_0_15px_rgba(200,170,110,0.25)]',
          badgeText: 'text-[#c8aa6e] font-bold',
          badgeBg: 'bg-[#c8aa6e]/15 border-[#c8aa6e]/30',
          ratingColor: 'text-[#c8aa6e] font-extrabold',
          nameGlow: 'hover:text-[#f0e6d2]',
        };
      case 'silver':
        return {
          cardBg: 'bg-gradient-to-b from-[#010a13] via-[#091428] to-[#1e2328] border-2 border-slate-400/50 shadow-[#1e2328]/40',
          glow: 'shadow-[0_0_12px_rgba(156,163,175,0.2)]',
          badgeText: 'text-slate-200 font-semibold',
          badgeBg: 'bg-slate-500/10 border-slate-500/20',
          ratingColor: 'text-slate-200 font-extrabold',
          nameGlow: 'hover:text-slate-100',
        };
      default:
        return {
          cardBg: 'bg-gradient-to-b from-[#010a13] via-[#091428] to-[#1e2328]/30 border border-[#c8aa6e]/20 shadow-[#010a13]/80',
          glow: 'shadow-lg',
          badgeText: 'text-[#a09b8c]',
          badgeBg: 'bg-[#1e2328]/40 border-[#c8aa6e]/10',
          ratingColor: 'text-[#c8aa6e]/90 font-bold',
          nameGlow: 'hover:text-[#f0e6d2]',
        };
    }
  };

  const styles = getTierStyles();

  if (isCompact) {
    return (
      <div
        id={`player-compact-${player.id}`}
        onClick={!disabled ? onClick : undefined}
        className={`flex items-center gap-3 p-2 rounded-xl transition-all duration-200 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'
        } ${selected ? 'bg-[#c8aa6e]/20 border border-[#c8aa6e]/50' : 'bg-[#0a0e13]/90 border border-[#c8aa6e]/20'} ${styles.glow}`}
      >
        <div className={`text-xl font-black w-8 text-center px-1 py-0.5 rounded ${styles.badgeBg} ${styles.ratingColor}`}>
          {player.rating}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {getRoleIcon(player.role)}
            <span className="font-semibold text-[#f0e6d2] text-sm truncate">{player.name}</span>
          </div>
          <div className="text-[11px] text-[#a09b8c] flex items-center gap-1 truncate">
            <span>{getRoleLabel(player.role)}</span>
            {teamName && (
              <>
                <span className="text-[#c8aa6e]/40">•</span>
                <span className="truncate text-[#a09b8c]">{teamName} ({year})</span>
              </>
            )}
          </div>
        </div>
        {player.signatureChampion && (
          <div className="text-[10px] bg-[#010a13] px-2 py-1 rounded-md border border-[#c8aa6e]/10 text-[#a09b8c] font-mono">
            {player.signatureChampion}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      id={`player-card-${player.id}`}
      onClick={!disabled ? onClick : undefined}
      className={`relative w-[136px] sm:w-[160px] h-[204px] sm:h-[224px] rounded-2xl ${styles.cardBg} ${styles.glow} p-2.5 sm:p-3.5 flex flex-col justify-between transition-all duration-300 ${
        disabled
          ? 'opacity-40 cursor-not-allowed filter grayscale'
          : 'cursor-pointer hover:-translate-y-2.5 hover:shadow-[0_12px_24px_rgba(200,170,110,0.15)] hover:border-[#c8aa6e]'
      } ${selected ? 'ring-4 ring-[#c8aa6e] ring-offset-4 ring-offset-[#010a13] scale-102' : ''}`}
    >
      {/* Dynamic Background Rating Shield Design */}
      <div className="absolute top-2 left-2 flex flex-col items-center">
        <div className={`text-3xl font-black tracking-tighter ${styles.ratingColor}`}>
          {player.rating}
        </div>
        <div className="text-[9px] font-bold text-[#a09b8c] uppercase tracking-widest mt-0.5">
          {getRoleLabel(player.role)}
        </div>
        <div className="mt-1">
          {getRoleIcon(player.role)}
        </div>
      </div>

      {region && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-bold tracking-widest bg-[#010a13]/80 border border-[#c8aa6e]/20 rounded text-[#f0e6d2] uppercase">
          {region}
        </div>
      )}

      {/* Center Figure Placeholder / Visual */}
      <div className="flex-1 flex items-center justify-center pointer-events-none mt-5">
        <div className={`relative w-20 h-24 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-b overflow-hidden duration-300 ${
          player.role === 'top' ? 'from-[#c8aa6e]/20 via-[#010a13]/85 to-[#091428] border-[#c8aa6e]/40 shadow-[0_0_15px_rgba(200,170,110,0.15)]' :
          player.role === 'jungle' ? 'from-emerald-500/20 via-[#010a13]/85 to-[#091428] border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
          player.role === 'mid' ? 'from-[#a855f7]/20 via-[#010a13]/85 to-[#091428] border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' :
          player.role === 'adc' ? 'from-red-500/20 via-[#010a13]/85 to-[#091428] border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' :
          player.role === 'support' ? 'from-cyan-500/20 via-[#010a13]/85 to-[#091428] border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]' :
          'from-indigo-500/20 via-[#010a13]/85 to-[#091428] border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
        } border-2`}>
          {/* Subtle neon horizontal glow effect */}
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/10 animate-pulse" />
          
          {/* Stylized Esports Jersey Athlete Silhouette SVG */}
          <svg className="absolute inset-0 w-full h-full opacity-25 select-none pointer-events-none" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Athlete jersey collar & shoulders in corresponding themed color */}
            <path d="M15 95 C 25 78, 75 78, 85 95 Z" fill="currentColor" className={
              player.role === 'top' ? 'text-[#c8aa6e]' :
              player.role === 'jungle' ? 'text-emerald-500' :
              player.role === 'mid' ? 'text-purple-500' :
              player.role === 'adc' ? 'text-red-500' :
              player.role === 'support' ? 'text-cyan-500' :
              'text-indigo-500'
            } />
            {/* Head profile silhouette */}
            <circle cx="50" cy="48" r="17" fill="currentColor" className="text-slate-500" />
            {/* Esport visor HUD */}
            <path d="M38 45 h24 v7 h-24 z" fill="currentColor" className={
              player.role === 'top' ? 'text-[#c8aa6e]' :
              player.role === 'jungle' ? 'text-emerald-400' :
              player.role === 'mid' ? 'text-purple-400' :
              player.role === 'adc' ? 'text-red-400' :
              player.role === 'support' ? 'text-cyan-400' :
              'text-indigo-400'
            } />
          </svg>

          {/* Big glowing role insignia badge behind matching monogram */}
          <div className="absolute top-1.5 right-1.5 opacity-40">
            {getRoleIcon(player.role)}
          </div>
          
          <span className={`text-[23px] font-black tracking-tight font-display select-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] z-10 ${
            player.role === 'top' ? 'text-[#c8aa6e]' :
            player.role === 'jungle' ? 'text-emerald-400' :
            player.role === 'mid' ? 'text-purple-400' :
            player.role === 'adc' ? 'text-red-400' :
            player.role === 'support' ? 'text-cyan-400' :
            'text-indigo-400'
          }`}>
            {player.name.slice(0, 2).toUpperCase()}
          </span>

          {/* Power leveling level indicator bar */}
          <div className="absolute bottom-1.5 w-12 h-1 rounded-full bg-slate-950 flex overflow-hidden">
            <div className={`h-full ${
              player.role === 'top' ? 'bg-[#c8aa6e]' :
              player.role === 'jungle' ? 'bg-emerald-400' :
              player.role === 'mid' ? 'bg-purple-400' :
              player.role === 'adc' ? 'bg-red-400' :
              player.role === 'support' ? 'bg-cyan-400' :
              'bg-indigo-400'
            }`} style={{ width: `${Math.min(100, Math.max(30, (player.rating - 80) * 5))}%` }} />
          </div>
        </div>
      </div>

      {/* Card Footer Info */}
      <div className="text-center w-full mt-1.5 sm:mt-2">
        <div className="font-sans font-black tracking-tight text-[#f0e6d2] text-[13px] sm:text-sm leading-none truncate px-1">
          {player.name}
        </div>
        
        <div className="mt-1 sm:mt-1.5 pt-1 sm:pt-1.5 border-t border-[#c8aa6e]/10 flex flex-col items-center justify-center gap-0.5 min-h-[30px]">
          <span className="text-[9px] text-[#a09b8c] font-black uppercase tracking-wider truncate max-w-full">
            {teamName ? `${teamName} '${String(year).slice(-2)}` : 'S/E'}
          </span>
          {player.signatureChampion && (
            <div className="text-[9px] text-[#c8aa6e] font-extrabold truncate uppercase tracking-widest leading-none">
              ⭐ {player.signatureChampion}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
