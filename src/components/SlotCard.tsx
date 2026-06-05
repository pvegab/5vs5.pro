import React from 'react';
import { SelectedSlot, Role } from '../types';
import { Language } from '../locales';
import { Shield, Swords, Sparkles, Crosshair, Star, Brain, PlusCircle, HelpCircle } from 'lucide-react';

interface SlotCardProps {
  key?: React.Key;
  role: Role;
  slot: SelectedSlot;
  lang?: Language;
  isSelectableToPlace?: boolean;
  onClear?: () => void;
  onPlace?: () => void;
  highlighted?: boolean;
}

const ROLE_TRANSLATIONS: Record<Language, Record<Role, { title: string; desc: string }>> = {
  es: {
    top: { title: 'LÍNEA SUPERIOR', desc: 'Sólido Duelista y Tanque' },
    jungle: { title: 'JUNGLA', desc: 'Asaltante y Control de Objetivos' },
    mid: { title: 'CARRIL CENTRAL', desc: 'Mago Explosivo o Asesino' },
    adc: { title: 'TIRADOR ADC', desc: 'Daño de Ataque Continuo' },
    support: { title: 'SOPORTE', desc: 'Protección y Utilidad de Equipo' },
    coach: { title: 'ENTRENADOR', desc: 'Cerebro y Estratega de Drafts' },
    reserve: { title: 'RESERVA', desc: 'Apoyo Secundario' },
  },
  en: {
    top: { title: 'TOP LANE', desc: 'Solid Duelist & Tank' },
    jungle: { title: 'JUNGLE', desc: 'Roamer & Objective Control' },
    mid: { title: 'MID LANE', desc: 'Burst Mage or Assassin' },
    adc: { title: 'ADC CARRY', desc: 'Consistent Physical Damage' },
    support: { title: 'SUPPORT', desc: 'Peel, Vision & Utility' },
    coach: { title: 'HEAD COACH', desc: 'Draft Brain & Strategy' },
    reserve: { title: 'RESERVE', desc: 'Secondary Backup' },
  },
  fr: {
    top: { title: 'TOP LANE', desc: 'Dueliste Solide & Tank' },
    jungle: { title: 'JUNGLE', desc: 'Contrôle des Objectifs' },
    mid: { title: 'MID LANE', desc: 'Mage à Burst ou Assassin' },
    adc: { title: 'TIRATEUR ADC', desc: 'Dégâts Physiques Continus' },
    support: { title: 'SUPPORT', desc: 'Contrôle, Vision & Peel' },
    coach: { title: 'ENTRAÎNEUR', desc: 'Cerveau de la Draft' },
    reserve: { title: 'RÉSERVE', desc: 'Remplaçant' },
  },
  de: {
    top: { title: 'TOP LANE', desc: 'Solider Duellant & Tank' },
    jungle: { title: 'JUNGLE', desc: 'Roamer & Objektivkontrolle' },
    mid: { title: 'MID LANE', desc: 'Burst-Magier oder Assassine' },
    adc: { title: 'ADC CARRY', desc: 'Physischer Dauerschaden' },
    support: { title: 'SUPPORT', desc: 'Vision & Team-Nutzen' },
    coach: { title: 'HEAD COACH', desc: 'Draft-Gehirn & Taktiker' },
    reserve: { title: 'RESERVE', desc: 'Ersatzspieler' },
  },
  it: {
    top: { title: 'CORSIA SUPERIORE', desc: 'Duellante Solido & Tank' },
    jungle: { title: 'GIUNGLA', desc: 'Controllo Obiettivi' },
    mid: { title: 'CORSIA CENTRALE', desc: 'Mago Burst o Assassino' },
    adc: { title: 'TIRATORE ADC', desc: 'Danno Fisico Continuo' },
    support: { title: 'SUPPORTO', desc: 'Visione e Supporto' },
    coach: { title: 'ALLENATORE', desc: 'Mente dei Draft' },
    reserve: { title: 'RISERVA', desc: 'Sostituto' },
  },
  pt: {
    top: { title: 'CARRIL TOPO', desc: 'Duelista Sólido e Tanque' },
    jungle: { title: 'SELVA', desc: 'Controlo de Objetivos' },
    mid: { title: 'CARRIL CENTRAL', desc: 'Feiticeiro ou Assassino' },
    adc: { title: 'ATIRADOR ADC', desc: 'Dano Físico Contínuo' },
    support: { title: 'SUPORTE', desc: 'Proteção, Visão e Ajuda' },
    coach: { title: 'TREINADOR', desc: 'Estrategista de Draft' },
    reserve: { title: 'RESERVA', desc: 'Suporte de Reserva' },
  },
  ru: {
    top: { title: 'ВЕРХНЯЯ ЛИНИЯ', desc: 'Крепкий дуэлянт и танк' },
    jungle: { title: 'ЛЕС', desc: 'Роуминг и контроль объектов' },
    mid: { title: 'СРЕДНЯЯ ЛИНИЯ', desc: 'Взрывной маг или ассасин' },
    adc: { title: 'СТРЕЛОК ADC', desc: 'Постоянный физический урон' },
    support: { title: 'ПОДДЕРЖКА', desc: 'Обзор, защита и утилити' },
    coach: { title: 'ГЛАВНЫЙ ТРЕНЕР', desc: 'Мозг драфта и тактики' },
    reserve: { title: 'РЕЗЕРВ', desc: 'Запасной игрок' },
  },
  ko: {
    top: { title: '탑 라이너', desc: '단단한 대인 전사 및 탱커' },
    jungle: { title: '정글러', desc: '맵 장악 및 오브젝트 주도권' },
    mid: { title: '미드 라이너', desc: '핵심 메이지 또는 암살자' },
    adc: { title: '원거리 딜러', desc: '원거리 지속 물리 공격수' },
    support: { title: '서포터', desc: '아군 보좌, 시야 및 팀 유틸리티' },
    coach: { title: '감독', desc: '전술의 축, 밴픽 전략가' },
    reserve: { title: '후보', desc: '세컨드 백업 멤버' },
  },
  zh: {
    top: { title: '上路前排', desc: '带线单挑强手与坚固前排' },
    jungle: { title: '野区掌控', desc: '野区掌控者与野区主导' },
    mid: { title: '中路核心', desc: '瞬间爆发法师或致命刺客' },
    adc: { title: '射手输出', desc: '强力的物理持续远程输出' },
    support: { title: '辅助保护', desc: '视野掌控者与团队屏障' },
    coach: { title: '主教练', desc: '战队战术智囊与BP大师' },
    reserve: { title: '候补席', desc: '第二突击预备役' },
  },
};

