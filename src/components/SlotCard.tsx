import React from 'react';
import { SelectedSlot, Role } from '../types';
import { Sparkles, Crosshair, Brain, HelpCircle, PlusCircle } from 'lucide-react';
import { Language } from '../locales';

interface SlotCardProps {
  role: Role;
  slot: SelectedSlot;
  lang?: Language;
  isSelectableToPlace?: boolean;
  onClear?: () => void;
  onPlace?: () => void;
  highlighted?: boolean;
}

function JungleBushIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 17.5c.7-3.2 2.8-5.2 5.3-5.2.7-2.9 2.7-4.7 5.1-4.7 2.9 0 5 2.5 5.2 6.1 1.3.5 2.1 1.7 2.1 3.1 0 2.1-1.7 3.7-4 3.7H7.5c-2.2 0-3.8-1.2-3.5-3z"
        fill="currentColor"
        opacity="0.28"
      />
      <path
        d="M6.4 16.8c.8-2.1 2.3-3.2 4.1-3.1.5-2.2 1.9-3.6 3.7-3.6 2.1 0 3.6 1.9 3.7 4.5 1.1.3 1.8 1.1 1.8 2.2 0 1.3-1 2.2-2.5 2.2H8.5c-1.5 0-2.5-.8-2.1-2.2z"
        fill="currentColor"
      />
      <path
        d="M9.2 13.8c-.8-1.7-.7-3.5.2-5.1M13.3 10.8c-.4-2 .1-3.7 1.5-5M16.8 14.1c.4-1.8 1.5-3 3.2-3.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

