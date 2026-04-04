import React, { useState, useEffect, useRef } from 'react';
import { AgentStep, AgentTask, PinnedInsight } from '../types';

interface AgentViewProps {
  task: AgentTask | null;
  onCancel: () => void;
  onConfirmStep?: (confirmed: boolean) => void;
  onPinInsight?: (text: string, source: string) => void;
  onUnpinInsight?: (id: string) => void;
}

const STEP_ICONS: Record<string, string> = {
  plan: 'psychology',
  act: 'bolt',
  observe: 'visibility',
  reflect: 'lightbulb',
  result: 'check_circle',
  error: 'error',
  html: 'code',
  browse_url: 'public',
  search_web: 'travel_explore',
  generate_page: 'auto_awesome',
  extract_data: 'data_object',
  analyze_image: 'image_search',
  user_confirm: 'verified',
};

const STEP_LABELS: Record<string, string> = {
  plan: 'Planning',
  act: 'Executing',
  observe: 'Analyzing',
  reflect: 'Reflecting',
  result: 'Complete',
  error: 'Error',
  browse_url: 'Browsing',
  search_web: 'Searching',
  generate_page: 'Generating',
  extract_data: 'Extracting',
  analyze_image: 'Analyzing Image',
};

/** Glow overlay for active step */
const ActiveGlow: React.FC<{ status: string }> = ({ status }) => {
  if (status !== 'running') return null;
  return (
    <div
      className="absolute inset-0 rounded-lg pointer-events-none"
      style={{
        background: 'radial-gradient(ellipse at center, var(--bw-accent-subtle) 0%, transparent 70%)',
        animation: 'agent-glow 2s ease-in-out infinite',
        opacity: 0.6,
      }}
    />
  );
};

