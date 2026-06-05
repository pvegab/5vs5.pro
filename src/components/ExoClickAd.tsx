import React, { useEffect, useRef } from 'react';

interface ExoClickAdProps {
  zoneId: number;
  className?: string;
  minHeight?: number;
}

const EXOCLICK_PROVIDER_SRC = 'https://a.magsrv.com/ad-provider.js';
const EXOCLICK_SCRIPT_ID = 'exoclick-ad-provider';

export default function ExoClickAd({
  zoneId,
  className = '',
  minHeight = 100,
}: ExoClickAdProps) {
  const hasRequestedAd = useRef(false);

  useEffect(() => {
    if (hasRequestedAd.current) return;
    hasRequestedAd.current = true;

    const loadAd = () => {
      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });
    };

    const existingScript = document.getElementById(EXOCLICK_SCRIPT_ID);

    if (existingScript) {
      loadAd();
      return;
    }

    const script = document.createElement('script');
    script.id = EXOCLICK_SCRIPT_ID;
    script.async = true;
    script.type = 'application/javascript';
    script.src = EXOCLICK_PROVIDER_SRC;
    script.onload = loadAd;

    document.body.appendChild(script);
  }, [zoneId]);

  return (
    <div
      className={`w-full flex justify-center items-center overflow-hidden ${className}`}
      style={{ minHeight }}
      data-ad-zone={zoneId}
    >
      <ins
        className="eas6a97888e10"
        data-zoneid={String(zoneId)}
      />
    </div>
  );
}
