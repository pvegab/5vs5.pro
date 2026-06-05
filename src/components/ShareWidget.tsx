import React, { useState, useEffect, useRef } from 'react';
import { TeamDraft } from '../types';
import { Share2, Download } from 'lucide-react';
import { Language, getLocalizedRoundName } from '../locales';

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

type ShareTextSet = {
  shareRecord: string;
  shareSub: string;
  method1: string;
  shareWA: string;
  shareX: string;
  method3: string;
  passDesc: string;
  downloadPNG: string;
  shareCard: string;
  vacant: string;
  branding: string;
  victoryStat: string;
  eliminated: string;
  sysShare: string;
  cardHover: string;
  cardLoading: string;
  title: string;
  top: string;
  jungle: string;
  mid: string;
  adc: string;
  support: string;
  coach: string;
  from: string;
  ctaQuestion: string;
  playFree: string;
  recordWin: (wins: number) => string;
  recordLoss: (wins: number, roundName: string) => string;
  recordFirstLoss: string;
};

const SITE_URL = 'https://5vs5.pro';

const ES: ShareTextSet = {
  shareRecord: 'Compartir Roster y Récord',
  shareSub: 'Comparte tu equipo del Worlds Challenge con una tarjeta o enlace directo.',
  method1: 'Compartir en WhatsApp o Twitter/X',
  shareWA: 'WhatsApp',
  shareX: 'Twitter / X',
  method3: 'Descargar Tarjeta del Invocador',
  passDesc: 'Tarjeta virtual de tu puntuación en Worlds Challenge.',
  downloadPNG: 'Descargar',
  shareCard: 'Compartir',
  vacant: 'Sin seleccionar',
  branding: 'WORLDS CHALLENGE • TARJETA DEL INVOCADOR',
  victoryStat: '6-0 Invicto (Campeón del Mundo 🏆)',
  eliminated: 'Eliminado',
  sysShare: 'Compartir',
  cardHover: 'Tarjeta del Invocador',
  cardLoading: 'Generando tarjeta...',
  title: '🏆 WORLDS CHALLENGE - LEAGUE OF LEGENDS 🏆',
  top: 'TOP',
  jungle: 'JNG',
  mid: 'MID',
  adc: 'ADC',
  support: 'SUP',
  coach: 'ENTR',
  from: 'de',
  ctaQuestion: '¿Crees que tu equipo puede vencer a los mejores de la historia y superarme?',
  playFree: 'Juega GRATIS aquí:',
  recordWin: () => '🏆 ¡Récord de 6-0! Conseguí conquistar el Worlds Challenge con un equipo de leyenda.',
  recordLoss: (wins, roundName) => `🥈 ¡Récord de ${wins}-1! Conseguí superar las eliminatorias hasta caer con honor de pie en: ${roundName}.`,
  recordFirstLoss: '⚔️ Caí en el primer encuentro, pero mi equipo ya está listo para volver más fuerte.',
};

const EN: ShareTextSet = {
  shareRecord: 'Share Roster & Record',
  shareSub: 'Share your Worlds Challenge team with a card or direct link.',
  method1: 'Share on WhatsApp or Twitter/X',
  shareWA: 'WhatsApp',
  shareX: 'Twitter / X',
  method3: 'Download Summoner Card',
  passDesc: 'Virtual card with your Worlds Challenge score.',
  downloadPNG: 'Download',
  shareCard: 'Share',
  vacant: 'Vacant',
  branding: 'WORLDS CHALLENGE • SUMMONER CARD',
  victoryStat: '6-0 Undefeated (World Champion 🏆)',
  eliminated: 'Eliminated',
  sysShare: 'Share',
  cardHover: 'Summoner Card',
  cardLoading: 'Generating card...',
  title: '🏆 WORLDS CHALLENGE - LEAGUE OF LEGENDS 🏆',
  top: 'TOP',
  jungle: 'JNG',
  mid: 'MID',
  adc: 'ADC',
  support: 'SUP',
  coach: 'COACH',
  from: 'from',
  ctaQuestion: 'Do you think your team can beat the best in history and surpass me?',
  playFree: 'Play FREE here:',
  recordWin: () => '🏆 6-0 record! I conquered the Worlds Challenge with a legendary team.',
  recordLoss: (wins, roundName) => `🥈 ${wins}-1 record! I advanced through the bracket and fell with honor at: ${roundName}.`,
  recordFirstLoss: '⚔️ I fell in the opening match, but my team is ready to come back stronger.',
};

