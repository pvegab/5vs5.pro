import React, { useState, useEffect } from 'react';
import { Award, Trophy } from 'lucide-react';
import { Language } from '../locales';
import { GameMode } from '../types';

interface LeaderboardEntry {
  id?: number;
  position?: number;
  name: string;
  countryCode: string;
  flag: string;
  record: string;
  kills: number;
  deaths: number;
  score: number;
  gameMode: GameMode;
  ovr: number;
  date: string;
}

interface LeaderboardProps {
  winsCount: number;
  lossesCount: number;
  totalKills: number;
  totalDeaths: number;
  teamOvr: number;
  gameMode: GameMode;
  lang?: Language;
}

interface Country {
  code: string;
  flag: string;
  names: Record<Language, string>;
}

type TextSet = {
  rankingTitle: string;
  rankingSubtitle: string;
  runScore: string;
  submitTitle: string;
  coachName: string;
  coachPlaceholder: string;
  selectFlag: string;
  saveResult: string;
  saving: string;
  successTitle: string;
  successDesc: string;
  topRanking: string;
  nearbyRanking: string;
  yourPosition: string;
  of: string;
  coach: string;
  record: string;
  kd: string;
  mode: string;
  score: string;
  loading: string;
  empty: string;
  hard: string;
  hardLec: string;
  hardLcs: string;
  normal: string;
  saveError: string;
  positionError: string;
  you: string;
};

const API_URL = 'https://api.5vs5.pro/api/leaderboard';

const ES: TextSet = {
  rankingTitle: 'RANKING MUNDIAL',
  rankingSubtitle: 'COMPITE CON LOS ENTRENADORES MÁS ICÓNICOS DEL MUNDO',
  runScore: 'TU PUNTUACIÓN DE RUN',
  submitTitle: 'REGISTRA TU LOGRO COMPITIENDO COMO ENTRENADOR',
  coachName: 'NOMBRE DEL ENTRENADOR',
  coachPlaceholder: 'Ej: Coach Melzhet, KkOma...',
  selectFlag: 'SELECCIONA TU BANDERA',
  saveResult: 'GUARDAR RESULTADOS EN LÍNEA',
  saving: 'GUARDANDO...',
  successTitle: '¡REGISTRO COMPLETADO CORRECTAMENTE!',
  successDesc: 'Tu resultado ya está fijado en el ranking mundial.',
  topRanking: 'TOP 10 GLOBAL',
  nearbyRanking: 'TU POSICIÓN EN EL RANKING',
  yourPosition: 'Tu posición',
  of: 'de',
  coach: 'ENTRENADOR',
  record: 'RÉCORD',
  kd: 'K/D PARTIDAS',
  mode: 'MODO',
  score: 'PUNTAJE',
  loading: 'Cargando ranking global...',
  empty: 'Todavía no hay resultados guardados.',
  hard: 'DIFÍCIL',
  hardLec: 'LEC',
  hardLcs: 'LCS',
  normal: 'Worlds',
  saveError: 'No se pudo guardar el resultado. Inténtalo de nuevo.',
  positionError: 'Resultado guardado, pero no se pudo cargar tu posición. Revisa el endpoint /around en el backend.',
  you: 'TÚ',
};

const EN: TextSet = {
  rankingTitle: 'GLOBAL RANKING',
  rankingSubtitle: 'COMPETE AGAINST THE MOST ICONIC COACHES IN THE WORLD',
  runScore: 'YOUR RUN SCORE',
  submitTitle: 'SUBMIT YOUR RECORD AS HEAD COACH',
  coachName: 'COACH PROFILE NAME',
  coachPlaceholder: 'E.g. Coach Yamato...',
  selectFlag: 'SELECT YOUR FLAG',
  saveResult: 'SAVE ONLINE RESULT',
  saving: 'SAVING...',
  successTitle: 'RESULT SAVED SUCCESSFULLY!',
  successDesc: 'Your result is now locked into the global ranking.',
  topRanking: 'GLOBAL TOP 10',
  nearbyRanking: 'YOUR RANKING POSITION',
  yourPosition: 'Your position',
  of: 'of',
  coach: 'COACH',
  record: 'RECORD',
  kd: 'SIMULATION K/D',
  mode: 'MODE',
  score: 'SCORE',
  loading: 'Loading global leaderboard...',
  empty: 'No saved results yet.',
  hard: 'HARD',
  hardLec: 'LEC',
  hardLcs: 'LCS',
  normal: 'Worlds',
  saveError: 'Could not save the result. Please try again.',
  positionError: 'Result saved, but your nearby ranking could not be loaded. Check the backend /around endpoint.',
  you: 'YOU',
};