const StepCard: React.FC<{
  step: AgentStep;
  isLast: boolean;
  onConfirm?: (confirmed: boolean) => void;
  onPin?: (text: string) => void;
}> = ({ step, isLast, onConfirm, onPin }) => {
  const [expanded, setExpanded] = useState(isLast);

  useEffect(() => {
    if (isLast) setExpanded(true);
  }, [isLast]);

  const icon = STEP_ICONS[step.tool] || STEP_ICONS[step.status] || 'circle';
  const label = STEP_LABELS[step.tool] || step.tool;
  const isAwaiting = step.status === 'awaiting_confirmation';

  return (
    <div
      className="rounded-lg mb-2 overflow-hidden transition-all relative"
      style={{
        background: isAwaiting ? 'var(--bw-accent-muted)' : 'var(--bw-bg-elevated)',
        border: `1px solid ${step.status === 'error' ? 'var(--bw-red)' : isAwaiting ? 'var(--bw-accent)' : step.status === 'running' ? 'var(--bw-accent)' : 'var(--bw-border-subtle)'}`,
      }}
    >
      <ActiveGlow status={step.status} />
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors relative z-10"
        style={{ color: 'var(--bw-text-primary)' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span
          className={`material-symbols-outlined text-[18px] ${step.status === 'running' ? 'animate-pulse' : ''}`}
          style={{
            color: isAwaiting ? 'var(--bw-accent)' : step.status === 'error' ? 'var(--bw-red)' : step.status === 'running' ? 'var(--bw-accent)' : 'var(--bw-green)',
          }}
          aria-hidden="true"
        >
          {isAwaiting ? 'verified' : step.status === 'running' ? 'pending' : icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate">
            {isAwaiting ? '⚠️ Confirmation Required' : label}
          </div>
          {step.input && (
            <div className="text-[11px] truncate" style={{ color: 'var(--bw-text-tertiary)' }}>
              {step.input.length > 80 ? step.input.slice(0, 80) + '…' : step.input}
            </div>
          )}
        </div>
        <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {expanded && (
        <div
          className="px-4 pb-3 text-[12px] whitespace-pre-wrap break-words relative z-10"
          style={{ color: 'var(--bw-text-secondary)', borderTop: '1px solid var(--bw-border-subtle)' }}
        >
          {step.output && (
            <div className="pt-2 flex items-start gap-2">
              <span className="flex-1">{step.output.length > 800 ? step.output.slice(0, 800) + '…' : step.output}</span>
              {onPin && step.output && step.status === 'done' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPin(step.output); }}
                  className="flex-shrink-0 p-1 rounded transition-colors"
                  style={{ color: 'var(--bw-text-quaternary)' }}
                  title="Pin this insight"
                  aria-label="Pin insight"
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">push_pin</span>
                </button>
              )}
            </div>
          )}
          {isAwaiting && onConfirm && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onConfirm(true)}
                className="px-4 py-2 rounded-md text-[12px] font-semibold transition-colors"
                style={{ background: 'var(--bw-accent)', color: '#fff' }}
              >
                Approve
              </button>
              <button
                onClick={() => onConfirm(false)}
                className="px-4 py-2 rounded-md text-[12px] font-semibold transition-colors"
                style={{ background: 'var(--bw-bg-hover)', color: 'var(--bw-text-secondary)', border: '1px solid var(--bw-border)' }}
              >
                Decline
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Pinned insights sidebar */
const PinnedInsights: React.FC<{
  insights: PinnedInsight[];
  onUnpin: (id: string) => void;
}> = ({ insights, onUnpin }) => {
  if (!insights.length) return null;
  return (
    <div className="px-4 py-3" style={{ borderTop: '1px solid var(--bw-border-subtle)' }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--bw-text-quaternary)' }}>
        Pinned Insights
      </div>
      {insights.map(insight => (
        <div
          key={insight.id}
          className="flex items-start gap-2 mb-2 px-3 py-2 rounded-md text-[12px]"
          style={{ background: 'var(--bw-accent-muted)', border: '1px solid var(--bw-border-subtle)' }}
        >
          <span className="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0" style={{ color: 'var(--bw-accent)' }} aria-hidden="true">push_pin</span>
          <span className="flex-1 break-words" style={{ color: 'var(--bw-text-secondary)' }}>
            {insight.text.length > 200 ? insight.text.slice(0, 200) + '…' : insight.text}
          </span>
          <button
            onClick={() => onUnpin(insight.id)}
            className="flex-shrink-0 p-0.5 rounded transition-colors"
            style={{ color: 'var(--bw-text-quaternary)' }}
            title="Remove pin"
            aria-label="Unpin"
          >
            <span className="material-symbols-outlined text-[12px]" aria-hidden="true">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};

export const AgentView: React.FC<AgentViewProps> = ({ task, onCancel, onConfirmStep, onPinInsight, onUnpinInsight }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [task?.steps.length]);

  if (!task) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bw-bg-app)' }}>
        <div className="text-center px-8">
          <span className="material-symbols-outlined text-[48px] mb-4 block" style={{ color: 'var(--bw-text-quaternary)' }}>smart_toy</span>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--bw-text-primary)' }}>Bowser Agent</h2>
          <p className="text-sm" style={{ color: 'var(--bw-text-tertiary)' }}>
            Enter a complex goal in the address bar and the agent will autonomously plan, research, and build a page for you.
          </p>
        </div>
      </div>
    );
  }

  const isRunning = task.status === 'planning' || task.status === 'executing';
  const isAwaiting = task.status === 'awaiting_confirmation';

  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'var(--bw-bg-app)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--bw-border)' }}>
        <span className={`material-symbols-outlined text-[20px] ${isRunning ? 'agent-icon-pulse' : ''}`} style={{ color: 'var(--bw-accent)' }}>smart_toy</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--bw-text-primary)' }}>
            {task.goal.length > 60 ? task.goal.slice(0, 60) + '…' : task.goal}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--bw-text-tertiary)' }}>
            {task.steps.length} step{task.steps.length !== 1 ? 's' : ''} · {isAwaiting ? '⏸ Awaiting confirmation' : task.status}
          </div>
        </div>
        {(isRunning || isAwaiting) && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
            style={{ background: 'var(--bw-bg-hover)', color: 'var(--bw-text-secondary)', border: '1px solid var(--bw-border)' }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {task.steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            isLast={i === task.steps.length - 1}
            onConfirm={step.status === 'awaiting_confirmation' ? onConfirmStep : undefined}
            onPin={onPinInsight ? (text) => onPinInsight(text, step.tool) : undefined}
          />
        ))}
        {isRunning && (
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="agent-working-dot" />
            <span className="text-[12px]" style={{ color: 'var(--bw-text-tertiary)' }}>Agent is working…</span>
          </div>
        )}
      </div>

      {/* Pinned insights */}
      {task.pinnedInsights && task.pinnedInsights.length > 0 && onUnpinInsight && (
        <PinnedInsights insights={task.pinnedInsights} onUnpin={onUnpinInsight} />
      )}
    </div>
  );
};
