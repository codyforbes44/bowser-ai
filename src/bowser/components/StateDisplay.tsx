import React from 'react';

interface LoadingProps {
  type: 'loading';
  message?: string;
}

interface EmptyProps {
  type: 'empty';
  icon?: string;
  title: string;
  subtitle?: string;
}

interface ErrorProps {
  type: 'error';
  message: string;
  onRetry?: () => void;
}

type StateDisplayProps = LoadingProps | EmptyProps | ErrorProps;

export const StateDisplay: React.FC<StateDisplayProps> = (props) => {
  if (props.type === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 w-full" style={{ color: 'var(--bw-text-primary)' }} role="status" aria-live="polite">
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
        {props.message && <p className="text-sm opacity-60">{props.message}</p>}
      </div>
    );
  }

  if (props.type === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 w-full" role="status">
        {props.icon && (
          <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--bw-text-quaternary)', opacity: 0.6 }} aria-hidden="true">
            {props.icon}
          </span>
        )}
        <p className="text-[13px] font-medium" style={{ color: 'var(--bw-text-secondary)' }}>{props.title}</p>
        {props.subtitle && (
          <p className="text-[11px] leading-relaxed text-center max-w-xs" style={{ color: 'var(--bw-text-quaternary)' }}>{props.subtitle}</p>
        )}
      </div>
    );
  }

  // error
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 w-full" role="alert">
      <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--bw-red)', opacity: 0.7 }} aria-hidden="true">error_outline</span>
      <p className="text-[13px] text-center max-w-md" style={{ color: 'var(--bw-text-secondary)' }}>{props.message}</p>
      {props.onRetry && (
        <button
          onClick={props.onRetry}
          className="px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
          style={{ background: 'var(--bw-accent)', color: '#fff' }}
        >
          Try again
        </button>
      )}
    </div>
  );
};
