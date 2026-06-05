import React, { useState } from 'react';
import { SelectedSlot, TeamDraft, HistoricalTeam, Player, Role, Region } from './types';
import { LEAGUE_TEAMS } from './data/lolTeams';
import PlayerCard from './components/PlayerCard';
import SlotCard from './components/SlotCard';
import RouletteWheel from './components/RouletteWheel';
import MatchSimulatorView from './components/MatchSimulatorView';
import ShareWidget from './components/ShareWidget';
import Leaderboard from './components/Leaderboard';
import { Language, LANGUAGES, TRANSLATIONS, getLocalizedRoundName, getLocalizedShortRoundName } from './locales';
import { Trophy, RefreshCw, Star, Swords, Zap, Flame, Sparkles, ChevronRight, Check, Info } from 'lucide-react';
import { playDraftLock } from './utils/audio';

const INITIAL_DRAFT: TeamDraft = {
  top: { player: null, fromTeam: null },
  jungle: { player: null, fromTeam: null },
  mid: { player: null, fromTeam: null },
  adc: { player: null, fromTeam: null },
  support: { player: null, fromTeam: null },
  coach: { player: null, fromTeam: null },
};

interface MatchHistoryItem {
  roundIndex: number;
  roundName: string;
  opponentName: string;
  opponentYear: number;
  opponentRegion: string;
  result: 'W' | 'L';
}

