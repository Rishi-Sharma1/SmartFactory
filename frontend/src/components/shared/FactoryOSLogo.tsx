import React from 'react';

interface FactoryOSLogoProps {
  /** Size of the logo icon in pixels or Tailwind size class. Default: 'md' */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Whether to show the full wordmark ("FACTORY OS") alongside the icon */
  showWordmark?: boolean;
  /** Whether to show the tagline ("EVERY SHIFT. EVERY MACHINE. ONE LIVE VIEW.") */
  showTagline?: boolean;
  /** Color theme variant for the icon squircle background */
  variant?: 'dark' | 'light' | 'orange' | 'transparent';
  /** Optional custom class name for styling container */
  className?: string;
  /** Custom text color override for 'FACTORY' text */
  textColor?: string;
}

export const FactoryOSIcon: React.FC<{
  size?: number | string;
  variant?: 'dark' | 'light' | 'orange' | 'transparent';
  className?: string;
}> = ({ size = 36, variant = 'dark', className = '' }) => {
  const pixelSize = typeof size === 'number' ? size : undefined;
  const sizeClass = typeof size === 'string' ? size : '';

  let bgFill = '#141517'; // default dark squircle
  let factoryFill = '#FFFFFF';
  let dotFill = '#FF5500';
  let windowFill = '#141517';

  if (variant === 'light') {
    bgFill = '#F6F4EE';
    factoryFill = '#141517';
    dotFill = '#FF5500';
    windowFill = '#F6F4EE';
  } else if (variant === 'orange') {
    bgFill = '#FF5500';
    factoryFill = '#FFFFFF';
    dotFill = '#FFFFFF';
    windowFill = '#FF5500';
  } else if (variant === 'transparent') {
    bgFill = 'transparent';
    factoryFill = 'currentColor';
    dotFill = '#FF5500';
    windowFill = '#141517';
  }

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${sizeClass} ${className}`}
      aria-label="FactoryOS Logo Icon"
    >
      {/* Background Squircle */}
      {variant !== 'transparent' && (
        <rect width="100" height="100" rx="24" fill={bgFill} />
      )}

      {/* Main Factory Body & Chimney */}
      <path
        d="M 23 74 L 23 51 L 38 36 L 38 51 L 53 36 L 53 51 L 69 51 L 69 28 L 78 28 L 78 74 Z"
        fill={factoryFill}
      />

      {/* 3 Windows */}
      <rect x="29" y="59" width="7.5" height="7.5" rx="1" fill={windowFill} />
      <rect x="42" y="59" width="7.5" height="7.5" rx="1" fill={windowFill} />
      <rect x="55" y="59" width="7.5" height="7.5" rx="1" fill={windowFill} />

      {/* Top Beacon / 'i' Dot Floating above Chimney */}
      <circle cx="73.5" cy="18" r="5.5" fill={dotFill} />
    </svg>
  );
};

export const FactoryOSLogo: React.FC<FactoryOSLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showTagline = false,
  variant = 'dark',
  className = '',
  textColor,
}) => {
  let iconPixelSize = 36;
  let textSizeClass = 'text-xl';
  let taglineSizeClass = 'text-[9px]';

  if (typeof size === 'number') {
    iconPixelSize = size;
  } else {
    switch (size) {
      case 'sm':
        iconPixelSize = 28;
        textSizeClass = 'text-base';
        taglineSizeClass = 'text-[8px]';
        break;
      case 'md':
        iconPixelSize = 36;
        textSizeClass = 'text-xl';
        taglineSizeClass = 'text-[10px]';
        break;
      case 'lg':
        iconPixelSize = 48;
        textSizeClass = 'text-2xl';
        taglineSizeClass = 'text-[11px]';
        break;
      case 'xl':
        iconPixelSize = 64;
        textSizeClass = 'text-4xl';
        taglineSizeClass = 'text-[13px]';
        break;
    }
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="flex items-center gap-2.5">
        <FactoryOSIcon size={iconPixelSize} variant={variant} />

        {showWordmark && (
          <div className="flex flex-col justify-center leading-none select-none">
            <div className={`font-extrabold tracking-wider font-display ${textSizeClass} ${textColor || 'text-slate-900 dark:text-white'}`}>
              FACTORY <span className="text-[#FF5500]">OS</span>
            </div>
            {showTagline && (
              <div className={`mt-1 font-mono uppercase tracking-[0.2em] font-semibold text-slate-400 dark:text-slate-400 ${taglineSizeClass}`}>
                EVERY SHIFT. EVERY MACHINE. ONE LIVE VIEW.
              </div>
            )}
          </div>
        )}
      </div>

      {!showWordmark && showTagline && (
        <div className={`mt-1.5 font-mono uppercase tracking-[0.2em] font-semibold text-slate-400 dark:text-slate-400 ${taglineSizeClass}`}>
          EVERY SHIFT. EVERY MACHINE. ONE LIVE VIEW.
        </div>
      )}
    </div>
  );
};

export default FactoryOSLogo;
