import React, { useState, useEffect } from 'react';
import { Award, Trophy } from 'lucide-react';
import { Language } from '../locales';

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
  lang?: Language;
}

interface Country {
  code: string;
  flag: string;
  names: Record<Language, string>;
}

const API_URL = 'https://api.5vs5.pro/api/leaderboard';

const TEXT: Record<Language, {
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
  normal: string;
  saveError: string;
  you: string;
}> = {
  es: {
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
    normal: 'NORMAL',
    saveError: 'No se pudo guardar el resultado. Inténtalo de nuevo.',
    you: 'TÚ',
  },
  en: {
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
    normal: 'NORMAL',
    saveError: 'Could not save the result. Please try again.',
    you: 'YOU',
  },
  fr: {
    rankingTitle: 'CLASSEMENT MONDIAL',
    rankingSubtitle: 'AFFRONTEZ LES COACHS LES PLUS ICONIQUES DU MONDE',
    runScore: 'VOTRE SCORE DE RUN',
    submitTitle: 'ENREGISTREZ VOTRE EXPLOIT COMME COACH',
    coachName: 'NOM DU COACH',
    coachPlaceholder: 'Ex : Coach Yamato...',
    selectFlag: 'SÉLECTIONNEZ VOTRE DRAPEAU',
    saveResult: 'ENREGISTRER LE RÉSULTAT EN LIGNE',
    saving: 'ENREGISTREMENT...',
    successTitle: 'RÉSULTAT ENREGISTRÉ AVEC SUCCÈS !',
    successDesc: 'Votre résultat est maintenant inscrit au classement mondial.',
    topRanking: 'TOP 10 MONDIAL',
    nearbyRanking: 'VOTRE POSITION AU CLASSEMENT',
    yourPosition: 'Votre position',
    of: 'sur',
    coach: 'COACH',
    record: 'RECORD',
    kd: 'K/D SIMULATION',
    mode: 'MODE',
    score: 'SCORE',
    loading: 'Chargement du classement mondial...',
    empty: 'Aucun résultat enregistré pour le moment.',
    hard: 'DIFFICILE',
    normal: 'NORMAL',
    saveError: 'Impossible d’enregistrer le résultat. Réessayez.',
    you: 'VOUS',
  },
  de: {
    rankingTitle: 'WELTRANKING',
    rankingSubtitle: 'TRITT GEGEN DIE IKONISCHSTEN COACHES DER WELT AN',
    runScore: 'DEIN RUN-SCORE',
    submitTitle: 'TRAGE DEINEN ERFOLG ALS COACH EIN',
    coachName: 'COACH-NAME',
    coachPlaceholder: 'z. B. Coach Yamato...',
    selectFlag: 'WÄHLE DEINE FLAGGE',
    saveResult: 'ERGEBNIS ONLINE SPEICHERN',
    saving: 'SPEICHERT...',
    successTitle: 'ERGEBNIS ERFOLGREICH GESPEICHERT!',
    successDesc: 'Dein Ergebnis steht nun im Weltranking.',
    topRanking: 'GLOBAL TOP 10',
    nearbyRanking: 'DEINE POSITION IM RANKING',
    yourPosition: 'Deine Position',
    of: 'von',
    coach: 'COACH',
    record: 'REKORD',
    kd: 'SIMULATION K/D',
    mode: 'MODUS',
    score: 'PUNKTZAHL',
    loading: 'Weltrangliste wird geladen...',
    empty: 'Noch keine Ergebnisse gespeichert.',
    hard: 'SCHWER',
    normal: 'NORMAL',
    saveError: 'Das Ergebnis konnte nicht gespeichert werden. Bitte erneut versuchen.',
    you: 'DU',
  },
  it: {
    rankingTitle: 'CLASSIFICA MONDIALE',
    rankingSubtitle: 'COMPETI CONTRO I COACH PIÙ ICONICI DEL MONDO',
    runScore: 'IL TUO PUNTEGGIO RUN',
    submitTitle: 'REGISTRA IL TUO RISULTATO COME COACH',
    coachName: 'NOME DEL COACH',
    coachPlaceholder: 'Es: Coach Yamato...',
    selectFlag: 'SELEZIONA LA TUA BANDIERA',
    saveResult: 'SALVA RISULTATO ONLINE',
    saving: 'SALVATAGGIO...',
    successTitle: 'RISULTATO SALVATO CORRETTAMENTE!',
    successDesc: 'Il tuo risultato è ora nella classifica mondiale.',
    topRanking: 'TOP 10 GLOBALE',
    nearbyRanking: 'LA TUA POSIZIONE IN CLASSIFICA',
    yourPosition: 'La tua posizione',
    of: 'di',
    coach: 'COACH',
    record: 'RECORD',
    kd: 'K/D SIMULAZIONE',
    mode: 'MODALITÀ',
    score: 'PUNTEGGIO',
    loading: 'Caricamento classifica globale...',
    empty: 'Non ci sono ancora risultati salvati.',
    hard: 'DIFFICILE',
    normal: 'NORMALE',
    saveError: 'Impossibile salvare il risultato. Riprova.',
    you: 'TU',
  },
  pt: {
    rankingTitle: 'RANKING MUNDIAL',
    rankingSubtitle: 'COMPETE CONTRA OS TREINADORES MAIS ICÓNICOS DO MUNDO',
    runScore: 'A TUA PONTUAÇÃO DA RUN',
    submitTitle: 'REGISTA O TEU FEITO COMO TREINADOR',
    coachName: 'NOME DO TREINADOR',
    coachPlaceholder: 'Ex: Coach Yamato...',
    selectFlag: 'SELECIONA A TUA BANDEIRA',
    saveResult: 'GUARDAR RESULTADO ONLINE',
    saving: 'A GUARDAR...',
    successTitle: 'RESULTADO GUARDADO COM SUCESSO!',
    successDesc: 'O teu resultado já está no ranking mundial.',
    topRanking: 'TOP 10 GLOBAL',
    nearbyRanking: 'A TUA POSIÇÃO NO RANKING',
    yourPosition: 'A tua posição',
    of: 'de',
    coach: 'TREINADOR',
    record: 'RECORDE',
    kd: 'K/D SIMULAÇÃO',
    mode: 'MODO',
    score: 'PONTUAÇÃO',
    loading: 'A carregar ranking global...',
    empty: 'Ainda não há resultados guardados.',
    hard: 'DIFÍCIL',
    normal: 'NORMAL',
    saveError: 'Não foi possível guardar o resultado. Tenta novamente.',
    you: 'TU',
  },
  ru: {
    rankingTitle: 'МИРОВОЙ РЕЙТИНГ',
    rankingSubtitle: 'СРАЗИТЕСЬ С САМЫМИ ЛЕГЕНДАРНЫМИ ТРЕНЕРАМИ МИРА',
    runScore: 'ВАШ СЧЁТ ЗА ЗАБЕГ',
    submitTitle: 'ЗАПИШИТЕ СВОЙ РЕЗУЛЬТАТ КАК ТРЕНЕР',
    coachName: 'ИМЯ ТРЕНЕРА',
    coachPlaceholder: 'Напр.: Coach Yamato...',
    selectFlag: 'ВЫБЕРИТЕ ФЛАГ',
    saveResult: 'СОХРАНИТЬ РЕЗУЛЬТАТ ОНЛАЙН',
    saving: 'СОХРАНЕНИЕ...',
    successTitle: 'РЕЗУЛЬТАТ УСПЕШНО СОХРАНЁН!',
    successDesc: 'Ваш результат добавлен в мировой рейтинг.',
    topRanking: 'ТОП-10 МИРА',
    nearbyRanking: 'ВАША ПОЗИЦИЯ В РЕЙТИНГЕ',
    yourPosition: 'Ваша позиция',
    of: 'из',
    coach: 'ТРЕНЕР',
    record: 'РЕКОРД',
    kd: 'K/D СИМУЛЯЦИИ',
    mode: 'РЕЖИМ',
    score: 'СЧЁТ',
    loading: 'Загрузка мирового рейтинга...',
    empty: 'Пока нет сохранённых результатов.',
    hard: 'СЛОЖНЫЙ',
    normal: 'ОБЫЧНЫЙ',
    saveError: 'Не удалось сохранить результат. Попробуйте ещё раз.',
    you: 'ВЫ',
  },
  ko: {
    rankingTitle: '월드 랭킹',
    rankingSubtitle: '세계에서 가장 상징적인 코치들과 경쟁하세요',
    runScore: '나의 런 점수',
    submitTitle: '헤드 코치 기록 등록',
    coachName: '코치 이름',
    coachPlaceholder: '예: Coach Yamato...',
    selectFlag: '국기 선택',
    saveResult: '온라인 결과 저장',
    saving: '저장 중...',
    successTitle: '결과가 성공적으로 저장되었습니다!',
    successDesc: '당신의 기록이 글로벌 랭킹에 등록되었습니다.',
    topRanking: '글로벌 TOP 10',
    nearbyRanking: '나의 랭킹 위치',
    yourPosition: '나의 위치',
    of: '/',
    coach: '코치',
    record: '기록',
    kd: '시뮬레이션 K/D',
    mode: '모드',
    score: '점수',
    loading: '글로벌 랭킹 불러오는 중...',
    empty: '아직 저장된 결과가 없습니다.',
    hard: '어려움',
    normal: '일반',
    saveError: '결과를 저장할 수 없습니다. 다시 시도해 주세요.',
    you: '나',
  },
  zh: {
    rankingTitle: '世界排名',
    rankingSubtitle: '与世界上最具代表性的教练竞争',
    runScore: '你的挑战分数',
    submitTitle: '登记你的教练战绩',
    coachName: '教练名称',
    coachPlaceholder: '例如：Coach Yamato...',
    selectFlag: '选择你的旗帜',
    saveResult: '在线保存结果',
    saving: '保存中...',
    successTitle: '结果已成功保存！',
    successDesc: '你的结果已进入世界排名。',
    topRanking: '全球前 10',
    nearbyRanking: '你的排名位置',
    yourPosition: '你的排名',
    of: '/',
    coach: '教练',
    record: '战绩',
    kd: '模拟 K/D',
    mode: '模式',
    score: '分数',
    loading: '正在加载全球排名...',
    empty: '目前还没有保存的结果。',
    hard: '困难',
    normal: '普通',
    saveError: '无法保存结果。请重试。',
    you: '你',
  },
};