const SHARE_LOCALES: Record<Language, ShareTextSet> = {
  es: ES,
  en: EN,
  fr: { ...EN, shareRecord: 'Partager le roster et le record', method1: 'Partager sur WhatsApp ou Twitter/X', method3: 'Télécharger la Carte d’Invocateur', downloadPNG: 'Télécharger', shareCard: 'Partager', sysShare: 'Partager', from: 'de' },
  de: { ...EN, shareRecord: 'Kader und Rekord teilen', method1: 'Auf WhatsApp oder Twitter/X teilen', method3: 'Beschwörerkarte herunterladen', downloadPNG: 'Download', shareCard: 'Teilen', sysShare: 'Teilen', from: 'von' },
  it: { ...EN, shareRecord: 'Condividi roster e record', method1: 'Condividi su WhatsApp o Twitter/X', method3: 'Scarica Carta dell’Evocatore', downloadPNG: 'Scarica', shareCard: 'Condividi', sysShare: 'Condividi', from: 'di' },
  pt: { ...ES, shareRecord: 'Partilhar roster e recorde', method1: 'Partilhar no WhatsApp ou Twitter/X', method3: 'Descarregar Cartão do Invocador', downloadPNG: 'Descarregar', shareCard: 'Partilhar', sysShare: 'Partilhar', coach: 'TREIN', from: 'de' },
  ru: { ...EN, shareRecord: 'Поделиться составом и рекордом', method1: 'Поделиться в WhatsApp или Twitter/X', method3: 'Скачать карту призывателя', downloadPNG: 'Скачать', shareCard: 'Поделиться', sysShare: 'Поделиться', from: 'из' },
  ko: { ...EN, shareRecord: '로스터와 기록 공유', method1: 'WhatsApp 또는 Twitter/X로 공유', method3: '소환사 카드 다운로드', downloadPNG: '다운로드', shareCard: '공유', sysShare: '공유', from: '소속' },
  zh: { ...EN, shareRecord: '分享阵容与战绩', method1: '分享到 WhatsApp 或 Twitter/X', method3: '下载召唤师卡片', downloadPNG: '下载', shareCard: '分享', sysShare: '分享', from: '来自' },
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
  const [generatingImage, setGeneratingImage] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasDataUrl, setCanvasDataUrl] = useState<string>('');

  const activeDict = SHARE_LOCALES[lang] || SHARE_LOCALES.es;
  const isWin = status === 'victory';

  const finalRecordMsg = isWin
    ? activeDict.victoryStat
    : `${matchHistory.filter(m => m.result === 'W').length}-1 (${activeDict.eliminated})`;

  const getSlotText = (slot: TeamDraft[keyof TeamDraft]) => {
    if (!slot.player) return activeDict.vacant;
    const teamName = slot.fromTeam?.name || 'Unknown Team';
    const teamYear = slot.fromTeam?.year || '';
    return `${slot.player.name} (${slot.player.rating} OVR) ${activeDict.from} ${teamName} '${teamYear}`;
  };

  const getRoundReachedText = () => {
    const wins = matchHistory.filter(m => m.result === 'W').length;

    if (isWin) return activeDict.recordWin(wins);
    if (wins === 0) return activeDict.recordFirstLoss;

    const limitRound = matchHistory.length || roundIndex + 1;
    let fellRoundName = '';

    try {
      fellRoundName = getLocalizedRoundName(limitRound - 1, 'lecHard', lang);
    } catch (e) {
      fellRoundName = `R${limitRound}`;
    }

    return activeDict.recordLoss(wins, fellRoundName);
  };

  const getFullShareText = () => {
    const dTop = getSlotText(draft.top);
    const dJungle = getSlotText(draft.jungle);
    const dMid = getSlotText(draft.mid);
    const dAdc = getSlotText(draft.adc);
    const dSup = getSlotText(draft.support);
    const dCoach = getSlotText(draft.coach);

    return `${activeDict.title}
${getRoundReachedText()}

🛡️ ${activeDict.top}: ${dTop}
⚔️ ${activeDict.jungle}: ${dJungle}
🔮 ${activeDict.mid}: ${dMid}
🎯 ${activeDict.adc}: ${dAdc}
⭐ ${activeDict.support}: ${dSup}
🧠 ${activeDict.coach}: ${dCoach}

🎮 ${activeDict.ctaQuestion} ${activeDict.playFree}
👉 ${SITE_URL}`;
  };

  const getTwitterShareText = () => {
    return `${activeDict.title}
${getRoundReachedText()}

🎮 ${activeDict.ctaQuestion} ${activeDict.playFree}
👉 ${SITE_URL}`;
  };

  const getCardShareText = () => {
    return `${activeDict.title}

${getRoundReachedText()}



🎮 ${activeDict.ctaQuestion} ${activeDict.playFree}

👉 ${SITE_URL}`;
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(getFullShareText());
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleShareTwitter = () => {
    const encoded = encodeURIComponent(getTwitterShareText());
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank');
  };

  const generateCanvasImage = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    setGeneratingImage(true);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setGeneratingImage(false);
      return null;
    }

    const width = 1140;
    const height = 600;
    canvas.width = width;
    canvas.height = height;

    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
    bgGrad.addColorStop(0, '#040e1a');
    bgGrad.addColorStop(1, '#010a13');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

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

    ctx.strokeStyle = '#c8aa6e';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.strokeStyle = 'rgba(200, 170, 110, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillStyle = '#c8aa6e';
    ctx.textAlign = 'left';
    ctx.fillText('WORLDS CHALLENGE', 50, 60);

    ctx.font = '900 38px "Outfit", "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(isWin ? 'SUMMONER CHAMPION CARD' : 'SUMMONER RESULT CARD', 50, 105);

    const scoreX = 50;
    const scoreY = 160;

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
    ctx.fillText('TEAM RATING OVR', scoreX + 95, scoreY + 140);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText(`Chemistry: +${synergyDetails.total} pts`, 50, 365);

    ctx.fillStyle = '#a09b8c';
    ctx.font = '12px "Inter", sans-serif';
    ctx.fillText(`Record: ${finalRecordMsg}`, 50, 395);

    ctx.fillStyle = 'rgba(200, 170, 110, 0.05)';
    ctx.strokeStyle = 'rgba(120, 90, 40, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(50, 420, 470, 110, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c8aa6e';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('WORLDS CHALLENGE PROGRESSION:', 65, 442);

    const startX = 85;
    const startY = 475;
    const stepGap = 70;

    for (let r = 0; r < 6; r++) {
      const mResult = matchHistory.find(m => m.roundIndex === r);
      ctx.beginPath();
      ctx.arc(startX + r * stepGap, startY, 11, 0, Math.PI * 2);
      ctx.fillStyle = mResult ? (mResult.result === 'W' ? '#004a3e' : '#da4848') : '#010a13';
      ctx.fill();
      ctx.strokeStyle = mResult ? (mResult.result === 'W' ? '#00c8c8' : '#da4848') : '#c8aa6e';
      ctx.stroke();
      ctx.fillStyle = mResult ? (mResult.result === 'W' ? '#00c8c8' : '#da4848') : '#5c5a4d';
      ctx.font = 'bold 9px "Inter", sans-serif';
      ctx.fillText(mResult ? mResult.result : '-', startX + r * stepGap - 3, startY + 28);
    }

    const xRightStart = 570;
    const yRowStart = 55;
    const rowHeight = 78;

    const rolesList: { key: keyof TeamDraft; label: string; icon: string }[] = [
      { key: 'top', label: activeDict.top, icon: '🛡️' },
      { key: 'jungle', label: activeDict.jungle, icon: '⚔️' },
      { key: 'mid', label: activeDict.mid, icon: '🔮' },
      { key: 'adc', label: activeDict.adc, icon: '🎯' },
      { key: 'support', label: activeDict.support, icon: '⭐' },
      { key: 'coach', label: activeDict.coach, icon: '🧠' },
    ];

    rolesList.forEach((role, idx) => {
      const slot = draft[role.key];
      const yPos = yRowStart + idx * rowHeight;

      ctx.fillStyle = 'rgba(200, 170, 110, 0.04)';
      ctx.strokeStyle = 'rgba(200, 170, 110, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(xRightStart, yPos - 5, 520, 64, 8);
      ctx.fill();
      ctx.stroke();

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

      ctx.textAlign = 'left';
      ctx.fillStyle = '#c8aa6e';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.fillText(`${role.icon} ${role.label}`, xRightStart + 75, yPos + 22);

      ctx.fillStyle = slot.player ? '#ffffff' : '#5c5a4d';
      ctx.font = 'bold 16px "Inter", sans-serif';
      ctx.fillText(slot.player ? slot.player.name : activeDict.vacant, xRightStart + 75, yPos + 43);

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

    ctx.textAlign = 'center';
    ctx.fillStyle = '#c8aa6e';
    ctx.font = 'bold 10px "Inter", sans-serif';
    ctx.fillText(activeDict.branding, width / 2, 574);

    const dataUrl = canvas.toDataURL('image/png');
    setCanvasDataUrl(dataUrl);
    setGeneratingImage(false);
    return dataUrl;
  };

  useEffect(() => {
    generateCanvasImage();
  }, [draft, teamScore, synergyDetails, matchHistory, lang]);

  const handleDownloadImage = () => {
    const activeDataUrl = canvasDataUrl || generateCanvasImage();
    if (activeDataUrl) {
      const link = document.createElement('a');
      link.download = `Worlds_Challenge_Summoner_Card_${teamScore}_OVR.png`;
      link.href = activeDataUrl;
      link.click();
    }
  };

  const handleShareImage = async () => {
    try {
      const activeDataUrl = canvasDataUrl || generateCanvasImage();
      if (!activeDataUrl) {
        handleDownloadImage();
        return;
      }

      const response = await fetch(activeDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `Worlds_Challenge_Summoner_Card_${teamScore}_OVR.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Worlds Challenge',
          text: getCardShareText(),
          files: [file],
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: 'Worlds Challenge',
          text: getCardShareText(),
          url: SITE_URL,
        });
        return;
      }

      handleDownloadImage();
    } catch (err) {
      console.log('Image share error:', err);
      handleDownloadImage();
    }
  };

  return (
    <div id="share-integration-card" className="bg-[#091428] border border-[#c8aa6e]/30 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden text-left space-y-6">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c8aa6e] to-transparent" />

      <div className="flex items-center gap-3 font-display">
        <div className="w-10 h-10 bg-[#c8aa6e]/10 border border-[#c8aa6e]/30 rounded-xl flex items-center justify-center">
          <Share2 className="w-5 h-5 text-[#c8aa6e]" />
        </div>
        <div>
          <h3 className="text-base font-black text-[#f0e6d2] uppercase tracking-tight">{activeDict.shareRecord}</h3>
          <p className="text-[11px] text-[#a09b8c]">{activeDict.shareSub}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-[#a09b8c] uppercase tracking-wider block">{activeDict.method1}</span>

            <div className="grid grid-cols-2 gap-3">
              <button
                id="share-whatsapp-btn"
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-1.5 py-3 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md hover:-translate-y-0.5"
              >
                <span className="text-base">💬</span>
                {activeDict.shareWA}
              </button>

              <button
                id="share-twitter-btn"
                onClick={handleShareTwitter}
                className="flex items-center justify-center gap-1.5 py-3 px-2 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 border border-zinc-800 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md hover:-translate-y-0.5"
              >
                <span className="text-base">𝕏</span>
                {activeDict.shareX}
              </button>
            </div>
          </div>

          {navigator.share && (
            <button
              id="web-native-share-btn"
              onClick={() => {
                navigator.share({
                  title: 'Worlds Challenge',
                  text: getFullShareText(),
                  url: SITE_URL,
                }).catch(err => console.log('Share error:', err));
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#010a13] hover:bg-[#1e2328] text-[#c8aa6e] border border-[#c8aa6e]/20 text-[11px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              {activeDict.sysShare}
            </button>
          )}
        </div>

        <div className="bg-[#010a13] border border-[#c8aa6e]/10 p-3.5 rounded-xl flex flex-col justify-between items-center space-y-3.5">
          <div className="w-full text-center space-y-1">
            <span className="text-[10px] font-bold text-[#c8aa6e] uppercase tracking-wider block">{activeDict.method3}</span>
            <p className="text-[9px] text-[#a09b8c]">{activeDict.passDesc}</p>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {canvasDataUrl ? (
            <div className="relative group overflow-hidden rounded-lg border border-[#c8aa6e]/20 max-w-[325px] aspect-[1200/630] shadow-md">
              <img
                src={canvasDataUrl}
                alt="Worlds Challenge Summoner Card Preview"
                className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                id="share-card-canvas-preview"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-[#010a13]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[10.5px] font-black text-[#c8aa6e] bg-[#010a13] px-3 py-1.5 rounded-md border border-[#c8aa6e]/30 pointer-events-none uppercase">
                  {activeDict.cardHover}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-[300px] h-36 bg-[#091428]/50 border border-dashed border-[#c8aa6e]/25 rounded-lg flex items-center justify-center text-[10px] text-[#a09b8c] animate-pulse">
              {activeDict.cardLoading}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              id="share-card-image-btn"
              onClick={handleShareImage}
              disabled={generatingImage || !canvasDataUrl}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#010a13] hover:bg-[#1e2328] text-[#c8aa6e] border border-[#c8aa6e]/25 text-[11px] font-black uppercase rounded-lg cursor-pointer disabled:opacity-50 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              {activeDict.shareCard}
            </button>

            <button
              id="download-share-card-btn"
              onClick={handleDownloadImage}
              disabled={generatingImage || !canvasDataUrl}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#c8aa6e] hover:brightness-110 text-[#010a13] text-[11px] font-black uppercase rounded-lg cursor-pointer disabled:opacity-50 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              {activeDict.downloadPNG}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
