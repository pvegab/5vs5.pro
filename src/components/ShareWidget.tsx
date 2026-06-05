import React, { useState, useEffect, useRef } from 'react';
import { TeamDraft, SelectedSlot, Region } from '../types';
import { Share2, Copy, Check, Download, MessageSquare } from 'lucide-react';
import { Language, getLocalizedRoundName, getLocalizedShortRoundName } from '../locales';

interface MatchHistoryItem {
  roundIndex: number;
  roundName: string;
  opponentName: string;
  opponentYear: number;
  opponentRegion: string;
  result: 'W' | 'L';
}

interface ShareWidgetProps {
  draft: TeamDraft;
  teamScore: number;
  synergyDetails: {
    regionBonus: number;
    teamBonus: number;
    yearBonus: number;
    champBonus?: number;
    coachBonus?: number;
    activeSynergies?: string[];
    total: number;
  };
  matchHistory: MatchHistoryItem[];
  status: 'victory' | 'gameover';
  roundIndex: number;
  lang?: Language;
}

const SHARE_LOCALES: Record<Language, {
  shareRecord: string;
  shareSub: string;
  method1: string;
  shareWA: string;
  method2: string;
  copyBtn: string;
  copied: string;
  method3: string;
  passDesc: string;
  downloadPNG: string;
  vacant: string;
  branding: string;
  victoryStat: string;
  eliminated: string;
  headerChallenge: string;
  summaryTitle: string;
  generalVal: string;
  synChemistry: string;
  freePlay: string;
  sysShare: string;
}> = {
  es: {
    shareRecord: 'Compartir Roster y Récord',
    shareSub: 'Presume tu squad del mundial con un espectacular pase digital o un texto directo.',
    method1: 'Método 1: Compartir Directo por WhatsApp',
    shareWA: 'Compartir en WhatsApp',
    method2: 'Método 2: Copiar Resumen de Roster',
    copyBtn: 'Copiar Texto completo',
    copied: '¡Copiado!',
    method3: 'Método 3: Descargar Pase Digital PNG',
    passDesc: 'Tarjeta virtual de alta resolución para adjuntar en tus chats o estados.',
    downloadPNG: 'Descargar Imagen PNG original',
    vacant: 'Sin Seleccionar',
    branding: 'WORLDS CHALLENGE • DESARROLLADO EN ALTO RENDIMIENTO',
    victoryStat: 'INVÍCTO 6-0 (Campeón del Mundo 🏆)',
    eliminated: 'Eliminado',
    headerChallenge: '🏆 LIGA DE INVOCADORES - CHALLENGE 🏆',
    summaryTitle: '🔮 ¿Puedes vencer mi récord? Mi Squad finalizó: ',
    generalVal: 'VALORACIÓN GENERAL',
    synChemistry: 'QUÍMICA DE SINERGIAS',
    freePlay: 'Prueba armar tu propio roster histórico y juega gratis aquí: ',
    sysShare: 'Compartir usando Menú del Sistema móvil'
  },
  en: {
    shareRecord: 'Share Roster & Match Record',
    shareSub: 'Show off your worlds squad with a custom digital pass or direct text summary.',
    method1: 'Method 1: Share Directly on WhatsApp',
    shareWA: 'Share on WhatsApp',
    method2: 'Method 2: Copy Roster Summary',
    copyBtn: 'Copy Full Text',
    copied: 'Copied!',
    method3: 'Method 3: Download Digital PASS PNG',
    passDesc: 'High resolution virtual card to attach to chats or social feeds.',
    downloadPNG: 'Download Original PNG Image',
    vacant: 'Vacant / Empty',
    branding: 'WORLDS CHALLENGE • ESPORTS TEAM BUILDING RUN',
    victoryStat: 'UNDEFEATED 6-0 (World Champion 🏆)',
    eliminated: 'Eliminated',
    headerChallenge: '🏆 SUMMONERS LEAGUE - CHALLENGE 🏆',
    summaryTitle: '🔮 Can you beat my record? My squad finished: ',
    generalVal: 'OVERALL SCORE',
    synChemistry: 'SQUAD CHEMISTRY',
    freePlay: 'Draft your own historic dream roster and play for free here: ',
    sysShare: 'Share via System Dialog Menu'
  },
  fr: {
    shareRecord: 'Partager le Roster & le Record',
    shareSub: 'Affichez votre équipe mondiale avec un pass numérique ou un texte résumé.',
    method1: 'Méthode 1: Partager sur WhatsApp',
    shareWA: 'Partager sur WhatsApp',
    method2: 'Méthode 2: Copier le Résumé de l\'Équipe',
    copyBtn: 'Copier le Texte Complet',
    copied: 'Copié !',
    method3: 'Méthode 3: Télécharger le Pass PNG',
    passDesc: 'Carte virtuelle haute résolution pour vos réseaux et chats.',
    downloadPNG: 'Télécharger l\'Image PNG',
    vacant: 'Non sélectionné',
    branding: 'WORLDS CHALLENGE • EDITION HAUTE PERFORMANCE',
    victoryStat: 'INVAINCU 6-0 (Champion du Monde 🏆)',
    eliminated: 'Éliminé',
    headerChallenge: '🏆 LIGUE DES INVOCATEURS - CHALLENGE 🏆',
    summaryTitle: '🔮 Peux-tu battre mon record ? Mon équipe a fini : ',
    generalVal: 'NOTE GLOBALE',
    synChemistry: 'CHIMIE DE L\'ÉQUIPE',
    freePlay: 'Préparez votre propre équipe historique gratuitement ici : ',
    sysShare: 'Partager via le menu système'
  },
  de: {
    shareRecord: 'Kader & Rekord teilen',
    shareSub: 'Präsentiere dein Weltmeister-Team mit einem digitalen Pass oder Text.',
    method1: 'Methode 1: Direkt auf WhatsApp teilen',
    shareWA: 'Auf WhatsApp teilen',
    method2: 'Methode 2: Kader-Zusammenfassung kopieren',
    copyBtn: 'Vollständigen Text kopieren',
    copied: 'Kopiert !',
    method3: 'Methode 3: Digitalen Pass PNG herunterladen',
    passDesc: 'Hochauflösende virtuelle Karte zum Teilen in Chats oder Status.',
    downloadPNG: 'Original PNG-Bild herunterladen',
    vacant: 'Nicht ausgewählt',
    branding: 'WORLDS CHALLENGE • HIGH PERFORMANCE EDITION',
    victoryStat: 'UNBESIEGT 6-0 (Weltmeister 🏆)',
    eliminated: 'Ausgeschieden',
    headerChallenge: '🏆 BESCHWÖRER LIGA - HERAUSFORDERUNG 🏆',
    summaryTitle: '🔮 Kannst du meinen Rekord schlagen? Mein Kader endete: ',
    generalVal: 'GESAMTBEWERTUNG',
    synChemistry: 'TEAM-CHEMIE',
    freePlay: 'Stelle deinen eigenen historischen Kader kostenlos zusammen: ',
    sysShare: 'Über das Systemmenü teilen'
  },
  it: {
    shareRecord: 'Condividi Team e Record',
    shareSub: 'Mostra il tuo team mondiale con un pass digitale o un testo riassuntivo.',
    method1: 'Metodo 1: Condividi su WhatsApp',
    shareWA: 'Condividi su WhatsApp',
    method2: 'Metodo 2: Copia Riassunto Roster',
    copyBtn: 'Copia Tutto il Testo',
    copied: 'Copiato !',
    method3: 'Metodo 3: Scarica Digital Pass PNG',
    passDesc: 'Carta virtuale ad alta risoluzione da allegare a chat o social.',
    downloadPNG: 'Scarica Immagine PNG originale',
    vacant: 'Non Selezionato',
    branding: 'WORLDS CHALLENGE • CORRRELAZIONE AD ALTE PRESTAZIONI',
    victoryStat: 'IMBATTUTO 6-0 (Campione del Mondo 🏆)',
    eliminated: 'Eliminato',
    headerChallenge: '🏆 LEGA DEGLI EVOCATORI - SFIDA 🏆',
    summaryTitle: '🔮 Puoi battere il mio record? Il mio team ha finito: ',
    generalVal: 'VALUTAZIONE GENERALE',
    synChemistry: 'CHIMICA DEL SQUAD',
    freePlay: 'Crea il tuo roster storico gratuitamente qui: ',
    sysShare: 'Condividi tramite menu di sistema'
  },
  pt: {
    shareRecord: 'Partilhar Roster e Recorde',
    shareSub: 'Mostre a sua equipa mundial com um passe digital ou texto resumido.',
    method1: 'Método 1: Partilhar por WhatsApp',
    shareWA: 'Partilhar no WhatsApp',
    method2: 'Método 2: Copiar Resumo do Roster',
    copyBtn: 'Copiar Texto Completo',
    copied: 'Copiado !',
    method3: 'Método 3: Descarregar Passe Digital PNG',
    passDesc: 'Cartão virtual de alta resolução para partilhar nas redes.',
    downloadPNG: 'Descarregar Imagem PNG original',
    vacant: 'Não Selecionado',
    branding: 'WORLDS CHALLENGE • DESENVOLVIDO EM ALTO RENDIMENTO',
    victoryStat: 'INVICTO 6-0 (Campeão do Mundo 🏆)',
    eliminated: 'Eliminado',
    headerChallenge: '🏆 LIGA DE INVOCADORES - DESAFIO 🏆',
    summaryTitle: '🔮 Consegues bater o meu recorde? O meu Squad terminou: ',
    generalVal: 'COM VALORAÇÃO GERAL',
    synChemistry: 'QUÍMICA DE EQUIPA',
    freePlay: 'Cria o teu próprio roster histórico gratuitamente aqui: ',
    sysShare: 'Partilhar usando menu do sistema móvel'
  },
  ru: {
    shareRecord: 'Поделиться составом и результатом',
    shareSub: 'Покажите свой состав чемпионата мира с помощью стильной карты или текста.',
    method1: 'Способ 1: Отправить напрямую в WhatsApp',
    shareWA: 'Поделиться в WhatsApp',
    method2: 'Способ 2: Скопировать сводку состава',
    copyBtn: 'Скопировать весь текст',
    copied: 'Скопировано !',
    method3: 'Способ 3: Скачать цифровой пропуск PNG',
    passDesc: 'Виртуальная карта высокого разрешения для чатов или соцсетей.',
    downloadPNG: 'Скачать оригинальный PNG',
    vacant: 'Пусто / Не выбрано',
    branding: 'WORLDS CHALLENGE • ВЕРСИЯ ВЫСОКОГО КЛАССА',
    victoryStat: 'НЕПОБЕЖДЕННЫЙ 6-0 (Чемпион Мира 🏆)',
    eliminated: 'Выбыл',
    headerChallenge: '🏆 ЛИГА ПРИЗЫВАТЕЛЕЙ - ЧЕЛЛЕНДЖ 🏆',
    summaryTitle: '🔮 Сможешь побить мой рекорд? Мой состав завершил: ',
    generalVal: 'ОБЩИЙ РЕЙТИНГ',
    synChemistry: 'СИНЕРГИЯ И ХИМИЯ',
    freePlay: 'Собери свой легендарный исторический состав бесплатно: ',
    sysShare: 'Поделиться через системное меню'
  },
  ko: {
    shareRecord: '로스터 및 매치 레코드 공유',
    shareSub: '당신의 월드 챔피언십 로스터를 커스텀 디지털 패스나 텍스트 리포트로 자랑하세요.',
    method1: '방법 1: 왓츠앱으로 즉시 공유',
    shareWA: '왓츠앱으로 공유',
    method2: '방법 2: 로스터 요약 복사',
    copyBtn: '전체 텍스트 복사',
    copied: '복사 완료!',
    method3: '방법 3: 디지털 패스 PNG 다운로드',
    passDesc: '소셜 네트워크나 단체방에 바로 올릴 수 있는 고해상도 가상 카드입니다.',
    downloadPNG: '원본 PNG 파일 다운로드',
    vacant: '선택하지 않음',
    branding: 'WORLDS CHALLENGE • 프로 이스포츠 에디션',
    victoryStat: '6승 무패 무결점 우승 (월드 챔피언 🏆)',
    eliminated: '탈락 완료',
    headerChallenge: '🏆 소환사의 리그 - 무패 도전 🏆',
    summaryTitle: '🔮 제 명예로운 소환사 기록을 넘어설 팀이 있을까요? 제 최종 팀 성적: ',
    generalVal: '종합 전력 수치 (OVR)',
    synChemistry: '팀 결속력 시너지',
    freePlay: '지금 소환사님의 역사적인 이스포츠 드림팀을 구성해보세요: ',
    sysShare: '모바일 시스템 공유 열기'
  },
  zh: {
    shareRecord: '分享战队阵容与完赛记录',
    shareSub: '通过精美的高清数字卡片或纯文本结语向好友炫耀您的世界赛战队阵容。',
    method1: '方法 1: 微之/WhatsApp 快捷直通分享',
    shareWA: '快捷分享到聊天软件',
    method2: '方法 2: 复制摘要文本到剪贴板',
    copyBtn: '一键复制全文本',
    copied: '已成功复制到剪贴板 !',
    method3: '方法 3: 导出电子通行证 PNG',
    passDesc: '可直接用于分享在群聊、社区和朋友圈的高分辨率虚拟证书卡。',
    downloadPNG: '下载原图高清 PNG',
    vacant: '空位 / 待选',
    branding: 'WORLDS CHALLENGE • 电子竞技高仿真推演平台',
    victoryStat: '六战全胜 6-0 登顶 (荣膺全球总决赛冠军 🏆)',
    eliminated: '惜败淘汰',
    headerChallenge: '🏆 传奇召唤师联赛 - 荣耀战役 🏆',
    summaryTitle: '🔮 你敢来挑战我创下的传奇记录吗？我的战队完赛战绩：',
    generalVal: '战队综合评分 OVR',
    synChemistry: '战队化学反应羁绊',
    freePlay: '点击链接免费组建您自己的赛区历史全神班：',
    sysShare: '使用设备系统原生菜单分享'
  }
};

