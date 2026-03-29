import React, { useState, useEffect, useRef } from 'react';
import { getStorageItem, setStorageItem } from '../utils/storage';

const ONBOARDING_KEY = 'onboarding-complete';

export function hasSeenOnboarding(): boolean {
  return getStorageItem<boolean>(ONBOARDING_KEY, false);
}

export function markOnboardingComplete(): void {
  setStorageItem(ONBOARDING_KEY, true);
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: 'explore',
    title: 'Welcome to Bowser',
    body: 'A browser that browses with you.',
  },
  {
    icon: 'search',
    title: 'Search anything',
    body: 'Type a URL, search query, or question in the address bar. Switch between Web and AI mode.',
  },
  {
    icon: 'auto_awesome',
    title: 'Your AI assistant',
    body: 'Open the side panel to ask questions about what you\'re browsing, summarize topics, or just think out loud.',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      markOnboardingComplete();
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={handleSkip}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Bowser"
    >
      <div
        ref={modalRef}
        className="w-full max-w-[480px] mx-4 overflow-hidden"
        style={{
          background: 'var(--bw-bg-elevated)',
          border: '1px solid var(--bw-border)',
          borderRadius: 'var(--bw-radius-lg)',
          boxShadow: 'var(--bw-shadow-xl)',
          animation: 'cp-in 0.1s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-8 pb-6 text-center">
          <span
            className="material-symbols-outlined mb-4 inline-block"
            style={{ color: 'var(--bw-accent)', fontSize: '28px' }}
            aria-hidden="true"
          >
            {current.icon}
          </span>
          <h2
            className="text-[15px] font-semibold mb-2"
            style={{ color: 'var(--bw-text-primary)', letterSpacing: '-0.02em' }}
          >
            {current.title}
          </h2>
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: 'var(--bw-text-tertiary)' }}
          >
            {current.body}
          </p>
        </div>

        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--bw-border-subtle)' }}
        >
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: i === step ? 'var(--bw-accent)' : 'var(--bw-text-quaternary)',
                  opacity: i === step ? 1 : 0.3,
                  transition: 'background 0.15s ease, opacity 0.15s ease',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSkip}
              className="text-[12px] font-medium"
              style={{ color: 'var(--bw-text-quaternary)', transition: 'color 0.1s ease' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
            >
              Skip for now
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-1.5 text-[12px] font-semibold"
              style={{
                background: 'var(--bw-accent)',
                color: '#fff',
                borderRadius: 'var(--bw-radius-sm)',
                transition: 'opacity 0.1s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {isLast ? 'Start browsing' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};