const COUNTRIES: Country[] = [
  { code: 'ES', flag: '🇪🇸', names: { es: 'España', en: 'Spain', fr: 'Espagne', de: 'Spanien', it: 'Spagna', pt: 'Espanha', ru: 'Испания', ko: '스페인', zh: '西班牙' } },
  { code: 'DE', flag: '🇩🇪', names: { es: 'Alemania', en: 'Germany', fr: 'Allemagne', de: 'Deutschland', it: 'Germania', pt: 'Alemanha', ru: 'Германия', ko: '독일', zh: '德国' } },
  { code: 'FR', flag: '🇫🇷', names: { es: 'Francia', en: 'France', fr: 'France', de: 'Frankreich', it: 'Francia', pt: 'França', ru: 'Франция', ko: '프랑스', zh: '法国' } },
  { code: 'PT', flag: '🇵🇹', names: { es: 'Portugal', en: 'Portugal', fr: 'Portugal', de: 'Portugal', it: 'Portogallo', pt: 'Portugal', ru: 'Португалия', ko: '포르투갈', zh: '葡萄牙' } },
  { code: 'IT', flag: '🇮🇹', names: { es: 'Italia', en: 'Italy', fr: 'Italie', de: 'Italien', it: 'Italia', pt: 'Itália', ru: 'Италия', ko: '이탈리아', zh: '意大利' } },
  { code: 'GB', flag: '🇬🇧', names: { es: 'Reino Unido', en: 'United Kingdom', fr: 'Royaume-Uni', de: 'Vereinigtes Königreich', it: 'Regno Unito', pt: 'Reino Unido', ru: 'Великобритания', ko: '영국', zh: '英国' } },
  { code: 'NL', flag: '🇳🇱', names: { es: 'Países Bajos', en: 'Netherlands', fr: 'Pays-Bas', de: 'Niederlande', it: 'Paesi Bassi', pt: 'Países Baixos', ru: 'Нидерланды', ko: '네덜란드', zh: '荷兰' } },
  { code: 'SE', flag: '🇸🇪', names: { es: 'Suecia', en: 'Sweden', fr: 'Suède', de: 'Schweden', it: 'Svezia', pt: 'Suécia', ru: 'Швеция', ko: '스웨덴', zh: '瑞典' } },
  { code: 'DK', flag: '🇩🇰', names: { es: 'Dinamarca', en: 'Denmark', fr: 'Danemark', de: 'Dänemark', it: 'Danimarca', pt: 'Dinamarca', ru: 'Дания', ko: '덴마크', zh: '丹麦' } },
  { code: 'NO', flag: '🇳🇴', names: { es: 'Noruega', en: 'Norway', fr: 'Norvège', de: 'Norwegen', it: 'Norvegia', pt: 'Noruega', ru: 'Норвегия', ko: '노르웨이', zh: '挪威' } },
  { code: 'FI', flag: '🇫🇮', names: { es: 'Finlandia', en: 'Finland', fr: 'Finlande', de: 'Finnland', it: 'Finlandia', pt: 'Finlândia', ru: 'Финляндия', ko: '핀란드', zh: '芬兰' } },
  { code: 'PL', flag: '🇵🇱', names: { es: 'Polonia', en: 'Poland', fr: 'Pologne', de: 'Polen', it: 'Polonia', pt: 'Polónia', ru: 'Польша', ko: '폴란드', zh: '波兰' } },
  { code: 'BE', flag: '🇧🇪', names: { es: 'Bélgica', en: 'Belgium', fr: 'Belgique', de: 'Belgien', it: 'Belgio', pt: 'Bélgica', ru: 'Бельгия', ko: '벨기에', zh: '比利时' } },
  { code: 'CH', flag: '🇨🇭', names: { es: 'Suiza', en: 'Switzerland', fr: 'Suisse', de: 'Schweiz', it: 'Svizzera', pt: 'Suíça', ru: 'Швейцария', ko: '스위스', zh: '瑞士' } },
  { code: 'AT', flag: '🇦🇹', names: { es: 'Austria', en: 'Austria', fr: 'Autriche', de: 'Österreich', it: 'Austria', pt: 'Áustria', ru: 'Австрия', ko: '오스트리아', zh: '奥地利' } },
  { code: 'IE', flag: '🇮🇪', names: { es: 'Irlanda', en: 'Ireland', fr: 'Irlande', de: 'Irland', it: 'Irlanda', pt: 'Irlanda', ru: 'Ирландия', ko: '아일랜드', zh: '爱尔兰' } },
  { code: 'CZ', flag: '🇨🇿', names: { es: 'Chequia', en: 'Czechia', fr: 'Tchéquie', de: 'Tschechien', it: 'Cechia', pt: 'Chéquia', ru: 'Чехия', ko: '체코', zh: '捷克' } },
  { code: 'GR', flag: '🇬🇷', names: { es: 'Grecia', en: 'Greece', fr: 'Grèce', de: 'Griechenland', it: 'Grecia', pt: 'Grécia', ru: 'Греция', ko: '그리스', zh: '希腊' } },
  { code: 'RO', flag: '🇷🇴', names: { es: 'Rumanía', en: 'Romania', fr: 'Roumanie', de: 'Rumänien', it: 'Romania', pt: 'Roménia', ru: 'Румыния', ko: '루마니아', zh: '罗马尼亚' } },
  { code: 'BG', flag: '🇧🇬', names: { es: 'Bulgaria', en: 'Bulgaria', fr: 'Bulgarie', de: 'Bulgarien', it: 'Bulgaria', pt: 'Bulgária', ru: 'Болгария', ko: '불가리아', zh: '保加利亚' } },
  { code: 'HR', flag: '🇭🇷', names: { es: 'Croacia', en: 'Croatia', fr: 'Croatie', de: 'Kroatien', it: 'Croazia', pt: 'Croácia', ru: 'Хорватия', ko: '크로아티아', zh: '克罗地亚' } },
  { code: 'RS', flag: '🇷🇸', names: { es: 'Serbia', en: 'Serbia', fr: 'Serbie', de: 'Serbien', it: 'Serbia', pt: 'Sérvia', ru: 'Сербия', ko: '세르비아', zh: '塞尔维亚' } },
  { code: 'UA', flag: '🇺🇦', names: { es: 'Ucrania', en: 'Ukraine', fr: 'Ukraine', de: 'Ukraine', it: 'Ucraina', pt: 'Ucrânia', ru: 'Украина', ko: '우크라이나', zh: '乌克兰' } },
  { code: 'TR', flag: '🇹🇷', names: { es: 'Turquía', en: 'Turkey', fr: 'Turquie', de: 'Türkei', it: 'Turchia', pt: 'Turquia', ru: 'Турция', ko: '튀르키예', zh: '土耳其' } },
];

