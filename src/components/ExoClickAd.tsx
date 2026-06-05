import React, { CSSProperties, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    AdProvider?: unknown[];
  }
}

type ExoPlacement =
  | 'webBannerDesktop'
  | 'mobileBanner'
  | 'outstreamResult'
  | 'nativeFinal'
  | 'videoSlider'
  | 'desktopFullpageReplay'
  | 'mobileFullpageReplay';

type ExoZoneConfig = {
  scriptSrc: string;
  className: string;
  zoneId: string;
};

interface ExoClickAdProps {
  placement?: ExoPlacement;
  zoneId?: number;
  className?: string;
  minHeight?: number;
  subId?: string;
  keywords?: string;
  wrapperStyle?: CSSProperties;
}

const DEFAULT_KEYWORDS = 'leagueoflegends,esports,gaming,moba,lol,worlds,5vs5';

const EXO_ZONES: Record<ExoPlacement, ExoZoneConfig> = {
  webBannerDesktop: {
    scriptSrc: 'https://a.magsrv.com/ad-provider.js',
    className: 'eas6a97888e2',
    zoneId: '5943472',
  },
  mobileBanner: {
    scriptSrc: 'https://a.magsrv.com/ad-provider.js',
    className: 'eas6a97888e10',
    zoneId: '5943476',
  },
  outstreamResult: {
    scriptSrc: 'https://a.magsrv.com/ad-provider.js',
    className: 'eas6a97888e37',
    zoneId: '5943480',
  },
  nativeFinal: {
    scriptSrc: 'https://a.magsrv.com/ad-provider.js',
    className: 'eas6a97888e20',
    zoneId: '5943482',
  },
  videoSlider: {
    scriptSrc: 'https://a.magsrv.com/ad-provider.js',
    className: 'eas6a97888e31',
    zoneId: '5943486',
  },
  desktopFullpageReplay: {
    scriptSrc: 'https://a.pemsrv.com/ad-provider.js',
    className: 'eas6a97888e35',
    zoneId: '5943490',
  },
  mobileFullpageReplay: {
    scriptSrc: 'https://a.pemsrv.com/ad-provider.js',
    className: 'eas6a97888e33',
    zoneId: '5943492',
  },
};

const LEGACY_ZONE_MAP: Record<number, ExoZoneConfig> = {
  5943026: {
    scriptSrc: 'https://a.magsrv.com/ad-provider.js',
    className: 'eas6a97888e10',
    zoneId: '5943026',
  },
  5943032: {
    scriptSrc: 'https://a.magsrv.com/ad-provider.js',
    className: 'eas6a97888e2',
    zoneId: '5943032',
  },
  5943472: EXO_ZONES.webBannerDesktop,
  5943476: EXO_ZONES.mobileBanner,
  5943480: EXO_ZONES.outstreamResult,
  5943482: EXO_ZONES.nativeFinal,
  5943486: EXO_ZONES.videoSlider,
  5943490: EXO_ZONES.desktopFullpageReplay,
  5943492: EXO_ZONES.mobileFullpageReplay,
};

const scriptPromises = new Map<string, Promise<void>>();

const loadScriptOnce = (src: string): Promise<void> => {
  if (typeof document === 'undefined') return Promise.resolve();

  const existingPromise = scriptPromises.get(src);
  if (existingPromise) return existingPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;

    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.type = 'application/javascript';
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar ExoClick: ${src}`));

    document.body.appendChild(script);
  });

  scriptPromises.set(src, promise);
  return promise;
};

const getZoneConfig = (placement?: ExoPlacement, zoneId?: number): ExoZoneConfig => {
  if (placement) return EXO_ZONES[placement];

  if (zoneId && LEGACY_ZONE_MAP[zoneId]) {
    return LEGACY_ZONE_MAP[zoneId];
  }

  return EXO_ZONES.webBannerDesktop;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const update = () => {
      setIsMobile(mediaQuery.matches);
    };

    update();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return isMobile;
}

export default function ExoClickAd({
  placement,
  zoneId,
  className = '',
  minHeight = 100,
  subId,
  keywords = DEFAULT_KEYWORDS,
  wrapperStyle,
}: ExoClickAdProps) {
  const hasRequestedAd = useRef(false);
  const zone = getZoneConfig(placement, zoneId);

  useEffect(() => {
    if (hasRequestedAd.current) return;

    hasRequestedAd.current = true;

    loadScriptOnce(zone.scriptSrc)
      .then(() => {
        window.AdProvider = window.AdProvider || [];
        window.AdProvider.push({ serve: {} });
      })
      .catch(() => {
        // Evita romper la web si el proveedor no carga o hay adblock.
      });
  }, [zone.scriptSrc, zone.zoneId, placement, zoneId, subId]);

  const baseStyle: CSSProperties = {
    minHeight,
    ...wrapperStyle,
  };

  return (
    <div
      className={`w-full flex justify-center items-center overflow-hidden ${className}`}
      style={baseStyle}
      data-ad-zone={zone.zoneId}
      data-ad-placement={placement || zoneId || 'legacy'}
    >
      <ins
        key={`${placement || zoneId || 'exo'}-${zone.zoneId}-${subId || 'default'}`}
        className={zone.className}
        data-zoneid={zone.zoneId}
        data-sub={subId || undefined}
        data-keywords={keywords || undefined}
      />
    </div>
  );
}

export function ExoResponsiveBanner({ subId = 'home' }: { subId?: string }) {
  const isMobile = useIsMobile();

  if (isMobile === null) return null;

  if (isMobile) {
    return (
      <div className="my-5 flex justify-center min-h-[260px]">
        <ExoClickAd
          placement="mobileBanner"
          subId={`${subId}_mobile`}
          minHeight={260}
        />
      </div>
    );
  }

  return (
    <div className="my-5 flex justify-center min-h-[100px]">
      <ExoClickAd
        placement="webBannerDesktop"
        subId={`${subId}_desktop`}
        minHeight={100}
      />
    </div>
  );
}

export function ExoFullpageReplayTags() {
  const isMobile = useIsMobile();

  if (isMobile === null) return null;

  return (
    <ExoClickAd
      placement={isMobile ? 'mobileFullpageReplay' : 'desktopFullpageReplay'}
      subId={isMobile ? 'fullpage_replay_mobile' : 'fullpage_replay_desktop'}
      minHeight={0}
      wrapperStyle={{ display: 'contents' }}
    />
  );
}

export function ExoVideoSliderOnce({
  enabled,
  subId = 'video_slider_after_2_matches',
}: {
  enabled: boolean;
  subId?: string;
}) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const alreadyShown = sessionStorage.getItem('exo_video_slider_shown') === '1';

    if (alreadyShown) return;

    const timer = window.setTimeout(() => {
      sessionStorage.setItem('exo_video_slider_shown', '1');
      setShouldRender(true);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [enabled]);

  if (!shouldRender) return null;

  return (
    <ExoClickAd
      placement="videoSlider"
      subId={subId}
      minHeight={0}
      wrapperStyle={{ display: 'contents' }}
    />
  );
}