const ROLE_TEXT: Record<Language, Partial<Record<Role, { title: string; desc: string }>>> = {
  es: {
    top: { title: 'LÍNEA SUPERIOR', desc: 'Duelista, presión lateral y frontline' },
    jungle: { title: 'JUNGLA', desc: 'Control del mapa y objetivos' },
    mid: { title: 'CARRIL CENTRAL', desc: 'Mago explosivo o asesino' },
    adc: { title: 'TIRADOR ADC', desc: 'Daño de ataque continuo' },
    support: { title: 'SOPORTE', desc: 'Protección, visión y utilidad' },
    coach: { title: 'ENTRENADOR', desc: 'Cerebro y estratega de drafts' },
  },
  en: {
    top: { title: 'TOP LANE', desc: 'Duelist, side pressure and frontline' },
    jungle: { title: 'JUNGLE', desc: 'Map control and objectives' },
    mid: { title: 'MID LANE', desc: 'Burst mage or assassin' },
    adc: { title: 'ADC CARRY', desc: 'Consistent physical damage' },
    support: { title: 'SUPPORT', desc: 'Peel, vision and utility' },
    coach: { title: 'HEAD COACH', desc: 'Draft brain and strategy' },
  },
  fr: {
    top: { title: 'TOP LANE', desc: 'Dueliste, pression latérale et frontline' },
    jungle: { title: 'JUNGLE', desc: 'Contrôle de carte et objectifs' },
    mid: { title: 'MID LANE', desc: 'Mage à burst ou assassin' },
    adc: { title: 'TIRATEUR ADC', desc: 'Dégâts physiques continus' },
    support: { title: 'SUPPORT', desc: 'Protection, vision et utilité' },
    coach: { title: 'ENTRAÎNEUR', desc: 'Cerveau de la draft' },
  },
  de: {
    top: { title: 'TOP LANE', desc: 'Duellant, Seitendruck und Frontline' },
    jungle: { title: 'JUNGLE', desc: 'Map-Kontrolle und Objectives' },
    mid: { title: 'MID LANE', desc: 'Burst-Magier oder Assassine' },
    adc: { title: 'ADC CARRY', desc: 'Physischer Dauerschaden' },
    support: { title: 'SUPPORT', desc: 'Schutz, Vision und Nutzen' },
    coach: { title: 'HEAD COACH', desc: 'Draft-Gehirn und Strategie' },
  },
  it: {
    top: { title: 'CORSIA SUPERIORE', desc: 'Duellante, pressione laterale e frontline' },
    jungle: { title: 'GIUNGLA', desc: 'Controllo mappa e obiettivi' },
    mid: { title: 'CORSIA CENTRALE', desc: 'Mago burst o assassino' },
    adc: { title: 'TIRATORE ADC', desc: 'Danno fisico continuo' },
    support: { title: 'SUPPORTO', desc: 'Protezione, visione e utilità' },
    coach: { title: 'ALLENATORE', desc: 'Mente dei draft' },
  },
  pt: {
    top: { title: 'ROTA SUPERIOR', desc: 'Duelista, pressão lateral e frontline' },
    jungle: { title: 'SELVA', desc: 'Controlo de mapa e objetivos' },
    mid: { title: 'ROTA CENTRAL', desc: 'Mago burst ou assassino' },
    adc: { title: 'ATIRADOR ADC', desc: 'Dano físico contínuo' },
    support: { title: 'SUPORTE', desc: 'Proteção, visão e utilidade' },
    coach: { title: 'TREINADOR', desc: 'Estrategista de draft' },
  },
  ru: {
    top: { title: 'ВЕРХНЯЯ ЛИНИЯ', desc: 'Дуэлянт, давление и frontline' },
    jungle: { title: 'ЛЕС', desc: 'Контроль карты и объектов' },
    mid: { title: 'СРЕДНЯЯ ЛИНИЯ', desc: 'Бёрст-маг или ассасин' },
    adc: { title: 'СТРЕЛОК ADC', desc: 'Постоянный физический урон' },
    support: { title: 'ПОДДЕРЖКА', desc: 'Защита, обзор и утилити' },
    coach: { title: 'ГЛАВНЫЙ ТРЕНЕР', desc: 'Стратегия и драфт' },
  },
  ko: {
    top: { title: '탑 라이너', desc: '사이드 압박과 전방 라인' },
    jungle: { title: '정글러', desc: '맵 장악과 오브젝트 운영' },
    mid: { title: '미드 라이너', desc: '폭딜 메이지 또는 암살자' },
    adc: { title: '원거리 딜러', desc: '지속 물리 딜러' },
    support: { title: '서포터', desc: '보호, 시야와 유틸리티' },
    coach: { title: '감독', desc: '밴픽과 전략의 중심' },
  },
  zh: {
    top: { title: '上路', desc: '单带、前排与边线压力' },
    jungle: { title: '打野', desc: '地图控制与资源节奏' },
    mid: { title: '中路', desc: '爆发法师或刺客' },
    adc: { title: '射手 ADC', desc: '持续物理输出' },
    support: { title: '辅助', desc: '保护、视野与团队功能' },
    coach: { title: '主教练', desc: '战术与BP核心' },
  },
};

const SLOT_TEXT: Record<Language, { locked: string; placeHere: string; confirmPlace: string; emptyValue: string; clear: string }> = {
  es: { locked: 'BLOQUEADO', placeHere: 'Colocar aquí', confirmPlace: 'Confirmar asignación', emptyValue: 'Vacío', clear: 'Liberar' },
  en: { locked: 'LOCKED', placeHere: 'Assign Here', confirmPlace: 'Confirm assignment', emptyValue: 'Vacant', clear: 'Release' },
  fr: { locked: 'VERROUILLÉ', placeHere: 'Placer ici', confirmPlace: 'Confirmer la place', emptyValue: 'Vide', clear: 'Libérer' },
  de: { locked: 'GESPERRT', placeHere: 'Hier platzieren', confirmPlace: 'Zuweisung bestätigen', emptyValue: 'Leer', clear: 'Freigeben' },
  it: { locked: 'BLOCCATO', placeHere: 'Colloca qui', confirmPlace: 'Conferma ruolo', emptyValue: 'Vuoto', clear: 'Rilascia' },
  pt: { locked: 'BLOQUEADO', placeHere: 'Colocar aqui', confirmPlace: 'Confirmar vaga', emptyValue: 'Vazio', clear: 'Liberar' },
  ru: { locked: 'ЗАБЛОКИРОВАНО', placeHere: 'Поставить сюда', confirmPlace: 'Подтвердить ячейку', emptyValue: 'Пусто', clear: 'Сброс' },
  ko: { locked: '고정 완료', placeHere: '포지션 배치', confirmPlace: '배치 확인', emptyValue: '공석', clear: '해제' },
  zh: { locked: '首发锁定', placeHere: '放入此位置', confirmPlace: '确认上阵', emptyValue: '空缺', clear: '重置位置' },
};

