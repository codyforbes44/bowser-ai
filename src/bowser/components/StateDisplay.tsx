import React from 'react';

interface StateDisplayProps {
  variant: 'loading' | 'empty' | 'error';
  /** Icon name from Material Symbols */
  icon?: string;
  /** Main message */
  message?: string;
  /** Secondary description */
  description?: string;
  /** Error retry handler */
  onRetry?: () => void;
  /** Custom retry label */
  retryLabel?: string;
  /** Extra action (e.g. "Open in new tab") */
  action?: { label: string; onClick: () => void };
  /** Use compact layout */
  compact?: boolean;
}

const DEFAULT_ICONS: Record<StateDisplayProps['variant'], string> = {
  loading: 'hourglass_empty',
  empty: 'inbox',
  error: 'cloud_off',
};

const DEFAULT_MESSAGES: Record<StateDisplayProps['variant'], string> = {
  loading: 'Loading…',
  empty: 'Nothing here yet',
  error: 'Something went wrong',
};

export const StateDisplay: React.FC<StateDisplayProps> = ({
  variant,
  icon,
  message,
  description,
  onRetry,
  retryLabel = 'Try again',
  action,
  compact = false,
}) => {
  const displayIcon = icon || DEFAULT_ICONS[variant];
  const displayMessage = message || DEFAULT_MESSAGES[variant];

  if (variant === 'loading') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${compact ? 'py-4' : 'w-full h-full p-8'}`} style={{ color: 'var(--bw-text-primary)' }}>
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
        <p className="text-[13px] opacity-60">{displayMessage}</p>
        {description && <p className="text-[11px] opacity-40 text-center max-w-xs">{description}</p>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${compact ? 'py-4 px-3' : 'w-full h-full p-8'}`} style={{ color: 'var(--bw-text-primary)' }}>
      <span
        className={`material-symbols-outlined ${compact ? 'text-2xl' : 'text-4xl'}`}
        style={{ color: variant === 'error' ? 'var(--bw-red)' : 'var(--bw-text-quaternary)', opacity: 0.6 }}
        aria-hidden="true"
      >
        {displayIcon}
      </span>
      <p className={`${compact ? 'text-[12px]' : 'text-[13px]'} font-medium`} style={{ color: 'var(--bw-text-secondary)' }}>
        {displayMessage}
      </p>
      {description && (
        <p className="text-[11px] leading-relaxed text-center max-w-xs" style={{ color: 'var(--bw-text-quaternary)' }}>
          {description}
        </p>
      )}
      <div className="flex items-center gap-2 mt-1">
        {variant === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
            style={{ background: 'var(--bw-accent)', color: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">refresh</span>
            {retryLabel}
          </button>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
            style={{ border: '1px solid var(--bw-border)', color: 'var(--bw-text-secondary)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bw-bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};