const TEXT: Record<Language, TextSet> = {
  es: ES,
  en: EN,
  fr: { ...EN, rankingTitle: 'CLASSEMENT MONDIAL', topRanking: 'TOP 10 MONDIAL', nearbyRanking: 'VOTRE POSITION AU CLASSEMENT', yourPosition: 'Votre position', of: 'sur', you: 'VOUS' },
  de: { ...EN, rankingTitle: 'WELTRANKING', topRanking: 'GLOBAL TOP 10', nearbyRanking: 'DEINE POSITION IM RANKING', yourPosition: 'Deine Position', of: 'von', you: 'DU' },
  it: { ...EN, rankingTitle: 'CLASSIFICA MONDIALE', topRanking: 'TOP 10 GLOBALE', nearbyRanking: 'LA TUA POSIZIONE IN CLASSIFICA', yourPosition: 'La tua posizione', of: 'di', you: 'TU' },
  pt: { ...ES, rankingTitle: 'RANKING MUNDIAL', selectFlag: 'SELECIONA A TUA BANDEIRA', topRanking: 'TOP 10 GLOBAL', nearbyRanking: 'A TUA POSIÇÃO NO RANKING', yourPosition: 'A tua posição', of: 'de', coach: 'TREINADOR', score: 'PONTUAÇÃO', you: 'TU' },
  ru: { ...EN, rankingTitle: 'МИРОВОЙ РЕЙТИНГ', topRanking: 'ТОП-10 МИРА', nearbyRanking: 'ВАША ПОЗИЦИЯ В РЕЙТИНГЕ', yourPosition: 'Ваша позиция', of: 'из', you: 'ВЫ' },
  ko: { ...EN, rankingTitle: '월드 랭킹', topRanking: '글로벌 TOP 10', nearbyRanking: '나의 랭킹 위치', yourPosition: '나의 위치', of: '/', you: '나' },
  zh: { ...EN, rankingTitle: '世界排名', topRanking: '全球前 10', nearbyRanking: '你的排名位置', yourPosition: '你的排名', of: '/', you: '你' },
};

const names = (es: string, en: string): Record<Language, string> => ({
  es,
  en,
  fr: en,
  de: en,
  it: en,
  pt: es,
  ru: en,
  ko: en,
  zh: en,
});