export default function ShareWidget({
  draft,
  teamScore,
  synergyDetails,
  matchHistory,
  status,
  roundIndex,
  lang = 'es',
}: ShareWidgetProps) {
  const [copied, setCopied] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasDataUrl, setCanvasDataUrl] = useState<string>('');

  const activeDict = SHARE_LOCALES[lang] || SHARE_LOCALES['es'];

  const isWin = status === 'victory';
  const finalRecordMsg = isWin 
    ? activeDict.victoryStat 
    : `${matchHistory.filter(m => m.result === 'W').length}-1 (${activeDict.eliminated})`;

  const getRoundReachedText = () => {
    const wins = matchHistory.filter(m => m.result === 'W').length;
    if (isWin) {
      if (lang === 'es') {
        return '¡HE CONQUISTADO EL MUNDIAL DE LOL! 🏆 He completado el desafío invicto con 6 victorias consecutivas y un Roster de auténtica leyenda.';
      }
      return 'I HAVE CONQUERED THE WORLDS CHALLENGE! 🏆 Undefeated 6-0 run with an absolute legendary roster.';
    }
    
    if (wins === 0) {
      if (lang === 'es') {
        return 'Lancé mi roster histórico a la arena del competitivo pero me eliminaron en el primer encuentro de Apertura ⚔️.';
      }
      return 'Fell with my squad in the very first Opening Match ⚔️.';
    }
    
    const limitRound = matchHistory.length;
    let fellRoundName = '';
    try {
      fellRoundName = getLocalizedRoundName(limitRound - 1, 'lecHard', lang);
    } catch (e) {
      fellRoundName = `R${limitRound}`;
    }

    if (lang === 'es') {
      return `🥈 ¡Gran récord de ${wins}-1! Conseguí superar las eliminatorias de la LEC hasta caer con honor de pie en: ${fellRoundName}.`;
    }
    return `🥈 Great Record of ${wins}-1! Defeated LEC playoffs, but finally fell with honor at: ${fellRoundName}.`;
  };

  // Generate stylized text for copy
  const getShareText = () => {
    const dTop = draft.top.player ? `${draft.top.player.name} (${draft.top.player.rating} OVR) de ${draft.top.fromTeam?.name} '${draft.top.fromTeam?.year}` : activeDict.vacant;
    const dJungle = draft.jungle.player ? `${draft.jungle.player.name} (${draft.jungle.player.rating} OVR) de ${draft.jungle.fromTeam?.name} '${draft.jungle.fromTeam?.year}` : activeDict.vacant;
    const dMid = draft.mid.player ? `${draft.mid.player.name} (${draft.mid.player.rating} OVR) de ${draft.mid.fromTeam?.name} '${draft.mid.fromTeam?.year}` : activeDict.vacant;
    const dAdc = draft.adc.player ? `${draft.adc.player.name} (${draft.adc.player.rating} OVR) de ${draft.adc.fromTeam?.name} '${draft.adc.fromTeam?.year}` : activeDict.vacant;
    const dSup = draft.support.player ? `${draft.support.player.name} (${draft.support.player.rating} OVR) de ${draft.support.fromTeam?.name} '${draft.support.fromTeam?.year}` : activeDict.vacant;
    const dCoach = draft.coach.player ? `${draft.coach.player.name} (${draft.coach.player.rating} OVR) de ${draft.coach.fromTeam?.name} '${draft.coach.fromTeam?.year}` : activeDict.vacant;

    let historyStr = '';
    if (matchHistory.length > 0) {
      historyStr = '\n⚔️ DETALLE DE ENCUENTROS:\n' + matchHistory.map((m, idx) => {
        const flag = m.opponentRegion === 'LCK' ? '🔴🔵' : m.opponentRegion === 'LPL' ? '🔴' : m.opponentRegion === 'LEC' ? '🟠' : m.opponentRegion === 'LCS' ? '🔵' : '🌐';
        const outcome = m.result === 'W' ? '✅ Victoria' : '❌ Derrota';
        return `${idx + 1}. vs ${m.opponentName} (${m.opponentYear}) [${m.opponentRegion}] -> ${outcome}`;
      }).join('\n');
    }

    const activeSynsStr = (synergyDetails.activeSynergies && synergyDetails.activeSynergies.length > 0)
      ? `\n✨ Sinergias Activas: ${synergyDetails.activeSynergies.join(', ')}`
      : '';

    const milestone = getRoundReachedText();

    return `🏆 DE LEYENDA - CHALLENGE DE ROSTERS 🏆
${milestone}

📊 VALORACIÓN GENERAL DE MI ROSTER: ${teamScore} OVR
🔥 INFLUENCIA DE QUÍMICA: +${synergyDetails.total} pts${activeSynsStr}

🛡️ TOP: ${dTop}
⚔️ JNG: ${dJungle}
🔮 MID: ${dMid}
🎯 ADC: ${dAdc}
⭐ SUP: ${dSup}
🧠 ENTR: ${dCoach}${historyStr}

🎮 ¿Crees que tu alineación puede vencer a los mejores de la historia y superarme? Juega GRATIS ahora aquí:
👉 ${window.location.origin}`;
  };

  const handleCopyToClipboard = () => {
    const text = getShareText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleShareWhatsApp = () => {
    const text = getShareText();
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareTwitter = () => {
    const text = getShareText();
    const encoded = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encoded}`;
    window.open(twitterUrl, '_blank');
  };

  // Generate image on Canvas
  const generateCanvasImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setGeneratingImage(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1140;
    const height = 600;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient Space Deep Space
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
    bgGrad.addColorStop(0, '#040e1a');
    bgGrad.addColorStop(1, '#010a13');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid details
    ctx.strokeStyle = 'rgba(200, 170, 110, 0.04)';
    ctx.lineWidth = 1;
    const size = 30;
    for (let x = 0; x < width; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Outer border LoL Style
    ctx.strokeStyle = '#c8aa6e';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.strokeStyle = 'rgba(200, 170, 110, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // 1. Header Spec
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillStyle = '#c8aa6e';
    ctx.textAlign = 'left';
    ctx.letterSpacing = '2px';
    ctx.fillText('SUMMONER CHALLENGE CERTIFICATE', 50, 60);

    ctx.font = '900 38px "Outfit", "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = '0.5px';
    ctx.fillText(isWin ? 'CHAMPION OF THE WORLD' : 'WORLDS RUN RESULT', 50, 105);

    // 2. Score Badge
    const scoreX = 50;
    const scoreY = 160;

    // Box
    ctx.fillStyle = '#091428';
    ctx.strokeStyle = 'rgba(200, 170, 110, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(scoreX, scoreY, 190, 170, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c8aa6e';
    ctx.font = '900 68px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(teamScore.toString(), scoreX + 95, scoreY + 105);

    ctx.fillStyle = '#a09b8c';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('TEAM RATING OVR', scoreX + 95, scoreY + 140);

    // Synergy Stat
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText(`Synergies Chemistry: +${synergyDetails.total} pts`, 50, 365);

    ctx.fillStyle = '#a09b8c';
    ctx.font = '12px "Inter", sans-serif';
    ctx.fillText(`Record: ${finalRecordMsg}`, 50, 395);

    // Match history visualization
    ctx.fillStyle = 'rgba(200, 170, 110, 0.05)';
    ctx.strokeStyle = 'rgba(120, 90, 40, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(50, 420, 470, 110, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c8aa6e';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('CHAMPIONSHIP TOUR PROGRESSION:', 65, 442);

    const startX = 85;
    const startY = 475;
    const stepGap = 70;

    for (let r = 0; r < 6; r++) {
      const mResult = matchHistory.find(m => m.roundIndex === r);
      
      // Node circle
      ctx.beginPath();
      ctx.arc(startX + r * stepGap, startY, 11, 0, Math.PI * 2);
      ctx.fillStyle = mResult ? (mResult.result === 'W' ? '#004a3e' : '#da4848') : '#010a13';
      ctx.fill();
      ctx.strokeStyle = mResult ? (mResult.result === 'W' ? '#00c8c8' : '#da4848') : '#c8aa6e';
      ctx.stroke();

      // Mini text under node
      ctx.fillStyle = mResult ? (mResult.result === 'W' ? '#00c8c8' : '#da4848') : '#5c5a4d';
      ctx.font = 'bold 9px "Inter", sans-serif';
      ctx.fillText(mResult ? mResult.result : '-', startX + r * stepGap - 3, startY + 28);
    }

    // 3. Right side Roster Details
    const xRightStart = 570;
    const yRowStart = 55;
    const rowHeight = 78;

    const rolesList: { key: keyof TeamDraft; label: string; icon: string }[] = [
      { key: 'top', label: 'TOP', icon: '🛡️' },
      { key: 'jungle', label: 'JNG', icon: '⚔️' },
      { key: 'mid', label: 'MID', icon: '🔮' },
      { key: 'adc', label: 'ADC', icon: '🎯' },
      { key: 'support', label: 'SUP', icon: '⭐' },
      { key: 'coach', label: 'COACH', icon: '🧠' },
    ];

    rolesList.forEach((role, idx) => {
      const slot = draft[role.key];
      const yPos = yRowStart + idx * rowHeight;

      // Draw subtle row dividing pill
      ctx.fillStyle = 'rgba(200, 170, 110, 0.04)';
      ctx.strokeStyle = 'rgba(200, 170, 110, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(xRightStart, yPos - 5, 520, 64, 8);
      ctx.fill();
      ctx.stroke();

      // Rating bubble
      ctx.beginPath();
      ctx.arc(xRightStart + 35, yPos + 27, 20, 0, Math.PI * 2);
      ctx.fillStyle = slot.player ? '#010a13' : 'rgba(255,255,255,0.05)';
      ctx.fill();
      ctx.strokeStyle = slot.player ? '#c8aa6e' : 'rgba(200,170,110,0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = slot.player ? '#f0e6d2' : '#5c5a4d';
      ctx.font = 'bold 14px "Inter", sans-serif';
      ctx.fillText(slot.player ? slot.player.rating.toString() : '-', xRightStart + 35, yPos + 31);

      // Role Label
      ctx.textAlign = 'left';
      ctx.fillStyle = '#c8aa6e';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.fillText(`${role.icon} ${role.label}`, xRightStart + 75, yPos + 22);

      // Player Name
      ctx.fillStyle = slot.player ? '#ffffff' : '#5c5a4d';
      ctx.font = 'bold 16px "Inter", sans-serif';
      ctx.fillText(slot.player ? slot.player.name : activeDict.vacant, xRightStart + 75, yPos + 43);

      // From Team
      if (slot.player && slot.fromTeam) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#a09b8c';
        ctx.font = 'medium 11px "Inter", sans-serif';
        ctx.fillText(`${slot.fromTeam.name} (${slot.fromTeam.year})`, xRightStart + 500, yPos + 24);

        ctx.fillStyle = '#c8aa6e';
        ctx.font = 'bold 10px "Inter", sans-serif';
        ctx.fillText(slot.fromTeam.region, xRightStart + 500, yPos + 40);
      }
    });

    // Branding in bottom margin
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c8aa6e';
    ctx.font = 'bold 10px "Inter", sans-serif';
    ctx.fillText(activeDict.branding, width / 2, 574);

    // Create image url
    const dataUrl = canvas.toDataURL('image/png');
    setCanvasDataUrl(dataUrl);
    setGeneratingImage(false);
  };

  // Auto-generate canvas when components parameter change
  useEffect(() => {
    generateCanvasImage();
  }, [draft, teamScore, synergyDetails, matchHistory, lang]);

  const handleDownloadImage = () => {
    if (!canvasDataUrl && canvasRef.current) {
      generateCanvasImage();
    }
    if (canvasDataUrl) {
      const link = document.createElement('a');
      link.download = `Worlds_Challenge_Squad_${teamScore}_OVR.png`;
      link.href = canvasDataUrl;
      link.click();
    }
  };

  return (
    <div id="share-integration-card" className="bg-[#091428] border border-[#c8aa6e]/30 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden text-left space-y-6">
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c8aa6e] to-transparent" />

      {/* Header Info */}
      <div className="flex items-center gap-3 font-display">
        <div className="w-10 h-10 bg-[#c8aa6e]/10 border border-[#c8aa6e]/30 rounded-xl flex items-center justify-center">
          <Share2 className="w-5 h-5 text-[#c8aa6e]" />
        </div>
        <div>
          <h3 className="text-base font-black text-[#f0e6d2] uppercase tracking-tight">{activeDict.shareRecord}</h3>
          <p className="text-[11px] text-[#a09b8c]">{activeDict.shareSub}</p>
        </div>
      </div>

      {/* Inner visual grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        
        {/* Left pane: Action links & text preview */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-[#a09b8c] uppercase tracking-wider block">{lang === 'es' ? 'Método 1: Compartir en redes sociales / WhatsApp' : activeDict.method1}</span>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                id="share-whatsapp-btn"
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-1.5 py-3 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md hover:-translate-y-0.5"
              >
                <span className="text-base">💬</span>
                {lang === 'es' ? 'WhatsApp' : 'WhatsApp'}
              </button>
              <button
                id="share-twitter-btn"
                onClick={handleShareTwitter}
                className="flex items-center justify-center gap-1.5 py-3 px-2 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 border border-zinc-800 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md hover:-translate-y-0.5"
              >
                <span className="text-base">𝕏</span>
                {lang === 'es' ? 'Twitter / X' : 'Twitter / X'}
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-bold text-[#a09b8c] uppercase tracking-wider block">{activeDict.method2}</span>
            
            <div className="relative">
              <textarea
                readOnly
                value={getShareText().substring(0, 250) + "..."}
                className="w-full h-24 bg-[#010a13] border border-[#c8aa6e]/10 rounded-xl p-3 text-[10px] font-mono text-[#a09b8c] resize-none focus:outline-none shadow-md"
              />
              <button
                id="copy-text-roster-btn"
                onClick={handleCopyToClipboard}
                className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1.5 bg-[#1e2328] hover:bg-[#c8aa6e] hover:text-[#010a13] text-[#f0e6d2] font-black text-[9px] rounded-lg transition-colors cursor-pointer border border-[#c8aa6e]/15 uppercase tracking-wider"
              >
                {copied ? activeDict.copied : activeDict.copyBtn}
              </button>
            </div>
          </div>

          {/* Web Share Api indicator for mobile compatibility */}
          {navigator.share && (
            <button
              id="web-native-share-btn"
              onClick={() => {
                navigator.share({
                  title: 'Worlds Challenge - Draft de Roster',
                  text: getShareText(),
                  url: window.location.href,
                }).catch(err => console.log('Share error:', err));
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#010a13] hover:bg-[#1e2328] text-[#c8aa6e] border border-[#c8aa6e]/20 text-[11px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              {activeDict.sysShare}
            </button>
          )}

        </div>

        {/* Right pane: Exportable card preview download */}
        <div className="bg-[#010a13] border border-[#c8aa6e]/10 p-3.5 rounded-xl flex flex-col justify-between items-center space-y-3.5">
          <div className="w-full text-center space-y-1">
            <span className="text-[10px] font-bold text-[#c8aa6e] uppercase tracking-wider block">{activeDict.method3}</span>
            <p className="text-[9px] text-[#a09b8c]">{activeDict.passDesc}</p>
          </div>

          {/* Hidden Canvas on domestic layout */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Render real-time generated image as preview block */}
          {canvasDataUrl ? (
            <div className="relative group overflow-hidden rounded-lg border border-[#c8aa6e]/20 max-w-[325px] aspect-[1200/630] shadow-md">
              <img
                src={canvasDataUrl}
                alt="Worlds Run Pass Preview"
                className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                id="share-card-canvas-preview"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-[#010a13]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[10.5px] font-black text-[#c8aa6e] bg-[#010a13] px-3 py-1.5 rounded-md border border-[#c8aa6e]/30 pointer-events-none uppercase">Tarjeta virtual</span>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-[300px] h-36 bg-[#091428]/50 border border-dashed border-[#c8aa6e]/25 rounded-lg flex items-center justify-center text-[10px] text-[#a09b8c] animate-pulse">
              Redefiniendo lona de la tarjeta...
            </div>
          )}

          <button
            id="download-share-card-btn"
            onClick={handleDownloadImage}
            disabled={generatingImage || !canvasDataUrl}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#c8aa6e] hover:brightness-110 text-[#010a13] text-xs font-black uppercase rounded-lg cursor-pointer disabled:opacity-50 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            {activeDict.downloadPNG}
          </button>
        </div>

      </div>
    </div>
  );
}
