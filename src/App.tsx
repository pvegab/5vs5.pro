import React, { useState, useEffect, useRef } from 'react';
import { SelectedSlot, TeamDraft, HistoricalTeam, Player, Role, Region, GameMode } from './types';
import { LEAGUE_TEAMS } from './data/lolTeams';
import PlayerCard from './components/PlayerCard';
import SlotCard from './components/SlotCard';
import RouletteWheel from './components/RouletteWheel';
import MatchSimulatorView from './components/MatchSimulatorView';
import ShareWidget from './components/ShareWidget';
import Leaderboard from './components/Leaderboard';
import ExoClickAd, { ExoFullpageReplayTags, ExoResponsiveBanner, ExoVideoSliderOnce } from './components/ExoClickAd';
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
  // Custom game mode state: normal Worlds, LEC hard path or LCS NA hard path
  const [gameMode, setGameMode] = useState<GameMode>('normal');

  const [tournamentRound, setTournamentRound] = useState(0); // 0 to 5 for 6 rounds
  const [hasDoubleRoll, setHasDoubleRoll] = useState(2); // Provide 2 emergency re-rolls for bad layout matching
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);
  const [totalKills, setTotalKills] = useState(0);
  const [totalDeaths, setTotalDeaths] = useState(0);
  const [mobileDraftTab, setMobileDraftTab] = useState<'spin' | 'squad'>('spin');
  const [showSynergyGuide, setShowSynergyGuide] = useState(false);

  // ---------- ADNOW ESTADOS ----------
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [adVisible, setAdVisible] = useState(false);
  const [adClickCount, setAdClickCount] = useState(0);
  const [adCycle, setAdCycle] = useState(0);
  const adScriptsInjected = useRef(false);
  // -----------------------------------

  const activeTrans = TRANSLATIONS[language] || TRANSLATIONS['es'];

  // Calculate statistics & synergies (Top, Jungle, Mid, ADC, Support and Coach)
  const getSynergiesAndScore = () => {
    const slots = Object.values(draft) as SelectedSlot[];
    const activeMembers = slots.filter(s => s.player !== null);

    if (activeMembers.length === 0) {
      return { score: 0, regionBonus: 0, teamBonus: 0, yearBonus: 0, champBonus: 0, coachBonus: 0, activeSynergies: [], total: 0 };
    }

    const playersOnly = slots.filter(s => s.player !== null && s.player.role !== 'coach');
    const coachOnly = draft.coach.player;

    let regionBonus = 0;
    let teamBonus = 0;
    let yearBonus = 0;
    let champBonus = 0;
    let coachBonus = 0;
    const activeSynergies: string[] = [];

    const normalizeChampionName = (champion?: string | null) => {
      return String(champion || '')
        .trim()
        .replace(/’/g, "'")
        .replace(/\s+/g, ' ');
    };

    const champions = playersOnly
      .map(p => normalizeChampionName(p.player?.signatureChampion))
      .filter(Boolean);

    const uniqueChampions = Array.from(new Set(champions));

    const hasChampion = (champion: string) => uniqueChampions.includes(champion);
    const countMatches = (group: string[]) => uniqueChampions.filter(c => group.includes(c)).length;

    const addChampionSynergy = (name: string, points: number) => {
      if (points <= 0) return;
      champBonus += points;
      activeSynergies.push(name);
    };

    const regionsList = playersOnly.map(p => p.fromTeam?.region).filter(Boolean) as Region[];
    const franchiseList = playersOnly.map(p => {
      const name = p.fromTeam?.name || '';
      return name.includes('SK Telecom') || name.includes('T1') ? 'T1' : name;
    }).filter(Boolean);
    const yearFranchiseKeys = playersOnly.map(p => `${p.fromTeam?.name}-${p.fromTeam?.year}`).filter(Boolean);

    const regCounts: Record<string, number> = {};
    regionsList.forEach(r => regCounts[r] = (regCounts[r] || 0) + 1);

    const franchiseCounts: Record<string, number> = {};
    franchiseList.forEach(f => franchiseCounts[f] = (franchiseCounts[f] || 0) + 1);

    const yearFrCounts: Record<string, number> = {};
    yearFranchiseKeys.forEach(k => yearFrCounts[k] = (yearFrCounts[k] || 0) + 1);

    // Region bonuses: competitive region only. This is separate from champion/lore chemistry.
    Object.entries(regCounts).forEach(([region, count]) => {
      if (count >= 5) {
        regionBonus = Math.max(regionBonus, 6.5);
        activeSynergies.push(`${region} Region (${count})`);
      } else if (count >= 3) {
        regionBonus = Math.max(regionBonus, 2.5);
        activeSynergies.push(`${region} Region (${count})`);
      }
    });

    // Franchise/team bonuses: real esports organization only. This is separate from champion/lore chemistry.
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

    // Exact year + team bonuses: historic roster chemistry only. This is separate from champion/lore chemistry.
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

    // Champion and composition synergies.
    // These bonuses are based only on signature champions, lore links and in-game composition style.
    // They deliberately do not use esports region, franchise or exact team/year.
    const loreGroups: Record<string, { champions: string[]; pointsByCount: Record<number, number> }> = {
      'Ionia Strike': {
        champions: ['Lee Sin', 'Yasuo', 'Yone', 'Irelia', 'Shen', 'Akali', 'Ahri', 'Karma', 'Xayah', 'Rakan', 'Zed', 'Kennen', 'Syndra', 'Varus', 'Sett', 'Wukong', 'Jhin'],
        pointsByCount: { 2: 1, 3: 2.2, 4: 3.5, 5: 4.5 },
      },
      'Freljord Forces': {
        champions: ['Ashe', 'Sejuani', 'Braum', 'Ornn', 'Olaf', 'Lissandra', 'Trundle', 'Anivia', 'Volibear', 'Tryndamere', 'Nunu & Willump', 'Gnar'],
        pointsByCount: { 2: 1, 3: 2.2, 4: 3.5, 5: 4.5 },
      },
      'Void Terror': {
        champions: ["Kha'Zix", "Kog'Maw", "Rek'Sai", "Cho'Gath", "Bel'Veth", "Kai'Sa", 'Malzahar', 'Kassadin', "Vel'Koz"],
        pointsByCount: { 2: 1.2, 3: 2.6, 4: 4, 5: 5 },
      },
      'Piltover & Zaun': {
        champions: ['Jinx', 'Vi', 'Caitlyn', 'Ekko', 'Camille', 'Viktor', 'Ezreal', 'Singed', 'Renata Glasc', 'Jayce', 'Orianna', 'Zeri', 'Heimerdinger', 'Blitzcrank', 'Zac'],
        pointsByCount: { 2: 1, 3: 2.2, 4: 3.5, 5: 4.5 },
      },
      'Shadow Isles': {
        champions: ['Thresh', 'Hecarim', 'Karthus', 'Kalista', 'Viego', 'Gwen', 'Maokai', 'Yorick', 'Elise'],
        pointsByCount: { 2: 1.2, 3: 2.5, 4: 4, 5: 5 },
      },
      'Noxian Might': {
        champions: ['Draven', 'Darius', 'Swain', 'Katarina', 'Sion', 'Talon', 'LeBlanc', 'Rell', 'Samira', 'Cassiopeia', 'Riven', 'Vladimir'],
        pointsByCount: { 2: 1, 3: 2.2, 4: 3.5, 5: 4.5 },
      },
      'Shuriman Ascension': {
        champions: ['Azir', 'Renekton', 'Nasus', 'Sivir', 'Taliyah', 'Akshan', 'Xerath', 'Rammus', 'Amumu', 'K’Sante', "K'Sante"],
        pointsByCount: { 2: 1, 3: 2.2, 4: 3.5, 5: 4.5 },
      },
      'Darkin Legacy': {
        champions: ['Aatrox', 'Naafiri', 'Rhaast', 'Kayn', 'Varus'],
        pointsByCount: { 2: 1.8, 3: 3.5, 4: 5 },
      },
      'Yordle Squad': {
        champions: ['Gnar', 'Poppy', 'Tristana', 'Lulu', 'Kennen', 'Veigar', 'Heimerdinger', 'Rumble', 'Teemo', 'Corki'],
        pointsByCount: { 2: 1, 3: 2.2, 4: 3.5, 5: 4.5 },
      },
      'Demacian Core': {
        champions: ['Garen', 'Lux', 'Jarvan IV', 'Fiora', 'Vayne', 'Lucian', 'Sona', 'Galio', 'Poppy', 'Quinn', 'Kayle', 'Morgana', 'Shyvana', 'Sylas'],
        pointsByCount: { 2: 1, 3: 2.2, 4: 3.5, 5: 4.5 },
      },
    };

    Object.entries(loreGroups).forEach(([groupName, groupData]) => {
      const matchCount = countMatches(groupData.champions);
      if (matchCount >= 2) {
        const cappedCount = Math.min(matchCount, 5);
        const points = groupData.pointsByCount[cappedCount] || groupData.pointsByCount[5] || 0;
        addChampionSynergy(`${groupName} (${matchCount})`, points);
      }
    });

    const specialPairs: { name: string; champions: string[]; points: number }[] = [
      { name: 'Lovers Duo (Xayah/Rakan)', champions: ['Xayah', 'Rakan'], points: 3 },
      { name: 'Redeemed Hunters (Lucian/Senna)', champions: ['Lucian', 'Senna'], points: 2.5 },
      { name: 'Wind Brothers (Yasuo/Yone)', champions: ['Yasuo', 'Yone'], points: 2.5 },
      { name: 'Demacian Siblings (Garen/Lux)', champions: ['Garen', 'Lux'], points: 1.8 },
      { name: 'Celestial Sisters (Kayle/Morgana)', champions: ['Kayle', 'Morgana'], points: 2.2 },
      { name: 'Glorious Evolution (Viktor/Jayce)', champions: ['Viktor', 'Jayce'], points: 1.8 },
      { name: 'Piltover Enforcers (Caitlyn/Vi)', champions: ['Caitlyn', 'Vi'], points: 2 },
      { name: 'Darkin Blade Path (Aatrox/Varus)', champions: ['Aatrox', 'Varus'], points: 1.8 },
      { name: 'Frozen Botlane (Ashe/Braum)', champions: ['Ashe', 'Braum'], points: 1.8 },
    ];

    specialPairs.forEach(pair => {
      if (pair.champions.every(hasChampion)) {
        addChampionSynergy(pair.name, pair.points);
      }
    });

    const championTags: Record<string, string[]> = {
      Aatrox: ['fighter', 'frontline', 'dive', 'ad', 'teamfight'],
      Ahri: ['mage', 'pick', 'ap', 'mobile', 'early'],
      Akali: ['assassin', 'dive', 'ap', 'mobile'],
      Alistar: ['support', 'engage', 'frontline', 'cc', 'peel'],
      Amumu: ['tank', 'engage', 'frontline', 'cc', 'wombo', 'ap'],
      Anivia: ['mage', 'control', 'ap', 'scaling', 'waveclear'],
      Aphelios: ['marksman', 'scaling', 'backline', 'ad', 'teamfight'],
      Ashe: ['marksman', 'utility', 'cc', 'backline', 'ad', 'pick'],
      Aurelion: ['mage', 'scaling', 'ap', 'teamfight'],
      Azir: ['mage', 'scaling', 'ap', 'backline', 'wombo', 'control'],
      Bard: ['support', 'utility', 'pick', 'roam', 'ap'],
      Blitzcrank: ['support', 'pick', 'engage', 'cc'],
      Braum: ['support', 'peel', 'frontline', 'cc', 'protect'],
      Caitlyn: ['marksman', 'poke', 'siege', 'backline', 'ad', 'lane'],
      Camille: ['fighter', 'dive', 'pick', 'ad', 'splitpush'],
      Cassiopeia: ['mage', 'scaling', 'ap', 'backline', 'control'],
      ChoGath: ['tank', 'frontline', 'cc', 'ap'],
      "Cho'Gath": ['tank', 'frontline', 'cc', 'ap'],
      Corki: ['marksman', 'poke', 'scaling', 'mixed', 'siege', 'backline'],
      Darius: ['fighter', 'frontline', 'ad', 'skirmish'],
      Draven: ['marksman', 'early', 'ad', 'backline', 'lane'],
      Ekko: ['assassin', 'dive', 'ap', 'mobile', 'skirmish'],
      Elise: ['mage', 'pick', 'dive', 'ap', 'early'],
      Ezreal: ['marksman', 'poke', 'siege', 'backline', 'ad', 'mobile'],
      Fiora: ['fighter', 'splitpush', 'ad', 'scaling'],
      Galio: ['tank', 'engage', 'frontline', 'ap', 'cc', 'protect', 'wombo'],
      Gnar: ['fighter', 'frontline', 'engage', 'cc', 'wombo', 'ad'],
      Gragas: ['tank', 'engage', 'ap', 'cc', 'wombo', 'disengage'],
      Graves: ['marksman', 'skirmish', 'ad', 'early'],
      Gwen: ['fighter', 'dive', 'ap', 'scaling', 'teamfight'],
      Hecarim: ['fighter', 'dive', 'engage', 'frontline', 'ad'],
      Heimerdinger: ['mage', 'poke', 'siege', 'ap', 'control'],
      Irelia: ['fighter', 'dive', 'ad', 'mobile', 'skirmish'],
      Janna: ['support', 'peel', 'protect', 'disengage'],
      Jarvan: ['tank', 'engage', 'frontline', 'cc', 'wombo', 'ad'],
      'Jarvan IV': ['tank', 'engage', 'frontline', 'cc', 'wombo', 'ad'],
      Jax: ['fighter', 'splitpush', 'ad', 'scaling'],
      Jayce: ['fighter', 'poke', 'siege', 'ad', 'lane'],
      Jhin: ['marksman', 'pick', 'backline', 'ad', 'utility'],
      Jinx: ['marksman', 'scaling', 'backline', 'ad', 'teamfight'],
      KaiSa: ['marksman', 'dive', 'scaling', 'mixed', 'backline'],
      "Kai'Sa": ['marksman', 'dive', 'scaling', 'mixed', 'backline'],
      Kalista: ['marksman', 'early', 'ad', 'engage', 'backline'],
      Karma: ['support', 'poke', 'protect', 'utility', 'ap', 'siege'],
      Karthus: ['mage', 'scaling', 'ap', 'teamfight'],
      Kassadin: ['assassin', 'scaling', 'ap', 'mobile'],
      Katarina: ['assassin', 'dive', 'ap', 'teamfight'],
      Kayle: ['mage', 'scaling', 'protect', 'backline', 'ap'],
      Kayn: ['fighter', 'dive', 'ad', 'mobile'],
      Kennen: ['mage', 'engage', 'wombo', 'ap', 'teamfight'],
      KhaZix: ['assassin', 'pick', 'ad', 'mobile'],
      "Kha'Zix": ['assassin', 'pick', 'ad', 'mobile'],
      Kindred: ['marksman', 'scaling', 'ad', 'protect', 'backline'],
      KogMaw: ['marksman', 'scaling', 'backline', 'ad', 'protect'],
      "Kog'Maw": ['marksman', 'scaling', 'backline', 'ad', 'protect'],
      LeBlanc: ['assassin', 'pick', 'ap', 'mobile', 'early'],
      LeeSin: ['fighter', 'engage', 'dive', 'ad', 'early', 'mobile'],
      'Lee Sin': ['fighter', 'engage', 'dive', 'ad', 'early', 'mobile'],
      Leona: ['support', 'engage', 'frontline', 'cc'],
      Lissandra: ['mage', 'engage', 'cc', 'ap', 'wombo', 'control'],
      Lucian: ['marksman', 'early', 'ad', 'backline', 'mobile'],
      Lulu: ['support', 'peel', 'protect', 'utility', 'ap'],
      Lux: ['mage', 'poke', 'pick', 'ap', 'siege'],
      Malphite: ['tank', 'engage', 'frontline', 'cc', 'wombo', 'ap'],
      Malzahar: ['mage', 'pick', 'control', 'ap', 'cc'],
      Maokai: ['tank', 'engage', 'frontline', 'cc', 'control'],
      MissFortune: ['marksman', 'teamfight', 'wombo', 'ad', 'backline'],
      'Miss Fortune': ['marksman', 'teamfight', 'wombo', 'ad', 'backline'],
      Morgana: ['mage', 'pick', 'protect', 'ap', 'cc'],
      Nami: ['support', 'peel', 'protect', 'engage', 'utility'],
      Nasus: ['fighter', 'scaling', 'frontline', 'splitpush', 'ad'],
      Nautilus: ['support', 'engage', 'frontline', 'cc', 'pick'],
      Nidalee: ['mage', 'poke', 'ap', 'early', 'mobile'],
      Olaf: ['fighter', 'dive', 'frontline', 'ad', 'early'],
      Orianna: ['mage', 'control', 'wombo', 'ap', 'teamfight', 'backline'],
      Ornn: ['tank', 'engage', 'frontline', 'cc', 'scaling'],
      Pantheon: ['fighter', 'dive', 'early', 'ad', 'pick'],
      Poppy: ['tank', 'frontline', 'peel', 'cc', 'disengage'],
      Pyke: ['support', 'pick', 'roam', 'ad', 'early'],
      Qiyana: ['assassin', 'dive', 'ad', 'wombo', 'mobile'],
      Rakan: ['support', 'engage', 'cc', 'wombo', 'protect'],
      Rell: ['support', 'engage', 'frontline', 'cc', 'wombo'],
      RekSai: ['fighter', 'dive', 'early', 'ad'],
      "Rek'Sai": ['fighter', 'dive', 'early', 'ad'],
      Renata: ['support', 'peel', 'protect', 'utility', 'teamfight'],
      'Renata Glasc': ['support', 'peel', 'protect', 'utility', 'teamfight'],
      Renekton: ['fighter', 'frontline', 'early', 'ad', 'lane'],
      Riven: ['fighter', 'dive', 'ad', 'mobile'],
      Rumble: ['mage', 'wombo', 'ap', 'teamfight', 'lane'],
      Ryze: ['mage', 'scaling', 'ap', 'control', 'roam'],
      Samira: ['marksman', 'dive', 'ad', 'teamfight'],
      Sejuani: ['tank', 'engage', 'frontline', 'cc'],
      Senna: ['marksman', 'support', 'scaling', 'utility', 'ad', 'backline'],
      Seraphine: ['mage', 'support', 'wombo', 'protect', 'ap', 'teamfight'],
      Sett: ['fighter', 'frontline', 'engage', 'ad'],
      Shen: ['tank', 'protect', 'frontline', 'cc'],
      Singed: ['tank', 'frontline', 'ap', 'disrupt'],
      Sion: ['tank', 'engage', 'frontline', 'cc'],
      Sivir: ['marksman', 'scaling', 'teamfight', 'backline', 'ad'],
      Swain: ['mage', 'frontline', 'ap', 'teamfight'],
      Sylas: ['mage', 'dive', 'ap', 'skirmish'],
      Syndra: ['mage', 'pick', 'ap', 'control', 'backline'],
      TahmKench: ['support', 'peel', 'protect', 'frontline'],
      'Tahm Kench': ['support', 'peel', 'protect', 'frontline'],
      Taliyah: ['mage', 'pick', 'roam', 'ap', 'control'],
      Talon: ['assassin', 'pick', 'ad', 'roam', 'early'],
      Thresh: ['support', 'pick', 'peel', 'cc', 'utility'],
      Tristana: ['marksman', 'scaling', 'backline', 'ad', 'dive'],
      Trundle: ['fighter', 'frontline', 'ad', 'skirmish'],
      TwistedFate: ['mage', 'pick', 'roam', 'ap', 'utility'],
      'Twisted Fate': ['mage', 'pick', 'roam', 'ap', 'utility'],
      Varus: ['marksman', 'poke', 'pick', 'backline', 'ad', 'siege'],
      Vayne: ['marksman', 'scaling', 'backline', 'ad'],
      Veigar: ['mage', 'scaling', 'ap', 'pick', 'control'],
      VelKoz: ['mage', 'poke', 'siege', 'ap'],
      "Vel'Koz": ['mage', 'poke', 'siege', 'ap'],
      Vi: ['fighter', 'dive', 'engage', 'ad', 'pick'],
      Viego: ['fighter', 'dive', 'ad', 'teamfight'],
      Viktor: ['mage', 'scaling', 'ap', 'control', 'backline', 'teamfight'],
      Vladimir: ['mage', 'scaling', 'ap', 'teamfight', 'dive'],
      Volibear: ['tank', 'dive', 'frontline', 'early'],
      Wukong: ['fighter', 'engage', 'wombo', 'ad', 'teamfight'],
      Xayah: ['marksman', 'scaling', 'backline', 'ad', 'selfpeel'],
      Xerath: ['mage', 'poke', 'siege', 'ap', 'backline'],
      XinZhao: ['fighter', 'dive', 'early', 'ad', 'frontline'],
      'Xin Zhao': ['fighter', 'dive', 'early', 'ad', 'frontline'],
      Yasuo: ['fighter', 'dive', 'ad', 'wombo', 'mobile'],
      Yone: ['fighter', 'dive', 'ad', 'wombo', 'mobile'],
      Yuumi: ['support', 'protect', 'peel', 'scaling'],
      Zac: ['tank', 'engage', 'frontline', 'cc', 'wombo'],
      Zed: ['assassin', 'pick', 'ad', 'mobile'],
      Zeri: ['marksman', 'scaling', 'backline', 'ad', 'mobile'],
      Ziggs: ['mage', 'poke', 'siege', 'ap', 'waveclear'],
      Zoe: ['mage', 'poke', 'pick', 'ap'],
      Zyra: ['mage', 'support', 'poke', 'ap', 'control'],
    };

    const getTagsForChampion = (champion: string) => {
      const normalized = normalizeChampionName(champion);
      return championTags[normalized] || championTags[normalized.replace(/[\s']/g, '')] || [];
    };

    const tagCounts: Record<string, number> = {};
    uniqueChampions.forEach(champion => {
      getTagsForChampion(champion).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const addCompositionSynergy = (condition: boolean, name: string, points: number) => {
      if (condition) addChampionSynergy(name, points);
    };

    addCompositionSynergy((tagCounts.engage || 0) >= 3, `Full Engage (${tagCounts.engage || 0})`, 2.8);
    addCompositionSynergy((tagCounts.dive || 0) >= 3, `Dive Comp (${tagCounts.dive || 0})`, 2.5);
    addCompositionSynergy((tagCounts.poke || 0) >= 2 && (tagCounts.siege || 0) >= 2, `Poke Siege (${tagCounts.poke || 0})`, 2.2);
    addCompositionSynergy((tagCounts.pick || 0) >= 3, `Pick & Catch (${tagCounts.pick || 0})`, 2.4);
    addCompositionSynergy((tagCounts.wombo || 0) >= 2, `Wombo Combo (${tagCounts.wombo || 0})`, 2.6);
    addCompositionSynergy((tagCounts.cc || 0) >= 3, `CC Chain (${tagCounts.cc || 0})`, 2.4);
    addCompositionSynergy((tagCounts.protect || 0) >= 2 && (tagCounts.marksman || 0) >= 1, 'Protect the Carry', 2.2);
    addCompositionSynergy((tagCounts.frontline || 0) >= 2 && (tagCounts.backline || 0) >= 2, 'Frontline + Backline', 2.2);
    addCompositionSynergy((tagCounts.scaling || 0) >= 3, `Scaling Teamfight (${tagCounts.scaling || 0})`, 2.2);
    addCompositionSynergy((tagCounts.early || 0) >= 3, `Early Game Tempo (${tagCounts.early || 0})`, 1.8);
    addCompositionSynergy((tagCounts.splitpush || 0) >= 2, `Side Lane Pressure (${tagCounts.splitpush || 0})`, 1.6);
    addCompositionSynergy((tagCounts.ad || 0) >= 2 && (tagCounts.ap || 0) >= 2, 'Balanced Damage', 2);
    addCompositionSynergy((tagCounts.ad || 0) >= 4, `AD Heavy (${tagCounts.ad || 0})`, 1.3);
    addCompositionSynergy((tagCounts.ap || 0) >= 4, `AP Heavy (${tagCounts.ap || 0})`, 1.3);

    // Coach synergies
    if (coachOnly && coachOnly.signatureChampion) {
      const style = coachOnly.signatureChampion.toLowerCase();

      if (style.match(/draft|pizarra|brain|notebook|tactic|strateg|flex|style/)) {
        coachBonus += 2.5;
        if (playersOnly.length >= 5) coachBonus += 1.5;
        activeSynergies.push('Tactical Draft (Coach)');
      } else if (style.match(/agresi|aggress|creat/)) {
        const aggressiveChamps = ['Lee Sin', 'Elise', 'LeBlanc', 'Zed', 'Renekton', 'Draven', 'Lucian', "Kha'Zix", 'Nidalee', 'Pantheon', 'Jayce', 'Qiyana', 'Talon', 'Xin Zhao', 'Kalista', 'Pyke', 'Vi'];
        const aggroCount = uniqueChampions.filter(c => aggressiveChamps.includes(c)).length;

        if (aggroCount >= 1) {
          coachBonus += 1 + (aggroCount * 1.5);
          activeSynergies.push(`Aggressive Pacing (${aggroCount})`);
        } else {
          coachBonus += 0.5;
          activeSynergies.push('Aggressive Pacing (Coach)');
        }
      } else {
        const macroBonus = Math.min(3, (regionBonus + teamBonus) * 0.4);
        coachBonus += macroBonus > 0 ? macroBonus : 1;
        activeSynergies.push('Macro Discipline (Coach)');
      }
    }

    // Keep champion chemistry valuable, but not strong enough to replace roster/region/year decisions.
    champBonus = Math.min(12, Math.round(champBonus * 10) / 10);
    coachBonus = Math.round(coachBonus * 10) / 10;

    const totalSynergy = regionBonus + teamBonus + yearBonus + champBonus + coachBonus;

    const filledSlots = slots.filter(s => s.player !== null);
    const sumRatings = filledSlots.reduce((sum, s) => sum + (s.player?.rating || 0), 0);
    const baseAvgSix = filledSlots.length > 0 ? (sumRatings / filledSlots.length) : 70;

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

  const championSynergyLabels = (synergyDetails.activeSynergies || []).filter(s =>
    !s.includes(' Region') &&
    !s.includes(' Franchise') &&
    !s.includes('Perfect Chemistry') &&
    !s.includes('Coach')
  );

  const coachSynergyLabels = (synergyDetails.activeSynergies || []).filter(s =>
    s.includes('Coach') || s.includes('Pacing')
  );

  const currentTeamScore = synergyDetails.score;

  // Get count of drafted slots
  const getDraftedCount = () => {
    return (Object.values(draft) as SelectedSlot[]).filter(s => s.player !== null).length;
  };

  // Draft completion requires all 6 essential positions (top, jungle, mid, adc, support, coach) to be completed
  const isDraftComplete = getDraftedCount() === 6;

  // Draft pools by mode:
  // normal: only rosters that attended Worlds that exact year.
  // lecHard: all historic European LEC/EU LCS rosters.
  // lcsHard: all historic North American LCS rosters.
  const availableTeams = LEAGUE_TEAMS.filter(t => {
    if (t.id === 'custom') return false;
    if (gameMode === 'normal') return t.hasWorldsAppearance === true;
    if (gameMode === 'lecHard') return t.region === 'LEC';
    if (gameMode === 'lcsHard') return t.region === 'LCS';
    return false;
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

  // ======================================================
  // LÓGICA DEL ANUNCIO ADNOW
  // ======================================================

  // Detectar si es móvil/tablet (≤1024px)
  useEffect(() => {
    const checkDevice = () => setIsMobileOrTablet(window.innerWidth <= 1024);
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Inyectar scripts de AdNow una sola vez para todos los dispositivos
  useEffect(() => {
    if (adScriptsInjected.current) return;

    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.innerHTML = `
      (sc_adv_out = window.sc_adv_out || []).push({
          id: 888818,
          domain: "n.nnowa.com",
      });
    `;
    document.body.appendChild(configScript);

    const adScript = document.createElement('script');
    adScript.type = 'text/javascript';
    adScript.src = '//st-n.nnowa.com/js/a.js';
    adScript.async = true;
    document.body.appendChild(adScript);

    adScriptsInjected.current = true;
  }, []); // Se ejecuta una sola vez al montar

  // Mostrar el anuncio invisible en móvil/tablet de forma aleatoria
  useEffect(() => {
    if (!isMobileOrTablet) {
      setAdVisible(false);
      return;
    }

    if (adVisible) return; // ya está visible

    // 50% de probabilidad de aparecer tras 5-15 segundos
    if (Math.random() < 0.5) {
      const delay = Math.floor(Math.random() * 10000) + 5000;
      const timer = setTimeout(() => {
        setAdVisible(true);
        setAdClickCount(0);
      }, delay);
      return () => clearTimeout(timer);
    }
    // si no toca, no hacemos nada; se reactivará con adCycle
  }, [isMobileOrTablet, adVisible, adCycle]);

  // Dormir el anuncio invisible tras 3 clics y reactivar tras 30-60s
  useEffect(() => {
    if (adClickCount >= 3) {
      setAdVisible(false);
      setAdClickCount(0);

      const cooldown = Math.floor(Math.random() * 30000) + 30000; // 30-60 segundos
      const timer = setTimeout(() => {
        setAdCycle(prev => prev + 1); // fuerza reevaluación del efecto anterior
      }, cooldown);
      return () => clearTimeout(timer);
    }
  }, [adClickCount]);

  // Manejador de clic en el anuncio invisible
  const handleAdClick = () => {
    if (adVisible) {
      setAdClickCount(prev => prev + 1);
    }
  };

  // ======================================================

  return (
    <div id="main-viewport" className="min-h-screen bg-[#010a13] font-sans selection:bg-[#c8aa6e] selection:text-[#010a13] text-[#f0e6d2] pb-16">
      <ExoFullpageReplayTags />

      <ExoVideoSliderOnce enabled={phase === 'tournament' && matchHistory.length >= 2} />

      
      {/* Dynamic Background Grid Mesh */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#c8aa6e_1px,transparent_1px),linear-gradient(to_bottom,#c8aa6e_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Corporate Esports Header */}
      <header className="sticky top-0 bg-[#010a13]/85 backdrop-blur-md border-b border-[#c8aa6e]/20 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#c8aa6e] to-[#785a28] bg-yellow-500 rounded-xl flex items-center justify-center font-black text-[#010a13] text-sm tracking-tighter shadow-[0_0_12px_rgba(200,170,110,0.25)] font-display">
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

            {/* ANUNCIO ADNOW INVISIBLE (solo móvil/tablet) */}
            {isMobileOrTablet && (
              <div
                onClick={handleAdClick}
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 9999,
                  opacity: 0,                             // totalmente invisible
                  pointerEvents: adVisible ? 'auto' : 'none',
                  width: '300px',
                  height: '250px',
                }}
              >
                <div id="SC_TBlock_888818"></div>
              </div>
            )}

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

                    {/* LCS NA Hard Mode Button */}
                    <button
                      type="button"
                      onClick={() => setGameMode('lcsHard')}
                      className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                        gameMode === 'lcsHard'
                          ? 'bg-blue-500/5 border-blue-500/50 text-white shadow-md ring-1 ring-blue-500/10'
                          : 'bg-[#010a13] border-slate-800/80 text-[#a09b8c]/80 hover:bg-[#1e2328]/30'
                      }`}
                    >
                      <div className="pt-0.5">
                        <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center p-0.5">
                          {gameMode === 'lcsHard' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-blue-400">{activeTrans.modeLcsHard}</span>
                          <span className="text-[8px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">{activeTrans.diffHard}</span>
                        </div>
                        <p className="text-[10px] text-[#a09b8c] mt-0.5 leading-relaxed">{activeTrans.modeLcsHardDesc}</p>
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
                className="inline-flex items-center gap-2 px-10 py-5 bg-[#c8aa6e] hover:brightness-110 text-[#010a13] font-black text-xs tracking-widest uppercase rounded-xl transition-all duration-300 hover:shadow-[0_0_24px_rgba(200,170,110,0.3)] hover:-translate-y-0.5 cursor-pointer font-display"
              >
                {activeTrans.ctaStart}
              </button>
            </div>

            {/* ANUNCIO ADNOW DE ESCRITORIO (solo PC, debajo del botón) */}
            {!isMobileOrTablet && (
              <div className="max-w-md mx-auto mt-4">
                <div id="SC_TBlock_888818"></div>
              </div>
            )}

            <ExoResponsiveBanner subId="home_after_start_button" />
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
                    <span className="font-display font-black text-5xl text-[#c8aa6e] tracking-tight leading-none">
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
                  <div className={`p-2.5 rounded-xl border ${synergyDetails.regionBonus > 0 ? 'bg-sky-950/25 border-sky-800/60 text-sky-400 font-medium' : 'bg-[#010a13]/40 border-[#c8aa6e]/10 text-[#a09b8c]/40'}`}>
                    <div className="text-[9px] font-bold tracking-wider font-mono uppercase">{activeTrans.regionBonus}</div>
                    <div className="text-lg font-black mt-0.5">+{synergyDetails.regionBonus}</div>
                    <p className="text-[8px] text-[#a09b8c]/65">3+ / 5+</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${synergyDetails.teamBonus > 0 ? 'bg-emerald-950/25 border-emerald-800/60 text-emerald-400 font-medium' : 'bg-[#010a13]/40 border-[#c8aa6e]/10 text-[#a09b8c]/40'}`}>
                    <div className="text-[9px] font-bold tracking-wider font-mono uppercase">{activeTrans.teamBonus}</div>
                    <div className="text-lg font-black mt-0.5">+{synergyDetails.teamBonus}</div>
                    <p className="text-[8px] text-[#a09b8c]/65">2+ / 3+ / 4+</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${synergyDetails.yearBonus > 0 ? 'bg-purple-950/25 border-purple-800/60 text-purple-400 font-semibold' : 'bg-[#010a13]/40 border-[#c8aa6e]/10 text-[#a09b8c]/40'}`}>
                    <div className="text-[9px] font-bold tracking-wider font-mono uppercase">{activeTrans.yearBonus}</div>
                    <div className="text-lg font-black mt-0.5">+{synergyDetails.yearBonus}</div>
                    <p className="text-[8px] text-[#a09b8c]/65">{activeTrans.perfectChemistry}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${(synergyDetails.champBonus ?? 0) > 0 ? 'bg-amber-950/25 border-amber-800/60 text-amber-400 font-medium' : 'bg-[#010a13]/40 border-[#c8aa6e]/10 text-[#a09b8c]/40'}`}>
                    <div className="text-[9px] font-bold tracking-wider font-mono uppercase truncate">CHAMPIONS</div>
                    <div className="text-lg font-black mt-0.5">+{synergyDetails.champBonus}</div>
                    <p className="text-[7px] text-[#a09b8c]/65 truncate" title={championSynergyLabels.join(', ')}>
                      {championSynergyLabels[0] || 'Lore / Combat Style'}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${(synergyDetails.coachBonus ?? 0) > 0 ? 'bg-rose-950/25 border-rose-800/60 text-rose-400 font-medium' : 'bg-[#010a13]/40 border-[#c8aa6e]/10 text-[#a09b8c]/40'}`}>
                    <div className="text-[9px] font-bold tracking-wider font-mono uppercase truncate">COACH STYLE</div>
                    <div className="text-lg font-black mt-0.5">+{synergyDetails.coachBonus}</div>
                    <p className="text-[7px] text-[#a09b8c]/65 truncate" title={coachSynergyLabels.join(', ')}>
                      {coachSynergyLabels[0] || 'Draft matching'}
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
                    <div className="flex items-center gap-1.5 font-bold text-sky-400">
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
                        ? 'Premia la afinidad por haber defendido el mismo escudo en una etapa de su carrera.\n• 2 jugadores: +2.5 puntos OVR.\n• 3 jugadores: +5.0 puntos OVR.\n• 4+ jugadores: +8.0 puntos OVR.'
                        : 'Affinities for having played under the same organization shield.\n• 2 players: +2.5 OVR\n• 3 players: +5.0 OVR\n• 4+ players: +8.0 OVR.'}
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
                        ? 'Se activa si tienes jugadores que compartieron exactamente el mismo año y equipo de competición histórica (e.g. Fnatic 2018).\n• 2 jugadores: +2.5 puntos OVR.\n• 3 jugadores: +5.0 puntos OVR.\n• 4 jugadores: +8.0 puntos OVR.\n• 5 jugadores: +10.0 puntos OVR.'
                        : 'Triggers if you draft players who competed together in the exact same year and team roster (e.g. Fnatic 2018).\n• 2 players: +2.5 OVR\n• 3 players: +5.0 OVR\n• 4 players: +8.0 OVR\n• 5 players: +10.0 OVR.'}
                    </p>

                    <div className="flex items-center gap-1.5 font-bold text-amber-400 pt-1">
                      <span>🔥</span>
                      <h6 className="uppercase tracking-wider font-display font-black text-[10px]">{language === 'es' ? 'Sinergias de Campeón' : 'Champion Synergies'}</h6>
                    </div>
                    <p className="text-[#a09b8c] leading-relaxed text-[11px] whitespace-pre-line">
                      {language === 'es'
                        ? 'Bono especial por campeones insignia, sin contar equipo real, región competitiva ni año.\n• Parejas de lore: Xayah/Rakan, Lucian/Senna, Yasuo/Yone, Garen/Lux, Kayle/Morgana.\n• Facciones de lore: Ionia, Freljord, Vacío, Piltover/Zaun, Noxus, Shurima, Darkin, Yordles y Shadow Isles.\n• Estilo de combate: Engage, Dive, Poke, Pick, Wombo Combo, CC Chain, Protect the Carry, Scaling, Frontline + Backline y daño equilibrado.\n• El bonus de campeones tiene límite para no sustituir la química de roster.'
                        : 'Special bonus from signature champions only, without counting real esports team, competitive region or year.\n• Lore pairs: Xayah/Rakan, Lucian/Senna, Yasuo/Yone, Garen/Lux, Kayle/Morgana.\n• Lore factions: Ionia, Freljord, Void, Piltover/Zaun, Noxus, Shurima, Darkin, Yordles and Shadow Isles.\n• Combat style: Engage, Dive, Poke, Pick, Wombo Combo, CC Chain, Protect the Carry, Scaling, Frontline + Backline and balanced damage.\n• Champion bonus is capped so it does not replace roster chemistry.'}
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
                           <span className="text-xs text-[#a09b8c] font-mono font-bold">{activeTrans.luckyTeam}</span>
                        </div>
                        <h3 className="text-lg font-black text-[#f0e6d2] mt-1.5 uppercase font-display flex items-baseline gap-2 flex-wrap">
                          <span>{currentActiveTeam.name}</span>
                          <span>{currentActiveTeam.year}</span>
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
                        {gameMode !== 'normal' ? activeTrans.worldsWaitTitle : '¡Squad listo para disputar el Mundial!'}
                      </span>
                    </div>

                    <button
                      id="draft-complete-worlds-trigger"
                      onClick={handleStartTournament}
                      className="w-full justify-center flex items-center gap-2 px-8 py-4 bg-[#c8aa6e] hover:brightness-110 text-[#010a13] font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-xl shadow-[#091428]/40 hover:-translate-y-0.5 cursor-pointer font-display"
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
                    {idx < 5 && <ChevronRight className="hidden md:block w-4 h-4 text-slate-700" />}
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
              matchHistory={matchHistory}
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
                  <div className="absolute -inset-2 rounded-full bg-red-600/30 opacity-40 blur-2xl animate-pulse" />
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
                <span className="text-[10px] bg-red-600 text-white font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest font-display inline-block">
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
              gameMode={gameMode}
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
              <a
                href="#play-again"
                id="reset-entire-draft-after-loss-btn-unified"
                role="button"
                onClick={(event) => {
                  event.preventDefault();
                  handleResetTournament(true);
                }}
                className="exo-replay-ad w-full py-4.5 bg-[#c8aa6e] hover:bg-[#b09358] text-[#010a13] hover:shadow-[0_0_24px_rgba(200,170,110,0.3)] hover:-translate-y-0.5 font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 font-display active:translate-y-0"
              >
                <span>🔄</span>
                <span>{language === 'es' ? 'VOLVER A JUGAR (NUEVO DRAFT)' : 'PLAY AGAIN (NEW DRAFT)'}</span>
              </a>
            </div>

            <div className="max-w-2xl mx-auto pt-2">
              <ExoClickAd
                placement="nativeFinal"
                subId={`native_final_below_play_again_${phase}`}
                className="mt-4"
                minHeight={0}
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