const COUNTRIES: Country[] = [
  // Europa
  { code: 'ES', flag: '🇪🇸', names: names('España', 'Spain') },
  { code: 'DE', flag: '🇩🇪', names: names('Alemania', 'Germany') },
  { code: 'FR', flag: '🇫🇷', names: names('Francia', 'France') },
  { code: 'PT', flag: '🇵🇹', names: names('Portugal', 'Portugal') },
  { code: 'IT', flag: '🇮🇹', names: names('Italia', 'Italy') },
  { code: 'GB', flag: '🇬🇧', names: names('Reino Unido', 'United Kingdom') },
  { code: 'IE', flag: '🇮🇪', names: names('Irlanda', 'Ireland') },
  { code: 'NL', flag: '🇳🇱', names: names('Países Bajos', 'Netherlands') },
  { code: 'BE', flag: '🇧🇪', names: names('Bélgica', 'Belgium') },
  { code: 'LU', flag: '🇱🇺', names: names('Luxemburgo', 'Luxembourg') },
  { code: 'CH', flag: '🇨🇭', names: names('Suiza', 'Switzerland') },
  { code: 'AT', flag: '🇦🇹', names: names('Austria', 'Austria') },
  { code: 'SE', flag: '🇸🇪', names: names('Suecia', 'Sweden') },
  { code: 'DK', flag: '🇩🇰', names: names('Dinamarca', 'Denmark') },
  { code: 'NO', flag: '🇳🇴', names: names('Noruega', 'Norway') },
  { code: 'FI', flag: '🇫🇮', names: names('Finlandia', 'Finland') },
  { code: 'IS', flag: '🇮🇸', names: names('Islandia', 'Iceland') },
  { code: 'PL', flag: '🇵🇱', names: names('Polonia', 'Poland') },
  { code: 'CZ', flag: '🇨🇿', names: names('Chequia', 'Czechia') },
  { code: 'SK', flag: '🇸🇰', names: names('Eslovaquia', 'Slovakia') },
  { code: 'HU', flag: '🇭🇺', names: names('Hungría', 'Hungary') },
  { code: 'RO', flag: '🇷🇴', names: names('Rumanía', 'Romania') },
  { code: 'BG', flag: '🇧🇬', names: names('Bulgaria', 'Bulgaria') },
  { code: 'GR', flag: '🇬🇷', names: names('Grecia', 'Greece') },
  { code: 'HR', flag: '🇭🇷', names: names('Croacia', 'Croatia') },
  { code: 'RS', flag: '🇷🇸', names: names('Serbia', 'Serbia') },
  { code: 'SI', flag: '🇸🇮', names: names('Eslovenia', 'Slovenia') },
  { code: 'BA', flag: '🇧🇦', names: names('Bosnia y Herzegovina', 'Bosnia and Herzegovina') },
  { code: 'ME', flag: '🇲🇪', names: names('Montenegro', 'Montenegro') },
  { code: 'MK', flag: '🇲🇰', names: names('Macedonia del Norte', 'North Macedonia') },
  { code: 'AL', flag: '🇦🇱', names: names('Albania', 'Albania') },
  { code: 'EE', flag: '🇪🇪', names: names('Estonia', 'Estonia') },
  { code: 'LV', flag: '🇱🇻', names: names('Letonia', 'Latvia') },
  { code: 'LT', flag: '🇱🇹', names: names('Lituania', 'Lithuania') },
  { code: 'UA', flag: '🇺🇦', names: names('Ucrania', 'Ukraine') },
  { code: 'TR', flag: '🇹🇷', names: names('Turquía', 'Turkey') },

  // Norteamérica
  { code: 'US', flag: '🇺🇸', names: names('Estados Unidos', 'United States') },
  { code: 'CA', flag: '🇨🇦', names: names('Canadá', 'Canada') },
  { code: 'MX', flag: '🇲🇽', names: names('México', 'Mexico') },

  // Centroamérica y Caribe
  { code: 'GT', flag: '🇬🇹', names: names('Guatemala', 'Guatemala') },
  { code: 'BZ', flag: '🇧🇿', names: names('Belice', 'Belize') },
  { code: 'SV', flag: '🇸🇻', names: names('El Salvador', 'El Salvador') },
  { code: 'HN', flag: '🇭🇳', names: names('Honduras', 'Honduras') },
  { code: 'NI', flag: '🇳🇮', names: names('Nicaragua', 'Nicaragua') },
  { code: 'CR', flag: '🇨🇷', names: names('Costa Rica', 'Costa Rica') },
  { code: 'PA', flag: '🇵🇦', names: names('Panamá', 'Panama') },
  { code: 'CU', flag: '🇨🇺', names: names('Cuba', 'Cuba') },
  { code: 'DO', flag: '🇩🇴', names: names('República Dominicana', 'Dominican Republic') },
  { code: 'PR', flag: '🇵🇷', names: names('Puerto Rico', 'Puerto Rico') },
  { code: 'JM', flag: '🇯🇲', names: names('Jamaica', 'Jamaica') },
  { code: 'TT', flag: '🇹🇹', names: names('Trinidad y Tobago', 'Trinidad and Tobago') },

  // Sudamérica
  { code: 'AR', flag: '🇦🇷', names: names('Argentina', 'Argentina') },
  { code: 'BO', flag: '🇧🇴', names: names('Bolivia', 'Bolivia') },
  { code: 'BR', flag: '🇧🇷', names: names('Brasil', 'Brazil') },
  { code: 'CL', flag: '🇨🇱', names: names('Chile', 'Chile') },
  { code: 'CO', flag: '🇨🇴', names: names('Colombia', 'Colombia') },
  { code: 'EC', flag: '🇪🇨', names: names('Ecuador', 'Ecuador') },
  { code: 'PY', flag: '🇵🇾', names: names('Paraguay', 'Paraguay') },
  { code: 'PE', flag: '🇵🇪', names: names('Perú', 'Peru') },
  { code: 'UY', flag: '🇺🇾', names: names('Uruguay', 'Uruguay') },
  { code: 'VE', flag: '🇻🇪', names: names('Venezuela', 'Venezuela') },

  // Asia
  { code: 'KR', flag: '🇰🇷', names: names('Corea del Sur', 'South Korea') },
  { code: 'CN', flag: '🇨🇳', names: names('China', 'China') },
  { code: 'JP', flag: '🇯🇵', names: names('Japón', 'Japan') },
  { code: 'TW', flag: '🇹🇼', names: names('Taiwán', 'Taiwan') },
  { code: 'HK', flag: '🇭🇰', names: names('Hong Kong', 'Hong Kong') },
  { code: 'MO', flag: '🇲🇴', names: names('Macao', 'Macau') },
  { code: 'SG', flag: '🇸🇬', names: names('Singapur', 'Singapore') },
  { code: 'MY', flag: '🇲🇾', names: names('Malasia', 'Malaysia') },
  { code: 'TH', flag: '🇹🇭', names: names('Tailandia', 'Thailand') },
  { code: 'VN', flag: '🇻🇳', names: names('Vietnam', 'Vietnam') },
  { code: 'PH', flag: '🇵🇭', names: names('Filipinas', 'Philippines') },
  { code: 'ID', flag: '🇮🇩', names: names('Indonesia', 'Indonesia') },
  { code: 'IN', flag: '🇮🇳', names: names('India', 'India') },
  { code: 'PK', flag: '🇵🇰', names: names('Pakistán', 'Pakistan') },
  { code: 'BD', flag: '🇧🇩', names: names('Bangladés', 'Bangladesh') },
  { code: 'LK', flag: '🇱🇰', names: names('Sri Lanka', 'Sri Lanka') },
  { code: 'MN', flag: '🇲🇳', names: names('Mongolia', 'Mongolia') },

  // Oceanía
  { code: 'AU', flag: '🇦🇺', names: names('Australia', 'Australia') },
  { code: 'NZ', flag: '🇳🇿', names: names('Nueva Zelanda', 'New Zealand') },

  // Oriente Medio y África
  { code: 'SA', flag: '🇸🇦', names: names('Arabia Saudí', 'Saudi Arabia') },
  { code: 'AE', flag: '🇦🇪', names: names('Emiratos Árabes Unidos', 'United Arab Emirates') },
  { code: 'QA', flag: '🇶🇦', names: names('Catar', 'Qatar') },
  { code: 'KW', flag: '🇰🇼', names: names('Kuwait', 'Kuwait') },
  { code: 'IL', flag: '🇮🇱', names: names('Israel', 'Israel') },
  { code: 'MA', flag: '🇲🇦', names: names('Marruecos', 'Morocco') },
  { code: 'DZ', flag: '🇩🇿', names: names('Argelia', 'Algeria') },
  { code: 'TN', flag: '🇹🇳', names: names('Túnez', 'Tunisia') },
  { code: 'EG', flag: '🇪🇬', names: names('Egipto', 'Egypt') },
  { code: 'ZA', flag: '🇿🇦', names: names('Sudáfrica', 'South Africa') },
];