function getRoleIcon(role: Role, sizeClass = 'w-5 h-5') {
  switch (role) {
    case 'top':
      return <span className="text-[18px] leading-none text-[#c8aa6e]">⚔️</span>;
    case 'jungle':
      return <JungleBushIcon className={`${sizeClass} text-emerald-400`} />;
    case 'mid':
      return <Sparkles className={`${sizeClass} text-purple-400`} />;
    case 'adc':
      return <Crosshair className={`${sizeClass} text-red-400`} />;
    case 'support':
      return <span className="text-[18px] leading-none text-cyan-400">🛡️</span>;
    case 'coach':
      return <Brain className={`${sizeClass} text-indigo-400`} />;
    default:
      return <HelpCircle className={`${sizeClass} text-[#a09b8c]`} />;
  }
}

function getRoleBorder(role: Role) {
  switch (role) {
    case 'top': return 'border-[#c8aa6e]/30 shadow-yellow-900/15';
    case 'jungle': return 'border-emerald-500/30 shadow-emerald-500/15';
    case 'mid': return 'border-purple-500/30 shadow-purple-500/15';
    case 'adc': return 'border-red-500/30 shadow-red-500/15';
    case 'support': return 'border-cyan-500/30 shadow-cyan-500/15';
    case 'coach': return 'border-indigo-500/30 shadow-indigo-500/15';
    default: return 'border-slate-500/10 shadow-none';
  }
}