export default function App() {
  const [phase, setPhase] = useState<'start' | 'draft' | 'tournament' | 'gameover' | 'victory'>('start');
  const [draft, setDraft] = useState<TeamDraft>(INITIAL_DRAFT);
  const [currentActiveTeam, setCurrentActiveTeam] = useState<HistoricalTeam | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Player | null>(null);
  const [hoveredCandidate, setHoveredCandidate] = useState<Player | null>(null);
  
  // Custom language switcher state
  const [language, setLanguage] = useState<Language>('es');
  // Custom game mode state ('normal' or 'lecHard' (LEC to World Champion))
  const [gameMode, setGameMode] = useState<'normal' | 'lecHard'>('normal');

  const [tournamentRound, setTournamentRound] = useState(0); // 0 to 5 for 6 rounds
  const [hasDoubleRoll, setHasDoubleRoll] = useState(2); // Provide 2 emergency re-rolls for bad layout matching
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);
  const [totalKills, setTotalKills] = useState(0);
  const [totalDeaths, setTotalDeaths] = useState(0);
  const [mobileDraftTab, setMobileDraftTab] = useState<'spin' | 'squad'>('spin');
  const [showSynergyGuide, setShowSynergyGuide] = useState(false);

  const activeTrans = TRANSLATIONS[language] || TRANSLATIONS['es'];

  // Calculate statistics & synergies (matching only Top, Jungle, Mid, ADC, Support and Coach)
  const getSynergiesAndScore = () => {
    const slots = Object.values(draft) as SelectedSlot[];
    const activeMembers = slots.filter(s => s.player !== null);
    
    if (activeMembers.length === 0) {
      return { score: 0, regionBonus: 0, teamBonus: 0, yearBonus: 0, champBonus: 0, coachBonus: 0, activeSynergies: [], total: 0 };
    }

    // Players elements
    const playersOnly = slots.filter(s => s.player !== null && s.player.role !== 'coach');
    const coachOnly = draft.coach.player;

    // 1. Base Score calculation
    let playersSum = 0;
    playersOnly.forEach(p => {
      playersSum += p.player?.rating || 0;
    });
    
    // Average or weighted rating of selected players only
    const baseAvg = playersOnly.length > 0 ? (playersSum / playersOnly.length) : 70;
    
    // Coach factor: add up points based on coach rating
    let coachInfluence = 0;
    if (coachOnly) {
      coachInfluence = (coachOnly.rating - 70) * 0.15; // e.g. 90 coach adds 3.0 points
    }

    // 2. Synergy mechanics
    let regionBonus = 0;
    let teamBonus = 0;
    let yearBonus = 0;
    let champBonus = 0;
    let coachBonus = 0;
    const activeSynergies: string[] = [];

    const regionsList = playersOnly.map(p => p.fromTeam?.region).filter(Boolean) as Region[];
    const franchiseList = playersOnly.map(p => {
      const name = p.fromTeam?.name || '';
      return name.includes('SK Telecom') || name.includes('T1') ? 'T1' : name;
    }).filter(Boolean);
    const yearFranchiseKeys = playersOnly.map(p => `${p.fromTeam?.name}-${p.fromTeam?.year}`).filter(Boolean);

    // Context counters
    const regCounts: Record<string, number> = {};
    regionsList.forEach(r => regCounts[r] = (regCounts[r] || 0) + 1);
    
    const franchiseCounts: Record<string, number> = {};
    franchiseList.forEach(f => franchiseCounts[f] = (franchiseCounts[f] || 0) + 1);

    const yearFrCounts: Record<string, number> = {};
    yearFranchiseKeys.forEach(k => yearFrCounts[k] = (yearFrCounts[k] || 0) + 1);

    // Apply Region Bonuses
    Object.entries(regCounts).forEach(([region, count]) => {
      if (count >= 5) {
        regionBonus = Math.max(regionBonus, 6.5);
        activeSynergies.push(`${region} Region (${count})`);
      }
      else if (count >= 3) {
        regionBonus = Math.max(regionBonus, 2.5);
        activeSynergies.push(`${region} Region (${count})`);
      }
    });

    // Apply Franchise/Team Bonuses
    Object.entries(franchiseCounts).forEach(([franchise, count]) => {
      let b = 0;
      if (count >= 4) b = 8;
      else if (count >= 3) b = 5;
      else if (count >= 2) b = 2.5;
      
      if (b > 0) {
        teamBonus = Math.max(teamBonus, b);
        activeSynergies.push(`${franchise} Franchise (${count})`);
      }
    });

    // Apply Year & Team matched (Perfect Chemistry)
    Object.entries(yearFrCounts).forEach(([yearFranchise, count]) => {
      let b = 0;
      if (count >= 5) b = 10;
      else if (count >= 4) b = 8;
      else if (count >= 3) b = 5;
      else if (count >= 2) b = 2.5;
      
      if (b > 0) {
        yearBonus = Math.max(yearBonus, b);
        activeSynergies.push(`Perfect Chemistry: ${yearFranchise} (${count})`);
      }
    });

    // Champion Synergies
    const champions = playersOnly.map(p => p.player?.signatureChampion).filter(Boolean) as string[];
    
    const champGroups = {
      'Knockup Bros': ['Yasuo', 'Gragas', 'Lee Sin', 'Alistar', 'Rakan', 'Janna', 'Nautilus', 'Wukong', 'Ornn', 'Jarvan IV', 'Sion', 'Xin Zhao', 'Malphite'],
      'Freljord Forces': ['Ashe', 'Sejuani', 'Braum', 'Ornn', 'Olaf', 'Lissandra', 'Trundle', 'Anivia'],
      'Ionia Strike': ['Lee Sin', 'Yasuo', 'Irelia', 'Shen', 'Akali', 'Ahri', 'Karma', 'Xayah', 'Rakan', 'Zed', 'Kennen', 'Syndra'],
      'Void Terror': ['Kha\'Zix', 'Kog\'Maw', 'Rek\'Sai', 'Cho\'Gath', 'Bel\'Veth', 'Kai\'Sa', 'Malzahar', 'Kassadin'],
      'Tech & Chem': ['Jinx', 'Vi', 'Caitlyn', 'Ekko', 'Camille', 'Viktor', 'Ezreal', 'Singed', 'Renata Glasc'],
      'Shadow Isles': ['Thresh', 'Hecarim', 'Karthus', 'Kalista', 'Viego'],
      'Noxian Might': ['Draven', 'Darius', 'Swain', 'Katarina', 'Sion', 'Talon', 'LeBlanc']
    };

    if (champions.includes('Xayah') && champions.includes('Rakan')) {
      champBonus += 3;
      activeSynergies.push('Lovers Duo (Xayah/Rakan)');
    }

    Object.entries(champGroups).forEach(([groupName, groupChamps]) => {
      const matchCount = champions.filter(c => groupChamps.includes(c)).length;
      if (matchCount >= 2) {
        let b = matchCount === 2 ? 1 : matchCount === 3 ? 2.5 : 4;
        champBonus += b;
        activeSynergies.push(`${groupName} (${matchCount})`);
      }
    });

    // Coach Synergies
    if (coachOnly && coachOnly.signatureChampion) {
      const style = coachOnly.signatureChampion.toLowerCase();
      if (style.match(/draft|pizarra|brain|notebook|tactic|strateg|flex|style/)) {
         coachBonus += 2.5; 
         if (playersOnly.length >= 5) coachBonus += 1.5;
         activeSynergies.push('Tactical Draft (Coach)');
      } else if (style.match(/agresi|aggress|creat/)) {
         const agressiveChamps = ['Lee Sin', 'Elise', 'LeBlanc', 'Zed', 'Renekton', 'Draven', 'Lucian', 'Kha\'Zix', 'Nidalee', 'Pantheon', 'Jayce', 'Qiyana', 'Talon', 'Xin Zhao'];
         const aggroCount = champions.filter(c => agressiveChamps.includes(c)).length;
         if (aggroCount >= 1) {
            coachBonus += 1 + (aggroCount * 1.5);
            activeSynergies.push(`Aggressive Pacing (${aggroCount})`);
         } else {
            coachBonus += 0.5;
            activeSynergies.push('Aggressive Pacing (Coach)');
         }
      } else {
         let macroBonus = Math.min(3, (regionBonus + teamBonus) * 0.4);
         coachBonus += macroBonus > 0 ? macroBonus : 1;
         activeSynergies.push('Macro Discipline (Coach)');
      }
    }

    // Keep numbers clean
    coachBonus = Math.round(coachBonus * 10) / 10;
    champBonus = Math.floor(champBonus * 10) / 10;

    const totalSynergy = regionBonus + teamBonus + yearBonus + champBonus + coachBonus;
    
    // We base the score on the real average rating of all filled slots (out of 6 max: 5 roles + coach)
    const filledSlots = slots.filter(s => s.player !== null);
    const sumRatings = filledSlots.reduce((sum, s) => sum + (s.player?.rating || 0), 0);
    const baseAvgSix = filledSlots.length > 0 ? (sumRatings / filledSlots.length) : 70;

    // Synergy contribution: total synergy points are multiplied by 0.45 to yield a balanced OVR boost
    const synergyBoost = totalSynergy * 0.45;
    const finalScore = Math.round(baseAvgSix + synergyBoost);

    return {
      score: Math.min(99, Math.max(60, finalScore)),
      regionBonus,
      teamBonus,
      yearBonus,
      champBonus,
      coachBonus,
      activeSynergies,
      total: Math.round(totalSynergy * 10) / 10,
    };
  };

  const synergyDetails = getSynergiesAndScore();
  const currentTeamScore = synergyDetails.score;

  // Get count of drafted slots
  const getDraftedCount = () => {
    return (Object.values(draft) as SelectedSlot[]).filter(s => s.player !== null).length;
  };

  // Draft completion requires all 6 essential positions (top, jungle, mid, adc, support, coach) to be completed
  const isDraftComplete = getDraftedCount() === 6;

  // Restrict teams pool under Hard/LEC mode to only historic European rosters!
  const availableTeams = gameMode === 'lecHard'
    ? LEAGUE_TEAMS.filter(t => t.region === 'LEC' && t.id !== 'custom')
    : LEAGUE_TEAMS.filter(t => {
        if (t.id === 'custom') return false;
        if (t.region === 'LEC') return t.hasWorldsAppearance === true;
        return true;
      });

  // Handles roulette roll result
  const handleRouletteResult = (team: HistoricalTeam) => {
    setCurrentActiveTeam(team);
    setSelectedCandidate(null);
  };

  // Instantly drafts a player to their corresponding vacant slot
  const draftPlayerDirectly = (player: Player) => {
    if (!currentActiveTeam) return;
    const destRole = player.role;

    if (draft[destRole] && draft[destRole].player === null) {
      setDraft((prev) => {
        const updated = { ...prev };
        updated[destRole] = {
          player,
          fromTeam: {
            name: currentActiveTeam.name,
            year: currentActiveTeam.year,
            region: currentActiveTeam.region,
          },
        };
        return updated;
      });

      // Play the mechanical sound representing a player locking into place!
      playDraftLock();

      // Clear hovering states to avoid stuck colors
      setHoveredCandidate(null);
      setSelectedCandidate(null);
      setCurrentActiveTeam(null);
      setMobileDraftTab('squad');

      // Auto-highlights & smooth scrolls the added column role card directly so the user doesn't have to scroll!
      setTimeout(() => {
        const matchingCard = document.getElementById(`slot-card-container-${destRole}`);
        if (matchingCard) {
          matchingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          matchingCard.classList.add('animate-flash-glow');
          setTimeout(() => {
            matchingCard.classList.remove('animate-flash-glow');
          }, 1250);
        }
      }, 70);
    }
  };

  // Check valid slots for selected candidate
  const getValidsForCandidate = (player: Player | null): Role[] => {
    if (!player) return [];
    
    const valids: Role[] = [];
    const role = player.role;

    if (role === 'coach') {
      if (!draft.coach.player) valids.push('coach');
    } else {
      if (role === 'top' && !draft.top.player) valids.push('top');
      if (role === 'jungle' && !draft.jungle.player) valids.push('jungle');
      if (role === 'mid' && !draft.mid.player) valids.push('mid');
      if (role === 'adc' && !draft.adc.player) valids.push('adc');
      if (role === 'support' && !draft.support.player) valids.push('support');
    }

    return valids;
  };

  const useEmergencyReroll = () => {
    if (hasDoubleRoll > 0 && currentActiveTeam) {
      setHasDoubleRoll((prev) => prev - 1);
      setCurrentActiveTeam(null);
      setSelectedCandidate(null);
      setHoveredCandidate(null);
    }
  };

  const hasSpunValidPick = () => {
    if (!currentActiveTeam) return true;
    const roster = currentActiveTeam.roster;
    
    const candidates = [roster.top, roster.jungle, roster.mid, roster.adc, roster.support, roster.coach];
    return candidates.some(c => c && getValidsForCandidate(c).length > 0);
  };

  // Start Worlds/LEC Tournament simulation phases
  const handleStartTournament = () => {
    if (!isDraftComplete) return;
    setTournamentRound(0);
    setPhase('tournament');
  };

  // Handle Match Outcomes from Simulator View
  const handleRoundComplete = (
    success: boolean,
    opponent?: HistoricalTeam,
    performance?: { kills: number; deaths: number }
  ) => {
    const roundName = getLocalizedRoundName(tournamentRound, gameMode, language);
    
    if (performance) {
      setTotalKills(prev => prev + performance.kills);
      setTotalDeaths(prev => prev + performance.deaths);
    }

    if (opponent) {
      setMatchHistory(prev => [
        ...prev,
        {
          roundIndex: tournamentRound,
          roundName,
          opponentName: opponent.name,
          opponentYear: opponent.year,
          opponentRegion: opponent.region,
          result: success ? 'W' : 'L'
        }
      ]);
    }

    if (success) {
      if (tournamentRound === 5) {
        // Complete glorious run!
        setPhase('victory');
      } else {
        // Increment round
        setTournamentRound(prev => prev + 1);
      }
    } else {
      setPhase('gameover');
    }
  };

  // Reset entire draft or restart tournament with active squad
  const handleResetTournament = (fullReset: boolean) => {
    setMatchHistory([]);
    setTotalKills(0);
    setTotalDeaths(0);
    if (fullReset) {
      setDraft(INITIAL_DRAFT);
      setPhase('start');
      setCurrentActiveTeam(null);
      setSelectedCandidate(null);
      setHoveredCandidate(null);
      setTournamentRound(0);
      setHasDoubleRoll(2);
    } else {
      setTournamentRound(0);
      setPhase('tournament');
    }
  };

  return (
    <div id="main-viewport" className="min-h-screen bg-[#010a13] font-sans selection:bg-[#c8aa6e] selection:text-[#010a13] text-[#f0e6d2] pb-16">
      
      {/* Dynamic Background Grid Mesh */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#c8aa6e_1px,transparent_1px),linear-gradient(to_bottom,#c8aa6e_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Corporate Esports Header */}
      <header className="sticky top-0 bg-[#010a13]/85 backdrop-blur-md border-b border-[#c8aa6e]/20 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#c8aa6e] _to-[#785a28] bg-yellow-500 rounded-xl flex items-center justify-center font-black text-[#010a13] text-sm tracking-tighter shadow-[0_0_12px_rgba(200,170,110,0.25)] font-display">
              🏆
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-[#f0e6d2] uppercase font-display">{activeTrans.title}</h1>
              <span className="text-[10px] text-[#c8aa6e] font-mono font-bold tracking-wider uppercase block">{activeTrans.subtitle}</span>
            </div>
          </div>
          
          {/* Quick info badges */}
          <div className="flex items-center gap-4">
            {phase === 'draft' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#a09b8c]">{activeTrans.roster}:</span>
                <span className="text-xs font-black bg-[#091428] px-2.5 py-1 border border-[#c8aa6e]/15 rounded-lg text-[#c8aa6e]">
                  {getDraftedCount()}/6
                </span>
              </div>
            )}
            
            <div className="hidden md:flex items-center gap-1.5 text-xs text-[#a09b8c] font-bold bg-[#010a13] rounded-full py-1.5 px-3.5 border border-[#c8aa6e]/10">
              <Trophy className="w-3.5 h-3.5 text-[#c8aa6e]" />
              <span>{activeTrans.undefeatedTarget}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* ================= PHASE 1: CONFIGURATION & INTRO PANEL ================= */}
        {phase === 'start' && (
          <div id="intro-panel" className="max-w-4xl mx-auto py-8 md:py-14 space-y-10 animate-fade-in text-center">
            
            {/* Summoner Emblem icon */}
            <div className="relative inline-block">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#c8aa6e] to-[#785a28] opacity-25 blur-xl animate-pulse" />
              <div className="p-5.5 relative bg-[#091428] border-2 border-[#c8aa6e]/35 rounded-full inline-flex">
                <Trophy className="w-12 h-12 text-[#c8aa6e]" />
              </div>
            </div>

            {/* Config Box Title */}
            <div className="space-y-3">
              <h1 className="font-display font-black text-3xl md:text-5xl tracking-tight text-white uppercase leading-none">
                {activeTrans.title} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f0e6d2] via-[#c8aa6e] to-amber-500 filter drop-shadow-[0_2px_10px_rgba(200,170,110,0.2)]">
                  {activeTrans.subtitle}
                </span>
              </h1>
              <p className="text-[#a09b8c] text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
                {activeTrans.selectLangAndMode}
              </p>
            </div>

            {/* BENTO CARD SETUP ENGINE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch text-left max-w-3xl mx-auto">
              
              {/* Box 1: Select Language (9 languages grid) */}
              <div className="bg-[#091428] border border-[#c8aa6e]/20 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
                <h3 className="font-bold text-[#c8aa6e] text-xs tracking-wider uppercase border-b border-[#c8aa6e]/10 pb-2">
                  {activeTrans.chooseLanguage}
                </h3>
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {LANGUAGES.map((langItem) => {
                    // Safe guard key resolution or fallbacks
                    const item = langItem || { code: 'es', name: 'Español', flag: '🇪🇸' };
                    // Highlight selected language
                    const isSelected = language === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setLanguage(item.code)}
                        className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'bg-[#c8aa6e]/15 border-[#c8aa6e] text-white font-bold ring-1 ring-[#c8aa6e]/20'
                            : 'bg-[#010a13] border-slate-800 text-[#a09b8c] hover:bg-[#1e2328]/35 hover:text-[#f0e6d2]'
                        }`}
                      >
                        <span className="text-xl select-none" role="img" aria-label={item.name}>{item.flag}</span>
                        <span className="text-[10px] tracking-tight">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Box 2: Choose Game Mode (Normal vs. LEC Hard Mode) */}
              <div className="bg-[#091428] border border-[#c8aa6e]/20 rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <h3 className="font-bold text-[#c8aa6e] text-xs tracking-wider uppercase border-b border-[#c8aa6e]/10 pb-2">
                    {activeTrans.chooseMode}
                  </h3>

                  <div className="space-y-2.5">
                    {/* Normal Mode Button */}
                    <button
                      type="button"
                      onClick={() => setGameMode('normal')}
                      className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                        gameMode === 'normal'
                          ? 'bg-[#c8aa6e]/10 border-[#c8aa6e]/60 text-white shadow-md ring-1 ring-[#c8aa6e]/10'
                          : 'bg-[#010a13] border-slate-800/80 text-[#a09b8c]/80 hover:bg-[#1e2328]/30'
                      }`}
                    >
                      <div className="pt-0.5">
                        <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center p-0.5">
                          {gameMode === 'normal' && <span className="w-1.5 h-1.5 rounded-full bg-[#c8aa6e]" />}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{activeTrans.modeNormal}</span>
                          <span className="text-[8px] bg-slate-800 text-[#a09b8c] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">{activeTrans.diffNormal}</span>
                        </div>
                        <p className="text-[10px] text-[#a09b8c] mt-0.5 leading-relaxed">{activeTrans.modeNormalDesc}</p>
                      </div>
                    </button>

                    {/* LEC Hard Mode Button */}
                    <button
                      type="button"
                      onClick={() => setGameMode('lecHard')}
                      className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                        gameMode === 'lecHard'
                          ? 'bg-red-500/5 border-red-500/50 text-white shadow-md ring-1 ring-red-500/10'
                          : 'bg-[#010a13] border-slate-800/80 text-[#a09b8c]/80 hover:bg-[#1e2328]/30'
                      }`}
                    >
                      <div className="pt-0.5">
                        <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center p-0.5">
                          {gameMode === 'lecHard' && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-red-400">{activeTrans.modeLecHard}</span>
                          <span className="text-[8px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">{activeTrans.diffHard}</span>
                        </div>
                        <p className="text-[10px] text-[#a09b8c] mt-0.5 leading-relaxed">{activeTrans.modeLecHardDesc}</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Game rules details panel */}
            <div className="bg-[#091428]/50 p-6 rounded-2xl border border-[#c8aa6e]/15 max-w-3xl mx-auto text-left space-y-3.5">
              <h3 className="font-bold text-[#f0e6d2] text-xs tracking-wider uppercase border-b border-[#c8aa6e]/10 pb-2 font-display">
                📋 {activeTrans.rulesTitle}:
              </h3>
              <ul className="space-y-2.5 text-xs leading-relaxed text-[#a09b8c]">
                <li className="flex items-start gap-2.5">
                  <span className="text-[#c8aa6e] font-bold">1.</span>
                  <span>{activeTrans.rule1}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#c8aa6e] font-bold">2.</span>
                  <span>{activeTrans.rule2}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#c8aa6e] font-bold">3.</span>
                  <span>{activeTrans.rule3}</span>
                </li>
              </ul>
            </div>

            <div className="pt-3">
              <button
                id="btn-start-game"
                onClick={() => setPhase('draft')}
                className="inline-flex items-center gap-2 px-10 py-5 bg-[#c8aa6e] hover:brightness-115 text-[#010a13] font-black text-xs tracking-widest uppercase rounded-xl transition-all duration-300 hover:shadow-[0_0_24px_rgba(200,170,110,0.3)] hover:-translate-y-0.5 cursor-pointer font-display"
              >
                {activeTrans.ctaStart}
              </button>
            </div>
          </div>
        )}

        {/* ================= PHASE 2: DRAFTING ROOM ================= */}
        {phase === 'draft' && (
          <div id="drafting-room" className="space-y-8 animate-fade-in">
            
            {/* Top Stat Dashboard Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Squad rating OVR indicator label */}
              <div className="lg:col-span-4 bg-[#091428] border border-[#c8aa6e]/25 rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
                <div className="space-y-1">
                  <span className="text-[9px] text-[#a09b8c] font-black uppercase tracking-widest block">{activeTrans.averageRating}</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display font-black text-5.55 text-[#c8aa6e] tracking-tight leading-none">
                      {currentTeamScore}
                    </span>
                    <span className="text-xs font-bold text-[#a09b8c] uppercase tracking-tighter">/ 99 OVR</span>
                  </div>
                  <p className="text-[10px] text-[#f0e6d2]/80 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-[#c8aa6e]" />
                    {activeTrans.totalChemistry}: +{synergyDetails.total} pts
                  </p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-[#010a13] border border-[#c8aa6e]/15 flex items-center justify-center font-black text-[#a09b8c]/50 text-xs shadow-inner">
                  SQUAD
                </div>
              </div>

              {/* Chemistry Bonus Indicators Breakdown */}
              <div className="lg:col-span-8 bg-[#091428] border border-[#c8aa6e]/25 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between gap-2 mb-3 font-display">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-[#c8aa6e]" />
                    <h4 className="text-[10px] font-black text-[#f0e6d2] uppercase tracking-widest">{activeTrans.synergyB}</h4>
                  </div>
                  <button
                    id="toggle-synergy-guide-btn"
                    type="button"
                    onClick={() => setShowSynergyGuide(!showSynergyGuide)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-[#010a13]/60 border border-[#c8aa6e]/20 text-[9px] font-black tracking-wider text-[#c8aa6e] hover:text-[#f0e6d2] hover:bg-[#010a13] uppercase transition-all cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{showSynergyGuide ? (language === 'es' ? 'OCULTAR GUÍA' : 'HIDE GUIDE') : (language === 'es' ? 'VER REGLAS DE QUÍMICA' : 'VIEW CHEMISTRY RULES')}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className={`p-2.5 rounded-xl border ${synergyDetails.regionBonus > 0 ? 'bg-sky-950/25 border-sky-850/60 text-sky-400 font-medium' : 'bg-[#010a13]/40 border-[#c8aa6e]/10 text-[#a09b8c]/40'}`}>
                    <div className="text-[9px] font-bold tracking-wider font-mono uppercase">{activeTrans.regionBonus}</div>
                    <div className="text-lg font-black mt-0.5">+{synergyDetails.regionBonus}</div>
                    <p className="text-[8px] text-[#a09b8c]/65">3+ / 5+</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${synergyDetails.teamBonus > 0 ? 'bg-emerald-950/25 border-emerald-850/60 text-emerald-400 font-medium' : 'bg-[#010a13]/40 border-[#c8aa6e]/10 text-[#a09b8c]/40'}`}>
                    <div className="text-[9px] font-bold tracking-wider font-mono uppercase">{activeTrans.teamBonus}</div>
                    <div className="text-lg font-black mt-0.5">+{synergyDetails.teamBonus}</div>
                    <p className="text-[8px] text-[#a09b8c]/65">2+ / 3+ / 4+</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${synergyDetails.yearBonus > 0 ? 'bg-purple-950/25 border-purple-850/60 text-purple-400 font-semibold' : 'bg-[#010a13]/40 border-[#c8aa6e]/10 text-[#a09b8c]/40'}`}>
                    <div className="text-[9px] font-bold tracking-wider font-mono uppercase">{activeTrans.yearBonus}</div>
                    <div className="text-lg font-black mt-0.5">+{synergyDetails.yearBonus}</div>
                    <p className="text-[8px] text-[#a09b8c]/65">{activeTrans.perfectChemistry}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${(synergyDetails.champBonus ?? 0) > 0 ? 'bg-amber-950/25 border-amber-850/60 text-amber-400 font-medium' : 'bg-[#010a13]/40 border-[#c8aa6e]/10 text-[#a09b8c]/40'}`}>
                    <div className="text-[9px] font-bold tracking-wider font-mono uppercase truncate">CHAMPIONS</div>
                    <div className="text-lg font-black mt-0.5">+{synergyDetails.champBonus}</div>
                    <p className="text-[7px] text-[#a09b8c]/65 truncate" title={synergyDetails.activeSynergies?.join(', ')}>
                      {synergyDetails.activeSynergies?.filter(s => !s.includes('Coach'))[0] || 'Groups / Lore'}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${(synergyDetails.coachBonus ?? 0) > 0 ? 'bg-rose-950/25 border-rose-850/60 text-rose-400 font-medium' : 'bg-[#010a13]/40 border-[#c8aa6e]/10 text-[#a09b8c]/40'}`}>
                    <div className="text-[9px] font-bold tracking-wider font-mono uppercase truncate">COACH STYLE</div>
                    <div className="text-lg font-black mt-0.5">+{synergyDetails.coachBonus}</div>
                    <p className="text-[7px] text-[#a09b8c]/65 truncate" title={synergyDetails.activeSynergies?.join(', ')}>
                      {synergyDetails.activeSynergies?.filter(s => s.includes('Coach'))[0] || 'Draft matching'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Synergy Rules Guide */}
            {showSynergyGuide && (
              <div id="synergy-guide" className="bg-[#091428] border border-[#c8aa6e]/40 rounded-2xl p-6 shadow-2xl animate-fade-in text-xs space-y-5 text-[#f0e6d2]">
                <div className="flex items-center justify-between border-b border-[#c8aa6e]/20 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#c8aa6e]" />
                    <h5 className="font-display font-black text-xs uppercase tracking-widest text-[#f0e6d2]">
                      {language === 'es' ? 'Libro de Reglas de Química y Sinergias' : 'Chemistry & Synergy Rules Guide'}
                    </h5>
                  </div>
                  <button
                    onClick={() => setShowSynergyGuide(false)}
                    className="text-[10px] font-black text-[#a09b8c] hover:text-[#f0e6d2] uppercase tracking-wider cursor-pointer bg-transparent border-0"
                  >
                    × {language === 'es' ? 'Cerrar' : 'Close'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-sky-450">
                      <span>🌍</span>
                      <h6 className="uppercase tracking-wider font-display font-black text-[10px]">{language === 'es' ? 'Sinergia de Región' : 'Region Synergy'}</h6>
                    </div>
                    <p className="text-[#a09b8c] leading-relaxed text-[11px] whitespace-pre-line">
                      {language === 'es' 
                        ? 'Premia tener jugadores de la misma liga competitiva principal (LEC, LCK, LPL, LCS, Wildcards).\n• 3+ jugadores: +2.5 puntos OVR.\n• 5+ jugadores: +6.5 puntos OVR.'
                        : 'Rewards having players from the same major competitive league (LEC, LCK, LPL, LCS, Wildcards).\n• 3+ players: +2.5 OVR\n• 5+ players: +6.5 OVR'}
                    </p>

                    <div className="flex items-center gap-1.5 font-bold text-emerald-400 pt-1">
                      <span>🛡️</span>
                      <h6 className="uppercase tracking-wider font-display font-black text-[10px]">{language === 'es' ? 'Sinergia de Franquicia' : 'Franchise Synergy'}</h6>
                    </div>
                    <p className="text-[#a09b8c] leading-relaxed text-[11px] whitespace-pre-line">
                      {language === 'es'
                        ? 'Premia la afinidad por haber defendido el mismo escudo en una etapa de su carrera.\n• 2 jugadores: +2.0 puntos OVR.\n• 3 jugadores: +3.5 puntos OVR.\n• 4+ jugadores: +5.0 puntos OVR.'
                        : 'Affinities for having played under the same organization shield.\n• 2 players: +2.0 OVR\n• 3 players: +3.5 OVR\n• 4+ players: +5.0 OVR.'}
                    </p>
                  </div>

                  {/* Column 2 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-purple-400">
                      <span>⏳</span>
                      <h6 className="uppercase tracking-wider font-display font-black text-[10px]">{language === 'es' ? 'Química Perfecta' : 'Perfect Chemistry'}</h6>
                    </div>
                    <p className="text-[#a09b8c] leading-relaxed text-[11px] whitespace-pre-line">
                      {language === 'es'
                        ? 'Se activa si tienes jugadores que compartieron exactamente el mismo año y equipo de competición histórica (e.g. Fnatic 2018).\n• Coincidencia del año exacto: +2.5 puntos OVR.'
                        : 'Triggers if you draft players who competed together in the exact same year and team roster (e.g. Fnatic 2018).\n• Exact year matching: +2.5 OVR.'}
                    </p>

                    <div className="flex items-center gap-1.5 font-bold text-amber-400 pt-1">
                      <span>🔥</span>
                      <h6 className="uppercase tracking-wider font-display font-black text-[10px]">{language === 'es' ? 'Sinergias de Campeón' : 'Champion Synergies'}</h6>
                    </div>
                    <p className="text-[#a09b8c] leading-relaxed text-[11px] whitespace-pre-line">
                      {language === 'es'
                        ? 'Bono especial si tus jugadores tienen campeones insignia que comparten lore en League of Legends:\n• Lovers Duo: Xayah y Rakan en el Roster (+3 puntos).\n• Grupos temáticos (Freljord Forces, Noxian Might, Ionia Strike, Void Terror, Hijos del Knockup, Tech & Chem) con 2 o más integrantes: obtienen de +1.0 a +4.0 puntos extras.'
                        : 'Special bonuses based on your drafted player signature champions and their LoL lore relationships:\n• Lovers Duo: Xayah and Rakan selected together (+3 OVR).\n• Theme factions (Freljord, Noxus, Ionia, Void, Knockup, Tech) with 2+ picks: +1.0 to +4.0 OVR.'}
                    </p>
                  </div>

                  {/* Column 3 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-rose-400">
                      <span>🧠</span>
                      <h6 className="uppercase tracking-wider font-display font-black text-[10px]">{language === 'es' ? 'Estilo de Entrenador (Coach)' : 'Coach Style Synergy'}</h6>
                    </div>
                    <p className="text-[#a09b8c] leading-relaxed text-[11px] whitespace-pre-line">
                      {language === 'es'
                        ? 'El entrenador aporta bonos según su filosofía y tus elecciones:\n• Tácticos (Draft/Notebook): +2.5 base, +1.5 extra si completas el equipo.\n• Agresivos: Potencian con +1.5 por cada campeón creador de jugadas agresivas (Lee Sin, Elise, LeBlanc, Zed, etc.).\n• Disciplinados (Macro): Multiplican la sinergia de equipo existente por un 40% (máx +3).'
                        : 'The head coach impacts game plans and complements roster decisions:\n• Tactical (Draft/Notebook): +2.5 base, +1.5 extra with complete roster.\n• Aggressive: Boosts +1.5 for every playmaker champ drafted (Lee Sin, Elise, LeBlanc, Zed, etc.).\n• Macro discipline: Upgrades existing team synergy by 40% (max +3).'}
                    </p>

                    <div className="p-3 bg-[#010a13] border border-[#c8aa6e]/10 rounded-xl space-y-1">
                      <span className="font-bold text-[#c8aa6e] block text-[10px]">{language === 'es' ? 'Cáculo de Valoración General (OVR)' : 'Overall calculation (OVR)'}</span>
                      <p className="text-[#a09b8c] leading-normal text-[10px]">
                        {language === 'es'
                          ? 'Media real de tus 6 miembros (5 jugadores + 1 coach) suplementada por tus bonus de sinergias totales (peso de 0.45x para que tus decisiones estrategas importen).'
                          : 'Real average rating of your 6 drafted members (5 players + 1 coach) amplified with your active chemistry bonuses (normalized with a balanced 0.45x weight).'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile responsive view tabs switcher */}
            <div className="flex lg:hidden bg-[#010a13] rounded-xl p-1 border border-[#c8aa6e]/20 grid grid-cols-2 text-xs font-bold font-display">
              <button
                id="mobile-tab-spin-btn"
                type="button"
                onClick={() => setMobileDraftTab('spin')}
                className={`py-3.5 rounded-lg text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  mobileDraftTab === 'spin'
                    ? 'bg-[#c8aa6e] text-[#010a13] font-black shadow-md'
                    : 'text-[#a09b8c] hover:text-[#f0e6d2]'
                }`}
              >
                <div className="relative">
                  <span className="relative font-bold text-xs">🎡 {activeTrans.spinRuleta}</span>
                  {currentActiveTeam && (
                    <span className="absolute -top-1 -right-2.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  )}
                </div>
              </button>
              <button
                id="mobile-tab-squad-btn"
                type="button"
                onClick={() => setMobileDraftTab('squad')}
                className={`py-3.5 rounded-lg text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  mobileDraftTab === 'squad'
                    ? 'bg-[#c8aa6e] text-[#010a13] font-black shadow-md'
                    : 'text-[#a09b8c] hover:text-[#f0e6d2]'
                }`}
              >
                Mi Roster ({getDraftedCount()}/6) 🛡️
              </button>
            </div>

            {/* Main drafting splits */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Spinner roulette panel left side */}
              <div className={`lg:col-span-6 space-y-6 ${mobileDraftTab === 'spin' ? 'block' : 'hidden lg:block'}`}>
                
                <RouletteWheel
                  teams={availableTeams}
                  onResult={handleRouletteResult}
                  canSpin={currentActiveTeam === null}
                  isDraftComplete={isDraftComplete}
                  lang={language}
                />

                {/* Candidate players list display of drawn team */}
                {currentActiveTeam && (
                  <div id="spun-team-pool" className="bg-[#091428] border border-[#c8aa6e]/30 rounded-2xl p-6 shadow-xl space-y-4.5 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c8aa6e]/15 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                           <span className="text-xs bg-[#c8aa6e]/10 text-[#c8aa6e] font-bold border border-[#c8aa6e]/20 px-2.5 py-0.5 rounded">
                             {currentActiveTeam.region}
                           </span>
                           <span className="text-xs text-[#a09b8c] font-mono font-bold">{activeTrans.luckyTeam} {currentActiveTeam.year}</span>
                        </div>
                        <h3 className="text-lg font-black text-[#f0e6d2] mt-1.5 uppercase font-display">
                          {currentActiveTeam.name}
                        </h3>
                      </div>

                      {/* No valid positions remaining - Refund button */}
                      {!hasSpunValidPick() && (
                        <div className="flex flex-col items-end gap-1.5 bg-red-950/20 p-2.5 rounded border border-red-900/30 max-w-sm">
                          <span className="text-[10px] text-red-400 font-bold">⚠️ {activeTrans.spinErrorEmpty}</span>
                          {hasDoubleRoll > 0 ? (
                            <button
                              onClick={useEmergencyReroll}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:brightness-110 text-[#010a13] font-black text-[10px] rounded hover:brightness-110 uppercase cursor-pointer transition-all"
                            >
                              {activeTrans.emergencyRerolls} ({hasDoubleRoll})
                            </button>
                          ) : (
                            <span className="text-[9px] text-[#a09b8c]">No te quedan comodines de repetición. Libera un slot para avanzar de jugador.</span>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-400">
                      {activeTrans.draftDirectTooltip}
                    </p>

                    {/* Horizontal wrap list of candidate player cards */}
                    <div className="flex flex-wrap gap-4 items-center justify-center pt-2">
                      {['top', 'jungle', 'mid', 'adc', 'support', 'coach'].map((roleKey) => {
                        const player = currentActiveTeam.roster[roleKey as Role];
                        if (!player) return null;
                        
                        const canHold = getValidsForCandidate(player).length > 0;
                        const occupiedBy = draft[player.role]?.player?.name;
                        
                        return (
                          <div 
                            key={player.id} 
                            className="relative"
                            onMouseEnter={() => setHoveredCandidate(player)}
                            onMouseLeave={() => setHoveredCandidate(null)}
                          >
                            <PlayerCard
                              player={player}
                              region={currentActiveTeam.region}
                              teamName={currentActiveTeam.name}
                              year={currentActiveTeam.year}
                              onClick={() => {
                                if (canHold) {
                                  draftPlayerDirectly(player);
                                }
                              }}
                              selected={false}
                              disabled={!canHold}
                            />
                            
                            {/* Compact top-right corner block overlay that doesn't overflow or block candidate info on mobile */}
                            {!canHold && (
                              <div 
                                className="absolute top-1.5 right-1.5 z-30 pointer-events-none font-sans font-black flex items-center gap-1.5 bg-[#010a13] border border-[#c8aa6e] text-[#c8aa6e] text-[9.5px] px-2 py-1 rounded-md shadow-2xl animate-fade-in uppercase tracking-widest"
                                title={occupiedBy ? `${activeTrans.occupiedBy}: ${occupiedBy}` : ''}
                              >
                                <span>🔒</span>
                                <span>{language === 'es' ? 'BLOQ' : 'LOCK'}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Roster lineup table slots panel (Right Column) */}
              <div className={`lg:col-span-6 space-y-6 bg-[#091428]/50 border border-[#c8aa6e]/15 rounded-2xl p-6 ${mobileDraftTab === 'squad' ? 'block' : 'hidden lg:block'}`}>
                <div>
                  <h3 className="font-display font-black text-lg text-[#f0e6d2] uppercase tracking-tight">{activeTrans.currentSquadTitle}</h3>
                  <p className="text-xs text-[#a09b8c] mt-0.5">
                    {activeTrans.currentSquadSubtitle}
                  </p>
                </div>

                {/* Vertical Slots Stack */}
                <div className="space-y-3 relative">
                  {(Object.keys(draft) as Role[]).map((role) => {
                    const slot = draft[role] as SelectedSlot;
                    
                    // Matching highlights: when hovering candidate player in slot, light up the corresponding slot card dynamically!
                    const isCandidateCardHovered = hoveredCandidate && hoveredCandidate.role === role;

                    return (
                      <SlotCard
                        key={role}
                        role={role}
                        slot={slot}
                        isSelectableToPlace={false}
                        highlighted={!!isCandidateCardHovered}
                        lang={language}
                      />
                    );
                  })}
                </div>

                {isDraftComplete ? (
                  <div className="pt-4 border-t border-[#c8aa6e]/15 text-center space-y-3">
                    <div className="bg-[#c8aa6e]/10 border border-[#c8aa6e]/20 p-3 rounded-xl flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#c8aa6e] animate-pulse" />
                      <span className="text-xs text-[#c8aa6e] font-bold">
                        {gameMode === 'lecHard' ? activeTrans.worldsWaitTitle : '¡Squad listo para disputar el Mundial!'}
                      </span>
                    </div>

                    <button
                      id="draft-complete-worlds-trigger"
                      onClick={handleStartTournament}
                      className="w-full justify-center flex items-center gap-2 px-8 py-4 bg-[#c8aa6e] hover:brightness-115 text-[#010a13] font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-xl shadow-[#091428]/40 hover:-translate-y-0.5 cursor-pointer font-display"
                    >
                      <Swords className="w-4 h-4" />
                      {activeTrans['startTour Cta']}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs text-[#a09b8c]/60 italic font-mono font-medium">
                    {activeTrans.lockedRosterWarn} ({6 - getDraftedCount()} / 6)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= PHASE 3: TOURNAMENT STAGE ================= */}
        {phase === 'tournament' && (
          <div className="space-y-6">
            
            {/* Realtime bracket visual strip */}
            <div className="bg-[#091428] border border-[#c8aa6e]/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-around gap-4 text-xs font-bold shadow-lg">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const name = getLocalizedRoundName(idx, gameMode, language);
                const isActive = idx === tournamentRound;
                const isPassed = idx < tournamentRound;

                return (
                  <div key={idx} className="flex items-center gap-2 text-center">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      isActive 
                        ? 'bg-[#c8aa6e] text-[#010a13] border border-[#c8aa6e] shadow-[0_0_8px_rgba(200,170,110,0.45)]' 
                        : isPassed 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' 
                        : 'bg-[#010a13] text-[#a09b8c]/40 border border-[#c8aa6e]/10'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={isActive ? 'text-[#f0e6d2] font-semibold text-xs' : isPassed ? 'text-[#a09b8c] text-[11px]' : 'text-[#a09b8c]/40 text-[11px]'}>
                      {getLocalizedShortRoundName(idx, gameMode, language)}
                    </span>
                    {idx < 5 && <ChevronRight className="hidden md:block w-4 h-4 text-slate-750" />}
                  </div>
                );
              })}
            </div>

            <MatchSimulatorView
              draft={draft}
              opponentTeamsList={LEAGUE_TEAMS}
              currentRound={tournamentRound}
              teamScore={currentTeamScore}
              synergyDetails={synergyDetails}
              onRoundComplete={handleRoundComplete}
              onResetTournament={handleResetTournament}
              gameMode={gameMode}
              lang={language}
            />
          </div>
        )}

        {/* ================= PHASES 4 & 5: UNIFIED TOURNAMENT END / WRAP-UP SCREEN ================= */}
        {(phase === 'gameover' || phase === 'victory') && (
          <div id="tournament-end-screen" className="max-w-2xl mx-auto text-center py-12 md:py-16 space-y-8 animate-fade-in px-4">
            <div className="relative inline-block">
              {phase === 'victory' ? (
                <>
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#f0e6d2] via-[#c8aa6e] to-[#785a28] opacity-40 blur-2xl animate-pulse" />
                  <div className="p-8 relative bg-[#010a13] border-2 border-[#c8aa6e] rounded-full inline-flex text-[#c8aa6e]">
                    <Trophy className="w-16 h-16" />
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute -inset-2 rounded-full bg-red-650/30 opacity-40 blur-2xl animate-pulse" />
                  <div className="p-8 relative bg-[#010a13] border-2 border-red-500/80 rounded-full inline-flex text-red-400">
                    <Swords className="w-16 h-16" />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              {phase === 'victory' ? (
                <span className="text-[10px] bg-[#c8aa6e] text-[#010a13] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest font-display inline-block">
                  {language === 'es' ? 'CAMPEÓN INVICTO 6-0' : 'UNDEFEATED CHAMPION 6-0'}
                </span>
              ) : (
                <span className="text-[10px] bg-red-650 text-white font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest font-display inline-block">
                  {language === 'es' ? 'DESAFÍO COMPLETADO' : 'RUN COMPLETED'}
                </span>
              )}
              
              <h2 className="font-display font-black text-4xl md:text-5xl tracking-tight text-white uppercase leading-none">
                {phase === 'victory' ? activeTrans.victoryTitle : activeTrans.defeatTitle}
              </h2>
              <p className="text-[#a09b8c] text-xs md:text-sm max-w-sm mx-auto leading-normal">
                {phase === 'victory' 
                  ? `${activeTrans.victoryDesc} (${currentTeamScore} OVR)`
                  : `${activeTrans.defeatDesc} (${language === 'es' ? 'Eliminado en' : 'Fell in'} ${getLocalizedRoundName(tournamentRound, gameMode, language)} • ${currentTeamScore} OVR)`
                }
              </p>
            </div>

            {/* Champions/Squad Summary Card - ALWAYS rendered so user can admire their team */}
            <div className="bg-[#091428] border border-[#c8aa6e]/25 p-5 md:p-6 rounded-2xl space-y-4 shadow-xl text-left">
              <h3 className="font-bold text-xs md:text-sm text-[#f0e6d2] border-b border-[#c8aa6e]/10 pb-2.5 uppercase tracking-wide font-display flex items-center gap-1.5">
                <span>🛡️</span> {language === 'es' ? 'TU ROSTER COMPETITIVO DETALLADO' : activeTrans.currentSquadTitle}:
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(draft).map(([slotKey, val]) => {
                  const item = val as SelectedSlot;
                  if (!item.player) return null;
                  return (
                    <div key={slotKey} className="flex items-center gap-3 p-2 bg-[#010a13] rounded-xl border border-[#c8aa6e]/15">
                      <div className="bg-[#091428] px-2 py-1 text-xs font-black text-[#c8aa6e] rounded font-mono">
                        {item.player.rating}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#f0e6d2]">{item.player.name}</p>
                        <p className="text-[10px] text-[#a09b8c] uppercase font-mono">{slotKey} • {item.fromTeam?.name} ({item.fromTeam?.year})</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Match Logs History Summary list */}
            {matchHistory.length > 0 && (
              <div className="bg-[#091428] border border-[#c8aa6e]/15 p-5 rounded-2xl space-y-3 shadow-xl text-left">
                <h4 className="font-bold text-xs uppercase text-[#f0e6d2] tracking-wider border-b border-[#c8aa6e]/10 pb-2 font-display flex items-center gap-1.5">
                  <span>📊</span> {language === 'es' ? 'HISTORIAL DEL TORNEO' : 'MATCH HISTORY'}
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {matchHistory.map((m, idx) => {
                    const isWin = m.result === 'W';
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-[#010a13] rounded-xl border border-[#c8aa6e]/10">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${isWin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-mono text-[#a09b8c] text-[9px] block font-semibold uppercase">{m.roundName}</span>
                            <span className="font-bold text-[#f0e6d2] text-[11px]">vs {m.opponentName} ({m.opponentYear})</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${isWin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {isWin ? (language === 'es' ? 'Victoria' : 'Win') : (language === 'es' ? 'Eliminado' : 'Loss')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Share & Save Passing Widget */}
            <ShareWidget
              draft={draft}
              teamScore={currentTeamScore}
              synergyDetails={synergyDetails}
              matchHistory={matchHistory}
              status={phase}
              roundIndex={tournamentRound}
              lang={language}
            />

            {/* Global Esports Leaderboard Ranking Panel */}
            <Leaderboard
              winsCount={matchHistory.filter(m => m.result === 'W').length}
              lossesCount={matchHistory.filter(m => m.result === 'L').length}
              totalKills={totalKills}
              totalDeaths={totalDeaths}
              teamOvr={currentTeamScore}
              gameMode={gameMode}
              lang={language === 'es' ? 'es' : 'en'}
            />

            {/* Try again & Restart controllers */}
            <div className="flex justify-center pt-4 max-w-sm mx-auto">
              <button
                id="reset-entire-draft-after-loss-btn-unified"
                onClick={() => handleResetTournament(true)}
                className="w-full py-4.5 bg-[#c8aa6e] hover:bg-[#b09358] text-[#010a13] hover:shadow-[0_0_24px_rgba(200,170,110,0.3)] hover:-translate-y-0.5 font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-155 cursor-pointer flex items-center justify-center gap-2 font-display active:translate-y-0"
              >
                <span>🔄</span>
                <span>{language === 'es' ? 'VOLVER A JUGAR (NUEVO DRAFT)' : 'PLAY AGAIN (NEW DRAFT)'}</span>
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