const getFlagByCountryCode = (countryCode?: string) => {
  const normalizedCode = (countryCode || '').trim().toUpperCase();
  return COUNTRIES.find(country => country.code === normalizedCode)?.flag || '🏳️';
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
  const runScore = Math.max(0, Math.round(baselineScore * (gameMode === 'lecHard' ? 1.5 : 1.0)));
  const recordString = `${winsCount}W-${lossesCount}L`;

  const loadTopLeaderboard = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}?limit=10`);

      if (!response.ok) {
        throw new Error('No se pudo cargar el ranking');
      }

      const data = await response.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
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

      if (!response.ok) {
        throw new Error('No se pudo guardar el resultado');
      }

      const result = await response.json();

      setHasSubmitted(true);
      setCoachName('');

      setSubmittedEntryId(result.id || null);
      setPersonalPosition(result.position || null);
      setTotalEntries(result.total || null);

      if (Array.isArray(result.nearby)) {
        setEntries(result.nearby);
      } else {
        await loadTopLeaderboard();
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
          <p className="text-xs text-[#a09b8c] font-mono mt-1">
            {t.rankingSubtitle}
          </p>
        </div>

        <div className="bg-[#010a13] border border-[#c8aa6e]/30 p-3 rounded-xl text-center self-start md:self-auto shadow-md">
          <span className="text-[9px] font-black text-[#c8aa6e] uppercase tracking-widest block font-mono">
            {t.runScore}
          </span>
          <span className="text-2xl font-black text-[#f0e6d2] font-mono tracking-tighter">
            {runScore.toLocaleString()} pts
          </span>
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
              <label className="block text-[10px] text-[#a09b8c] font-black uppercase mb-1.5 font-mono">
                {t.coachName}
              </label>
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
              <label className="block text-[10px] text-[#a09b8c] font-black uppercase mb-1.5 font-mono">
                {t.selectFlag}
              </label>
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

          {submitError && (
            <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">
              {submitError}
            </p>
          )}

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
          <p className="text-[10px] text-[#a09b8c] font-mono mt-1">
            {t.successDesc}
          </p>

          {personalPosition && totalEntries && (
            <p className="text-[#f0e6d2] text-sm font-black mt-3 font-mono">
              {t.yourPosition}: #{personalPosition} {t.of} {totalEntries}
            </p>
          )}
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
                    <td colSpan={7} className="py-6 text-center text-[#a09b8c] text-[11px]">
                      {t.loading}
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[#a09b8c] text-[11px]">
                      {t.empty}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry, index) => {
                    const position = entry.position || index + 1;
                    const isTop3 = position <= 3;
                    const isCurrentUser = submittedEntryId !== null && entry.id === submittedEntryId;

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
                            <span className={isCurrentUser ? 'text-emerald-400 font-black' : 'text-[#a09b8c]'}>
                              {position}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-bold text-[#f0e6d2] max-w-[170px] truncate">
                          <span className="mr-2" title={entry.countryCode}>
                            {getFlagByCountryCode(entry.countryCode)}
                          </span>
                          <span>{entry.name}</span>
                          {isCurrentUser && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 text-[8px] font-black uppercase">
                              {t.you}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-semibold text-[#c8aa6e] whitespace-nowrap">
                          {entry.record}
                        </td>

                        <td className="py-3 px-4 text-center text-[#a09b8c]">
                          <span className="text-blue-400 font-semibold">{entry.kills}</span>
                          <span className="mx-1 text-[#a09b8c]/35">/</span>
                          <span className="text-red-400 font-semibold">{entry.deaths}</span>
                        </td>

                        <td className="py-3 px-4 text-center font-black text-rose-350/80">
                          {entry.ovr}
                        </td>

                        <td className="py-3 px-4 text-center text-[10px]">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            entry.gameMode === 'lecHard'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {entry.gameMode === 'lecHard' ? t.hard : t.normal}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right pr-5 font-black text-emerald-400 tracking-tight text-xs font-sans">
                          {entry.score.toLocaleString()}
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