export default function SlotCard({
  role,
  slot,
  lang = 'es',
  isSelectableToPlace = false,
  onClear,
  onPlace,
  highlighted = false,
}: SlotCardProps) {
  const roleText = ROLE_TEXT[lang]?.[role] || ROLE_TEXT.es[role] || { title: role.toUpperCase(), desc: 'Position' };
  const text = SLOT_TEXT[lang] || SLOT_TEXT.es;
  const icon = getRoleIcon(role);
  const border = getRoleBorder(role);
  const hasPlayer = slot.player !== null;

  if (hasPlayer && slot.player) {
    const player = slot.player;
    const ratingStyle =
      player.rating >= 88
        ? 'text-[#c8aa6e] bg-[#091428]/85 border border-[#c8aa6e]/40'
        : player.rating >= 80
          ? 'text-[#00c8c8] bg-[#091428]'
          : 'text-[#f0e6d2] bg-[#010a13] border border-[#c8aa6e]/15';

    const cardStyle =
      player.rating >= 88
        ? 'border-2 border-[#c8aa6e] bg-[#c8aa6e]/10 shadow-[0_0_15px_rgba(200,170,110,0.15)]'
        : player.rating >= 80
          ? 'border-2 border-[#00c8c8] bg-[#00c8c8]/10'
          : 'border border-[#c8aa6e]/20 bg-[#1e2328]/40';

    return (
      <div id={`slot-card-container-${role}`} className="transition-all duration-300">
        <div
          id={`slot-${role}-filled`}
          className={`relative flex items-center justify-between p-3.5 rounded-xl ${cardStyle} transition-all duration-300 hover:border-[#c8aa6e]/60 group pr-16 min-h-[92px]`}
        >
          <div className="flex items-center gap-3 mr-2 min-w-0">
            <div className={`w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center font-extrabold text-lg shadow-inner ${ratingStyle}`}>
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
                <div className="text-[9px] text-[#c8aa6e]/90 font-black bg-[#c8aa6e]/10 px-2 py-0.5 rounded-full inline-block tracking-widest leading-none">
                  {roleText.title}
                </div>

                <div className="flex items-center gap-1 font-semibold text-[#f0e6d2]/85">
                  <span className="text-xs">🏢</span>
                  <span className="truncate">{slot.fromTeam?.name} ({slot.fromTeam?.year})</span>
                </div>

                <div className="flex items-center gap-1 font-bold text-[#c8aa6e]">
                  <span className="text-[10px]">🌍</span>
                  <span className="uppercase tracking-wider text-[10px]">{slot.fromTeam?.region}</span>
                </div>

                {player.signatureChampion && (
                  <div className="text-amber-400 font-extrabold flex items-center gap-1 text-[10px] mt-0.5">
                    <span>{role === 'coach' ? '🧠' : '👑'}</span>
                    <span className="tracking-wide uppercase">{player.signatureChampion}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-red-900/80 hover:bg-red-700 text-white font-bold text-[9px] px-2 py-0.5 rounded cursor-pointer tracking-wider"
              >
                {text.clear}
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[9px] bg-[#010a13] border border-[#c8aa6e]/30 text-[#c8aa6e] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-md">
                <span>🔒</span>
                <span>{text.locked}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isSelectableToPlace) {
    return (
      <div id={`slot-card-container-${role}`} className="transition-all duration-300">
        <button
          id={`slot-${role}-place-btn`}
          type="button"
          onClick={onPlace}
          className="w-full relative flex items-center justify-between p-3.5 rounded-xl border-2 border-dashed border-[#c8aa6e] bg-[#c8aa6e]/10 hover:bg-[#c8aa6e]/25 shadow-[0_0_12px_rgba(200,170,110,0.2)] cursor-pointer text-left transition-all duration-300 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#c8aa6e]/20 border border-[#c8aa6e]/40 rounded-xl flex items-center justify-center animate-bounce">
              <PlusCircle className="w-5 h-5 text-[#c8aa6e]" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 font-bold text-[#c8aa6e] uppercase tracking-tight text-sm font-display">
                {icon}
                <span>{text.placeHere}</span>
              </div>
              <p className="text-[11px] text-[#f0e6d2]/80 font-medium mt-0.5">
                {text.confirmPlace} {roleText.title}
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#c8aa6e] bg-[#091428]/95 border border-[#c8aa6e]/30 px-2.5 py-1 rounded uppercase">
            OK
          </span>
        </button>
      </div>
    );
  }

  return (
    <div id={`slot-card-container-${role}`} className="transition-all duration-300">
      <div
        id={`slot-${role}-empty`}
        className={`relative flex items-center justify-between p-3.5 rounded-xl border ${border} bg-[#010a13]/40 opacity-70 transition-all duration-300 ${
          highlighted ? 'border-[#c8aa6e]/60 bg-[#c8aa6e]/5 ring-2 ring-[#c8aa6e]/30 opacity-100 scale-[1.01]' : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 bg-[#091428]/80 border border-[#c8aa6e]/10 rounded-xl flex items-center justify-center shrink-0">
            {icon}
          </div>

          <div className="min-w-0">
            <h4 className="font-extrabold text-[#a09b8c] uppercase tracking-tight text-sm font-display truncate">
              {roleText.title}
            </h4>
            <p className="text-[11px] text-[#a09b8c]/70 font-medium mt-0.5 truncate">
              {roleText.desc}
            </p>
          </div>
        </div>

        <div className="text-[10px] font-bold text-[#a09b8c]/50 border border-[#c8aa6e]/10 bg-[#010a13]/80 px-2.5 py-1 rounded uppercase tracking-wider shrink-0">
          {text.emptyValue}
        </div>
      </div>
    </div>
  );
}
