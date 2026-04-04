import React, { useState, useEffect, useRef } from 'react';
import { AgentStep, AgentTask } from '../types';

interface AgentViewProps {
  task: AgentTask | null;
  onCancel: () => void;
}

const STEP_ICONS: Record<string, string> = {
  plan: 'psychology',
  act: 'bolt',
  observe: 'visibility',
  reflect: 'lightbulb',
  result: 'check_circle',
  error: 'error',
  html: 'code',
};

const STEP_LABELS: Record<string, string> = {
  plan: 'Planning',
  act: 'Executing',
  observe: 'Analyzing',
  reflect: 'Reflecting',
  result: 'Complete',
  error: 'Error',
};

const StepCard: React.FC<{ step: AgentStep; isLast: boolean }> = ({ step, isLast }) => {
  const [expanded, setExpanded] = useState(isLast);

  useEffect(() => {
    if (isLast) setExpanded(true);
  }, [isLast]);

  const icon = STEP_ICONS[step.tool] || STEP_ICONS[step.status] || 'circle';
  const label = STEP_LABELS[step.tool] || step.tool;

  return (
    <div
      className="rounded-lg mb-2 overflow-hidden transition-all"
      style={{
        background: 'var(--bw-bg-elevated)',
        border: `1px solid ${step.status === 'error' ? 'var(--bw-red)' : step.status === 'running' ? 'var(--bw-accent)' : 'var(--bw-border-subtle)'}`,
      }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ color: 'var(--bw-text-primary)' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span
          className={`material-symbols-outlined text-[18px] ${step.status === 'running' ? 'animate-pulse' : ''}`}
          style={{
            color: step.status === 'error' ? 'var(--bw-red)' : step.status === 'running' ? 'var(--bw-accent)' : 'var(--bw-green)',
          }}
          aria-hidden="true"
        >
          {step.status === 'running' ? 'pending' : icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate">{label}</div>
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
      {expanded && step.output && (
        <div
          className="px-4 pb-3 text-[12px] whitespace-pre-wrap break-words"
          style={{ color: 'var(--bw-text-secondary)', borderTop: '1px solid var(--bw-border-subtle)' }}
        >
          <div className="pt-2">{step.output.length > 800 ? step.output.slice(0, 800) + '…' : step.output}</div>
        </div>
      )}
    </div>
  );
};

export const AgentView: React.FC<AgentViewProps> = ({ task, onCancel }) => {
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

  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'var(--bw-bg-app)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--bw-border)' }}>
        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--bw-accent)' }}>smart_toy</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--bw-text-primary)' }}>
            {task.goal.length > 60 ? task.goal.slice(0, 60) + '…' : task.goal}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--bw-text-tertiary)' }}>
            {task.steps.length} step{task.steps.length !== 1 ? 's' : ''} · {task.status}
          </div>
        </div>
        {isRunning && (
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
          <StepCard key={step.id} step={step} isLast={i === task.steps.length - 1} />
        ))}
        {isRunning && (
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--bw-accent)' }} />
            <span className="text-[12px]" style={{ color: 'var(--bw-text-tertiary)' }}>Agent is working…</span>
          </div>
        )}
      </div>
    </div>
  );
};