const TERMS_TRANSLATIONS: Record<Language, { locked: string; placeHere: string; confirmPlace: string; emptyValue: string; clear: string }> = {
  es: { locked: 'BLOQUEADO', placeHere: 'Colocar aquí', confirmPlace: 'Confirmar asignación', emptyValue: 'Vacío', clear: 'Liberar' },
  en: { locked: 'LOCKED', placeHere: 'Assign Here', confirmPlace: 'Confirm assignment', emptyValue: 'Vacant', clear: 'Release' },
  fr: { locked: 'VERROUILLÉ', placeHere: 'Placer ici', confirmPlace: 'Confirmer la place', emptyValue: 'Vide', clear: 'Libérer' },
  de: { locked: 'GESPERRT', placeHere: 'Hier platzieren', confirmPlace: 'Zuweisung bestätigen', emptyValue: 'Leer', clear: 'Freigeben' },
  it: { locked: 'BLOCCATO', placeHere: 'Colloca qui', confirmPlace: 'Conferma ruolo', emptyValue: 'Vuoto', clear: 'Rilascia' },
  pt: { locked: 'BLOQUEADO', placeHere: 'Colocar aqui', confirmPlace: 'Confirmar vaga', emptyValue: 'Vazio', clear: 'Liberar' },
  ru: { locked: 'ЗАБЛОКИРОВАНО', placeHere: 'Поставить сюда', confirmPlace: 'Подтвердить ячейку', emptyValue: 'Пусто', clear: 'Сброс' },
  ko: { locked: '고정 완료', placeHere: '포지션 배치', confirmPlace: '배치 확인', emptyValue: '공석', clear: '해제' },
  zh: { locked: '首发锁定', placeHere: '放入此位置', confirmPlace: '确认上阵', emptyValue: '空缺', clear: '重置位置' }
};