const COUNTRY_CODE_ALIASES: Record<string, string> = {
  USA: 'US',
  EEUU: 'US',
  UK: 'GB',
  ENG: 'GB',
  ENGLAND: 'GB',
  KOREA: 'KR',
  SOUTH_KOREA: 'KR',
  TAIWAN: 'TW',
};

const getFlagByCountryCode = (countryCode?: string) => {
  const rawCode = (countryCode || '').trim().toUpperCase();
  const normalizedCode = COUNTRY_CODE_ALIASES[rawCode] || rawCode;
  return COUNTRIES.find(country => country.code === normalizedCode)?.flag || '🏳️';
};

const getEntryFlag = (entry: Pick<LeaderboardEntry, 'countryCode' | 'flag'>) => {
  const countryFlag = getFlagByCountryCode(entry.countryCode);
  if (countryFlag !== '🏳️') return countryFlag;
  return entry.flag || '🏳️';
};

const getCountryName = (country: Country, lang: Language) => {
  return country.names[lang] || country.names.es;
};

export default function Leaderboard({
  winsCount,
  lossesCount,
  totalKills,
  totalDeaths,
  teamOvr,
  gameMode,
  lang = 'es',
}: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [coachName, setCoachName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES.find(c => c.code === 'ES') || COUNTRIES[0]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [personalPosition, setPersonalPosition] = useState<number | null>(null);
  const [totalEntries, setTotalEntries] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const t = TEXT[lang] || TEXT.es;

  const sortedCountries = [...COUNTRIES].sort((a, b) =>
    getCountryName(a, lang).localeCompare(getCountryName(b, lang))
  );

  const baselineScore = (winsCount * 1200) + (totalKills * 25) - (totalDeaths * 15) + (teamOvr * 10);
  const runScore = Math.max(0, Math.round(baselineScore * (gameMode === 'normal' ? 1.0 : 1.5)));
  const recordString = `${winsCount}W-${lossesCount}L`;

  const normalizeMode = (mode?: GameMode | string): GameMode => {
    if (mode === 'lecHard' || mode === 'lcsHard') return mode;
    return 'normal';
  };

  const getModeLabel = (mode: GameMode | string) => {
    const normalizedMode = normalizeMode(mode);
    if (normalizedMode === 'lecHard') return t.hardLec;
    if (normalizedMode === 'lcsHard') return t.hardLcs;
    return t.normal;
  };

  const getModeBadgeClass = (mode: GameMode | string) => {
    const normalizedMode = normalizeMode(mode);
    if (normalizedMode === 'lecHard') return 'bg-red-500/15 text-red-300 border border-red-500/45 shadow-[0_0_10px_rgba(239,68,68,0.14)]';
    if (normalizedMode === 'lcsHard') return 'bg-red-500/15 text-red-300 border border-red-500/45 shadow-[0_0_10px_rgba(239,68,68,0.14)]';
    return 'bg-amber-400/15 text-amber-300 border border-amber-400/45 shadow-[0_0_10px_rgba(251,191,36,0.14)]';
  };

  const loadTopLeaderboard = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}?limit=10`);
      if (!response.ok) throw new Error('No se pudo cargar el ranking');
      const data = await response.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNearbyLeaderboard = async (entryId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/around/${entryId}`);
      if (!response.ok) throw new Error('No se pudo cargar tu posición');
      const result = await response.json();

      setSubmittedEntryId(Number(result.id || entryId));
      setPersonalPosition(result.position ? Number(result.position) : null);
      setTotalEntries(result.total ? Number(result.total) : null);
      setEntries(Array.isArray(result.nearby) ? result.nearby : []);
    } catch (error) {
      console.error(error);
      setSubmitError(t.positionError);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTopLeaderboard();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachName.trim() || isSubmitting) return;

    setSubmitError('');
    setIsSubmitting(true);

    const newEntry: LeaderboardEntry = {
      name: coachName.trim(),
      countryCode: selectedCountry.code,
      flag: '',
      record: recordString,
      kills: totalKills,
      deaths: totalDeaths,
      score: runScore,
      gameMode,
      ovr: teamOvr,
      date: new Date().toISOString().split('T')[0],
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });

      if (!response.ok) throw new Error('No se pudo guardar el resultado');

      const result = await response.json();
      const insertedId = Number(result.id);

      setHasSubmitted(true);
      setCoachName('');

      if (Array.isArray(result.nearby) && result.nearby.length > 0) {
        setSubmittedEntryId(insertedId || Number(result.id) || null);
        setPersonalPosition(result.position ? Number(result.position) : null);
        setTotalEntries(result.total ? Number(result.total) : null);
        setEntries(result.nearby);
      } else if (insertedId) {
        await loadNearbyLeaderboard(insertedId);
      } else {
        throw new Error('El backend no devolvió el ID del registro guardado');
      }
    } catch (error) {
      console.error(error);
      setSubmitError(t.saveError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="global-rankings-panel" className="bg-[#091428] border border-[#c8aa6e]/25 rounded-2xl p-5 md:p-6 shadow-2xl text-left space-y-6">
      <div className="border-b border-[#c8aa6e]/15 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-black text-lg md:text-xl text-[#f0e6d2] uppercase tracking-wide flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#c8aa6e] animate-pulse" />
            <span>{t.rankingTitle}</span>
          </h3>
          <p className="text-xs text-[#a09b8c] font-mono mt-1">{t.rankingSubtitle}</p>
        </div>

        <div className="bg-[#010a13] border border-[#c8aa6e]/30 p-3 rounded-xl text-center self-start md:self-auto shadow-md">
          <span className="text-[9px] font-black text-[#c8aa6e] uppercase tracking-widest block font-mono">{t.runScore}</span>
          <span className="text-2xl font-black text-[#f0e6d2] font-mono tracking-tighter">{runScore.toLocaleString()} pts</span>
        </div>
      </div>

      {!hasSubmitted ? (
        <form onSubmit={handleSubmit} className="bg-[#010a13] border border-[#c8aa6e]/15 p-4 rounded-xl space-y-4 shadow-inner">
          <h4 className="text-[11px] font-bold text-[#c8aa6e] uppercase tracking-widest flex items-center gap-1">
            <Award className="w-4 h-4" />
            <span>{t.submitTitle}</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-[#a09b8c] font-black uppercase mb-1.5 font-mono">{t.coachName}</label>
              <input
                type="text"
                maxLength={18}
                required
                placeholder={t.coachPlaceholder}
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                className="w-full bg-[#091428] border border-[#c8aa6e]/30 focus:border-[#c8aa6e] focus:outline-none rounded-lg px-3 py-2 text-white text-xs font-semibold placeholder-[#a09b8c]/50 font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#a09b8c] font-black uppercase mb-1.5 font-mono">{t.selectFlag}</label>
              <select
                value={selectedCountry.code}
                onChange={(e) => {
                  const found = COUNTRIES.find(c => c.code === e.target.value);
                  if (found) setSelectedCountry(found);
                }}
                className="w-full bg-[#091428] border border-[#c8aa6e]/30 focus:border-[#c8aa6e] focus:outline-none rounded-lg px-3 py-2 text-white text-xs font-semibold font-sans cursor-pointer"
              >
                {sortedCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {getCountryName(country, lang)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {submitError && <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 bg-gradient-to-r from-[#c8aa6e] to-[#785a28] text-[#010a13] hover:brightness-110 active:scale-[0.99] transition-all font-black text-xs uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-1.5 font-display ${
              isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <span>💾</span>
            <span>{isSubmitting ? t.saving : t.saveResult}</span>
          </button>
        </form>
      ) : (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/35 rounded-xl text-center shadow-md animate-fade-in">
          <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest font-display flex items-center justify-center gap-2">
            <span>🎉</span>
            <span>{t.successTitle}</span>
          </p>
          <p className="text-[10px] text-[#a09b8c] font-mono mt-1">{t.successDesc}</p>

          {personalPosition && totalEntries && (
            <p className="text-[#f0e6d2] text-sm font-black mt-3 font-mono">
              {t.yourPosition}: #{personalPosition} {t.of} {totalEntries}
            </p>
          )}

          {submitError && <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mt-3">{submitError}</p>}
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-[10px] font-black text-[#a09b8c] tracking-widest uppercase font-mono">
          {hasSubmitted ? t.nearbyRanking : t.topRanking}
        </h4>

        <div className="bg-[#010a13] border border-[#c8aa6e]/15 rounded-xl overflow-hidden shadow-inner">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="bg-[#091428] border-b border-[#c8aa6e]/15 text-[#c8aa6e] text-[9px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">{t.coach}</th>
                  <th className="py-3 px-4 text-center">{t.record}</th>
                  <th className="py-3 px-4 text-center">{t.kd}</th>
                  <th className="py-3 px-4 text-center">OVR</th>
                  <th className="py-3 px-4 text-center">{t.mode}</th>
                  <th className="py-3 px-4 text-right pr-5">{t.score}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#c8aa6e]/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[#a09b8c] text-[11px]">{t.loading}</td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[#a09b8c] text-[11px]">{t.empty}</td>
                  </tr>
                ) : (
                  entries.map((entry, index) => {
                    const position = Number(entry.position || index + 1);
                    const isTop3 = position <= 3;
                    const isCurrentUser = submittedEntryId !== null && Number(entry.id) === submittedEntryId;

                    const rowBg = isCurrentUser
                      ? 'bg-emerald-500/15 border-y border-emerald-400/30'
                      : position === 1
                        ? 'bg-[#c8aa6e]/5 hover:bg-[#c8aa6e]/10'
                        : index % 2 === 0
                          ? 'bg-[#010a13] hover:bg-[#091428]/35'
                          : 'bg-[#050c14] hover:bg-[#091428]/45';

                    return (
                      <tr key={`${entry.id || entry.name}-${entry.score}-${index}`} className={`transition-all duration-155 text-[11px] ${rowBg}`}>
                        <td className="py-3 px-4 text-center font-bold">
                          {isTop3 ? (
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                              position === 1 ? 'bg-amber-400 text-[#010a13] font-black shadow-md' :
                              position === 2 ? 'bg-slate-300 text-[#010a13] font-black shadow-md' :
                              'bg-amber-600 text-[#010a13] font-black shadow-md'
                            }`}>
                              {position}
                            </span>
                          ) : (
                            <span className={isCurrentUser ? 'text-emerald-400 font-black' : 'text-[#a09b8c]'}>{position}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-bold text-[#f0e6d2] max-w-[170px] truncate">
                          <span className="mr-2" title={entry.countryCode || entry.flag}>{getEntryFlag(entry)}</span>
                          <span>{entry.name}</span>
                          {isCurrentUser && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 text-[8px] font-black uppercase">{t.you}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-semibold text-[#c8aa6e] whitespace-nowrap">{entry.record}</td>

                        <td className="py-3 px-4 text-center text-[#a09b8c]">
                          <span className="text-blue-400 font-semibold">{entry.kills}</span>
                          <span className="mx-1 text-[#a09b8c]/35">/</span>
                          <span className="text-red-400 font-semibold">{entry.deaths}</span>
                        </td>

                        <td className="py-3 px-4 text-center font-black text-rose-350/80">{entry.ovr}</td>

                        <td className="py-3 px-4 text-center text-[10px]">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${getModeBadgeClass(entry.gameMode)}`}>
                            {getModeLabel(entry.gameMode)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right pr-5 font-black text-emerald-400 tracking-tight text-xs font-sans">
                          {Number(entry.score || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
