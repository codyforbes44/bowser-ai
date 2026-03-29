import React, { useState } from 'react';
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
    icon: 'auto_awesome',
    title: 'Describe any website',
    body: 'Type a description in the address bar and Bowser generates a complete, interactive page in real time. No templates — every page is built from your words.',
  },
  {
    icon: 'public',
    title: 'Browse the AI web',
    body: 'Click links on generated pages to keep exploring. Each click creates a new page based on what came before, so you can navigate naturally.',
  },
  {
    icon: 'bookmark',
    title: 'Save and organize',
    body: 'Bookmark pages you like, pin your most-used tabs, and pick up where you left off. Your workspace is saved automatically.',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

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
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: 'var(--bw-bg-elevated)',
          border: '1px solid var(--bw-border)',
          boxShadow: 'var(--bw-shadow-xl, 0 20px 60px rgba(0,0,0,0.4))',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Content */}
        <div className="px-6 pt-8 pb-6 text-center">
          <span
            className="material-symbols-outlined text-3xl mb-4 inline-block"
            style={{ color: 'var(--bw-accent)' }}
            aria-hidden="true"
          >
            {current.icon}
          </span>
          <h2
            className="text-base font-semibold mb-2"
            style={{ color: 'var(--bw-text-primary)', letterSpacing: '-0.02em' }}
          >
            {current.title}
          </h2>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: 'var(--bw-text-tertiary)' }}
          >
            {current.body}
          </p>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--bw-border-subtle)' }}
        >
          {/* Step dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{
                  background: i === step ? 'var(--bw-accent)' : 'var(--bw-text-quaternary)',
                  opacity: i === step ? 1 : 0.3,
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSkip}
              className="text-[12px] font-medium transition-colors"
              style={{ color: 'var(--bw-text-quaternary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-1.5 text-[12px] font-semibold rounded-md transition-colors"
              style={{ background: 'var(--bw-accent)', color: '#ffffff' }}
            >
              {isLast ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