export default function SlotCard({
  role,
  slot,
  lang = 'es',
  isSelectableToPlace = false,
  onClear,
  onPlace,
  highlighted = false,
}: SlotCardProps) {
  
  const getRoleIcon = (roleStr: Role) => {
    switch (roleStr) {
      case 'top':
        return <Shield className="w-5 h-5 text-[#c8aa6e]" />;
      case 'jungle':
        return <Swords className="w-5 h-5 text-emerald-500" />;
      case 'mid':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'adc':
        return <Crosshair className="w-5 h-5 text-red-400" />;
      case 'support':
        return <Star className="w-5 h-5 text-cyan-400" />;
      case 'coach':
        return <Brain className="w-5 h-5 text-indigo-400" />;
      default:
        return <HelpCircle className="w-5 h-5 text-[#a09b8c]" />;
    }
  };

  const getRoleBorder = (roleStr: Role) => {
    switch (roleStr) {
      case 'top': return 'border-[#c8aa6e]/30 shadow-yellow-900/15';
      case 'jungle': return 'border-emerald-500/30 shadow-emerald-500/15';
      case 'mid': return 'border-purple-500/30 shadow-purple-500/15';
      case 'adc': return 'border-red-500/30 shadow-red-500/15';
      case 'support': return 'border-cyan-500/30 shadow-cyan-500/15';
      case 'coach': return 'border-indigo-500/30 shadow-indigo-500/15';
      default: return 'border-slate-500/10 shadow-none';
    }
  };

  const activeTrans = ROLE_TRANSLATIONS[lang] || ROLE_TRANSLATIONS['es'];
  const transTerms = TERMS_TRANSLATIONS[lang] || TERMS_TRANSLATIONS['es'];
  
  const info = activeTrans[role] || { title: role.toUpperCase(), desc: 'Posición' };
  const icon = getRoleIcon(role);
  const borderAndGlow = getRoleBorder(role);
  const isFilled = slot.player !== null;

  const renderContent = () => {
    if (isFilled && slot.player) {
      const player = slot.player;
      const ratingTier = player.rating >= 88 
        ? 'border-2 border-[#c8aa6e] bg-[#c8aa6e]/10 shadow-[0_0_15px_rgba(200,170,110,0.15)]' 
        : player.rating >= 80 
        ? 'border-2 border-[#00c8c8] bg-[#00c8c8]/10' 
        : 'border border-[#c8aa6e]/20 bg-[#1e2328]/40';
        
      return (
        <div
          id={`slot-${role}-filled`}
          className={`relative flex items-center justify-between p-3.5 rounded-xl ${ratingTier} transition-all duration-300 hover:border-[#c8aa6e]/60 group pr-16 min-h-[92px]`}
        >
          <div className="flex items-center gap-3 mr-2 min-w-0">
            {/* Big Circular Rating */}
            <div className={`w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center font-extrabold text-lg shadow-inner ${
              player.rating >= 88 ? 'text-[#c8aa6e] bg-[#091428]/85 border border-[#c8aa6e]/40' : player.rating >= 80 ? 'text-[#00c8c8] bg-[#091428]' : 'text-[#f0e6d2] bg-[#010a13] border border-[#c8aa6e]/15'
            }`}>
              <span>{player.rating}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-display min-w-0">
                {icon}
                <span className="font-extrabold text-[#f0e6d2] uppercase tracking-tight text-sm truncate">
                  {player.name}
                </span>
              </div>
              
              <div className="mt-1 space-y-1 text-[11px] leading-tight">
                {/* Line 1: Posición del rol debajo del nombre */}
                <div className="text-[9px] text-[#c8aa6e]/90 font-black bg-[#c8aa6e]/10 px-2 py-0.5 rounded-full inline-block tracking-widest leading-none">
                  {info.title}
                </div>

                {/* Line 2: El equipo */}
                <div className="flex items-center gap-1 font-semibold text-[#f0e6d2]/85">
                  <span className="text-xs">🏢</span>
                  <span className="truncate">{slot.fromTeam?.name} ({slot.fromTeam?.year})</span>
                </div>

                {/* Line 3: La región */}
                <div className="flex items-center gap-1 font-bold text-[#c8aa6e]">
                  <span className="text-[10px]">🌍</span>
                  <span className="uppercase tracking-wider text-[10px]">{slot.fromTeam?.region}</span>
                </div>

                {/* Line 4: El campeón en caso de los jugadores o su habilidad en caso del entrenador */}
                {player.signatureChampion && (
                  <div className="text-amber-400 font-extrabold flex items-center gap-1 text-[10px] mt-0.5">
                    <span>{role === 'coach' ? '🧠' : '👑'}</span>
                    <span className="tracking-wide uppercase">{player.signatureChampion}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Locked status absolute overlay in the upper right corner to prevent any overflow */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
            {onClear ? (
              <button
                onClick={onClear}
                className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-red-900/80 hover:bg-red-700 text-white font-bold text-[9px] px-2 py-0.5 rounded cursor-pointer tracking-wider"
              >
                {transTerms.clear}
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[9px] bg-[#010a13] border border-[#c8aa6e]/30 text-[#c8aa6e] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-md">
                <span>🔒</span>
                <span>{transTerms.locked}</span>
              </span>
            )}
          </div>
        </div>
      );
    }

    if (isSelectableToPlace) {
      return (
        <button
          id={`slot-${role}-place-btn`}
          onClick={onPlace}
          className={`w-full relative flex items-center justify-between p-3.5 rounded-xl border-2 border-dashed border-[#c8aa6e] bg-[#c8aa6e]/10 hover:bg-[#c8aa6e]/25 shadow-[0_0_12px_rgba(200,170,110,0.2)] cursor-pointer text-left transition-all duration-300 animate-pulse`}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#c8aa6e]/20 border border-[#c8aa6e]/40 rounded-xl flex items-center justify-center animate-bounce">
              <PlusCircle className="w-5 h-5 text-[#c8aa6e]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-[#c8aa6e] uppercase tracking-tight text-sm font-display">
                {icon}
                <span>{transTerms.placeHere}</span>
              </div>
              <p className="text-[11px] text-[#f0e6d2]/80 font-medium mt-0.5">
                {transTerms.confirmPlace} {info.title}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#c8aa6e] bg-[#091428]/95 border border-[#c8aa6e]/30 px-2.5 py-1 rounded uppercase">
            OK
          </span>
        </button>
      );
    }

    return (
      <div
        id={`slot-${role}-empty`}
        className={`relative flex items-center justify-between p-3.5 rounded-xl border ${borderAndGlow} bg-[#010a13]/40 opacity-70 transition-all duration-300 ${
          highlighted ? 'border-[#c8aa6e]/60 bg-[#c8aa6e]/5 ring-2 ring-[#c8aa6e]/30 opacity-100 scale-[1.01]' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#091428]/80 border border-[#c8aa6e]/10 rounded-xl flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h4 className="font-extrabold text-[#a09b8c] uppercase tracking-tight text-sm font-display">
              {info.title}
            </h4>
            <p className="text-[11px] text-[#a09b8c]/70 font-medium mt-0.5">
              {info.desc}
            </p>
          </div>
        </div>
        <div className="text-[10px] font-bold text-[#a09b8c]/50 border border-[#c8aa6e]/10 bg-[#010a13]/80 px-2.5 py-1 rounded uppercase tracking-wider">
          {transTerms.emptyValue}
        </div>
      </div>
    );
  };

  return (
    <div id={`slot-card-container-${role}`} className="transition-all duration-300">
      {renderContent()}
    </div>
  );
}
