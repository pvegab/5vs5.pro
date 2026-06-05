import React, { useState, useEffect } from 'react';
import { Award, Trophy, Compass, Flag } from 'lucide-react';

interface LeaderboardEntry {
  name: string;
  countryCode: string;
  flag: string;
  record: string;
  kills: number;
  deaths: number;
  score: number;
  gameMode: 'normal' | 'lecHard';
  ovr: number;
  date: string;
}

interface LeaderboardProps {
  winsCount: number;
  lossesCount: number;
  totalKills: number;
  totalDeaths: number;
  teamOvr: number;
  gameMode: 'normal' | 'lecHard';
  lang?: 'es' | 'en';
}

const COUNTRIES = [
  { code: 'ES', nameEs: 'España', nameEn: 'Spain', flag: '🇪🇸' },
  { code: 'KR', nameEs: 'Corea del Sur', nameEn: 'South Korea', flag: '🇰🇷' },
  { code: 'CN', nameEs: 'China', nameEn: 'China', flag: '🇨🇳' },
  { code: 'US', nameEs: 'Estados Unidos', nameEn: 'United States', flag: '🇺🇸' },
  { code: 'FR', nameEs: 'Francia', nameEn: 'France', flag: '🇫🇷' },
  { code: 'DE', nameEs: 'Alemania', nameEn: 'Germany', flag: '🇩🇪' },
  { code: 'IT', nameEs: 'Italia', nameEn: 'Italy', flag: '🇮🇹' },
  { code: 'GB', nameEs: 'Reino Unido', nameEn: 'United Kingdom', flag: '🇬🇧' },
  { code: 'SE', nameEs: 'Suecia', nameEn: 'Sweden', flag: '🇸🇪' },
  { code: 'PT', nameEs: 'Portugal', nameEn: 'Portugal', flag: '🇵🇹' },
  { code: 'CA', nameEs: 'Canadá', nameEn: 'Canada', flag: '🇨🇦' },
  { code: 'BR', nameEs: 'Brasil', nameEn: 'Brazil', flag: '🇧🇷' },
  { code: 'VN', nameEs: 'Vietnam', nameEn: 'Vietnam', flag: '🇻🇳' },
  { code: 'JP', nameEs: 'Japón', nameEn: 'Japan', flag: '🇯🇵' },
  { code: 'MX', nameEs: 'México', nameEn: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', nameEs: 'Argentina', nameEn: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', nameEs: 'Chile', nameEn: 'Chile', flag: '🇨🇱' }
].sort((a, b) => a.nameEs.localeCompare(b.nameEs));

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { name: 'KkOma', countryCode: 'KR', flag: '🇰🇷', record: '6W-0L', kills: 142, deaths: 48, score: 9280, gameMode: 'lecHard', ovr: 91, date: '2026-05-18' },
  { name: 'Dylan Falco', countryCode: 'CA', flag: '🇨🇦', record: '5W-1L', kills: 118, deaths: 54, score: 7120, gameMode: 'lecHard', ovr: 88, date: '2026-05-20' },
  { name: 'YamatoCannon', countryCode: 'SE', flag: '🇸🇪', record: '5W-1L', kills: 110, deaths: 62, score: 6250, gameMode: 'normal', ovr: 86, date: '2026-05-22' },
  { name: 'Melzhet', countryCode: 'ES', flag: '🇪🇸', record: '4W-1L', kills: 92, deaths: 55, score: 5540, gameMode: 'lecHard', ovr: 85, date: '2026-05-25' },
  { name: 'Peter Dun', countryCode: 'GB', flag: '🇬🇧', record: '3W-1L', kills: 68, deaths: 42, score: 4120, gameMode: 'normal', ovr: 81, date: '2026-05-28' }
];

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
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Calculate dynamic run score
  // Formula: wins*1000 + kills*25 - deaths*15 + OVR*10. Hard mode gets 1.5x scaling
  const baselineScore = (winsCount * 1200) + (totalKills * 25) - (totalDeaths * 15) + (teamOvr * 10);
  const runScore = Math.max(0, Math.round(baselineScore * (gameMode === 'lecHard' ? 1.5 : 1.0)));

  const recordString = `${winsCount}W-${lossesCount}L`;

  useEffect(() => {
    const raw = localStorage.getItem('lol_coach_draft_leaderboard_v1');
    if (raw) {
      try {
        setEntries(JSON.parse(raw));
      } catch (e) {
        setEntries(DEFAULT_LEADERBOARD);
      }
    } else {
      localStorage.setItem('lol_coach_draft_leaderboard_v1', JSON.stringify(DEFAULT_LEADERBOARD));
      setEntries(DEFAULT_LEADERBOARD);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachName.trim()) return;

    const newEntry: LeaderboardEntry = {
      name: coachName.trim(),
      countryCode: selectedCountry.code,
      flag: selectedCountry.flag,
      record: recordString,
      kills: totalKills,
      deaths: totalDeaths,
      score: runScore,
      gameMode,
      ovr: teamOvr,
      date: new Date().toISOString().split('T')[0],
    };

    const updated = [...entries, newEntry].sort((a, b) => b.score - a.score);
    localStorage.setItem('lol_coach_draft_leaderboard_v1', JSON.stringify(updated));
    setEntries(updated);
    setHasSubmitted(true);
  };

  const isEs = lang === 'es';

  return (
    <div id="global-rankings-panel" className="bg-[#091428] border border-[#c8aa6e]/25 rounded-2xl p-5 md:p-6 shadow-2xl text-left space-y-6">
      <div className="border-b border-[#c8aa6e]/15 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-black text-lg md:text-xl text-[#f0e6d2] uppercase tracking-wide flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#c8aa6e] animate-pulse" />
            <span>{isEs ? 'RANKING ESUPERMUNDIAL' : 'GLOBAL COACH LEADERBOARD'}</span>
          </h3>
          <p className="text-xs text-[#a09b8c] font-mono mt-1">
            {isEs ? 'COMPITE CON LOS ENTRENADORES MÁS ICONICOS DEL MUNDO' : 'COMPETE AGAINST THE MOST ICONIC COACHES'}
          </p>
        </div>

        <div className="bg-[#010a13] border border-[#c8aa6e]/30 p-3 rounded-xl text-center self-start md:self-auto shadow-md">
          <span className="text-[9px] font-black text-[#c8aa6e] uppercase tracking-widest block font-mono">
            {isEs ? 'TU PUNTUACIÓN DE RUN' : 'YOUR RUN SCORE'}
          </span>
          <span className="text-2xl font-black text-[#f0e6d2] font-mono tracking-tighter">
            {runScore.toLocaleString()} pts
          </span>
        </div>
      </div>

      {/* Submission Form (Only if they haven't submitted yet in this session) */}
      {!hasSubmitted ? (
        <form onSubmit={handleSubmit} className="bg-[#010a13] border border-[#c8aa6e]/15 p-4 rounded-xl space-y-4 shadow-inner">
          <h4 className="text-[11px] font-bold text-[#c8aa6e] uppercase tracking-widest flex items-center gap-1">
            <Award className="w-4 h-4" />
            <span>{isEs ? 'REGISTRA TU LOGRO COMPITIENDO COMO ENTRENADOR' : 'SUBMIT YOUR RECORD AS HEAD COACH'}</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-[#a09b8c] font-black uppercase mb-1.5 font-mono">
                {isEs ? 'NOMBRE DEL ENTRENADOR' : 'COACH PROFILE NAME'}
              </label>
              <input
                type="text"
                maxLength={18}
                required
                placeholder={isEs ? 'Ej: Coach Melzhet, KkOma...' : 'E.g. Coach Yamato...'}
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                className="w-full bg-[#091428] border border-[#c8aa6e]/30 focus:border-[#c8aa6e] focus:outline-none rounded-lg px-3 py-2 text-white text-xs font-semibold placeholder-[#a09b8c]/50 font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#a09b8c] font-black uppercase mb-1.5 font-mono">
                {isEs ? 'SELECCIONA TU BANDERA' : 'SELECT REGION / FLAG'}
              </label>
              <select
                value={selectedCountry.code}
                onChange={(e) => {
                  const found = COUNTRIES.find(c => c.code === e.target.value);
                  if (found) setSelectedCountry(found);
                }}
                className="w-full bg-[#091428] border border-[#c8aa6e]/30 focus:border-[#c8aa6e] focus:outline-none rounded-lg px-3 py-2 text-white text-xs font-semibold font-sans cursor-pointer"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {isEs ? country.nameEs : country.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-[#c8aa6e] to-[#785a28] text-[#010a13] hover:brightness-110 active:scale-[0.99] transition-all font-black text-xs uppercase tracking-widest rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5 font-display"
          >
            <span>💾</span>
            <span>{isEs ? 'GUARDAR RESULTADOS EN LÍNEA' : 'REGISTER TO GLOBAL STANDINGS'}</span>
          </button>
        </form>
      ) : (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/35 rounded-xl text-center shadow-md animate-fade-in">
          <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest font-display flex items-center justify-center gap-2">
            <span>🎉</span>
            <span>{isEs ? '¡REGISTRO COMPLETADO CORRECTAMENTE!' : 'STANDINGS CO-ORDINATE SYSTEM SYNCHRONIZED!'}</span>
          </p>
          <p className="text-[10px] text-[#a09b8c] font-mono mt-1">
            {isEs ? 'Tu resultado ya está fijado en el muro de honor de entrenadores.' : 'Your statistics are now locked in the Coach Hall of Fame.'}
          </p>
        </div>
      )}

      {/* High contrast rankings leaderboard table */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-black text-[#a09b8c] tracking-widest uppercase font-mono">
          {isEs ? 'MURO DE HONOR DE ENTRENADORES' : 'COACH HONORARY ROSTER'}
        </h4>

        <div className="bg-[#010a13] border border-[#c8aa6e]/15 rounded-xl overflow-hidden shadow-inner">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="bg-[#091428] border-b border-[#c8aa6e]/15 text-[#c8aa6e] text-[9px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">{isEs ? 'ENTRENADOR' : 'COACH'}</th>
                  <th className="py-3 px-4 text-center">{isEs ? 'RÉCORD' : 'RECORD'}</th>
                  <th className="py-3 px-4 text-center">{isEs ? 'K/D PARTIDAS' : 'SIMULATION K/D'}</th>
                  <th className="py-3 px-4 text-center">OVR</th>
                  <th className="py-3 px-4 text-center">{isEs ? 'MODO' : 'MODE'}</th>
                  <th className="py-3 px-4 text-right pr-5">{isEs ? 'PUNTAJE' : 'SCORE'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c8aa6e]/5">
                {entries.map((entry, index) => {
                  const isTop3 = index < 3;
                  const rowBg = index === 0 
                    ? 'bg-[#c8aa6e]/5 hover:bg-[#c8aa6e]/10' 
                    : index % 2 === 0 
                      ? 'bg-[#010a13] hover:bg-[#091428]/35' 
                      : 'bg-[#050c14] hover:bg-[#091428]/45';

                  return (
                    <tr key={index} className={`transition-all duration-155 text-[11px] ${rowBg}`}>
                      {/* Rank column */}
                      <td className="py-3 px-4 text-center font-bold">
                        {isTop3 ? (
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                            index === 0 ? 'bg-amber-400 text-[#010a13] font-black shadow-md' :
                            index === 1 ? 'bg-slate-300 text-[#010a13] font-black shadow-md' :
                            'bg-amber-600 text-[#010a13] font-black shadow-md'
                          }`}>
                            {index + 1}
                          </span>
                        ) : (
                          <span className="text-[#a09b8c]">{index + 1}</span>
                        )}
                      </td>

                      {/* Coach Name & Country Flag */}
                      <td className="py-3 px-4 font-bold text-[#f0e6d2] max-w-[150px] truncate">
                        <span className="mr-2" title={entry.countryCode}>{entry.flag}</span>
                        <span>{entry.name}</span>
                      </td>

                      {/* Record */}
                      <td className="py-3 px-4 text-center font-semibold text-[#c8aa6e] whitespace-nowrap">
                        {entry.record}
                      </td>

                      {/* K/D stats */}
                      <td className="py-3 px-4 text-center text-[#a09b8c]">
                        <span className="text-blue-400 font-semibold">{entry.kills}</span>
                        <span className="mx-1 text-[#a09b8c]/35">/</span>
                        <span className="text-red-400 font-semibold">{entry.deaths}</span>
                      </td>

                      {/* Team OVR */}
                      <td className="py-3 px-4 text-center font-black text-rose-350/80">
                        {entry.ovr}
                      </td>

                      {/* Difficulty settings */}
                      <td className="py-3 px-4 text-center text-[10px]">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          entry.gameMode === 'lecHard' 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {entry.gameMode === 'lecHard' ? (isEs ? 'DIFÍCIL' : 'HARD') : 'NORMAL'}
                        </span>
                      </td>

                      {/* Calculated Score */}
                      <td className="py-3 px-4 text-right pr-5 font-black text-emerald-400 tracking-tight text-xs font-sans">
                        {entry.score.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
