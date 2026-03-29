import React, { useState } from 'react';
import { Bookmark, TabKind } from '../types';
import { InstallPrompt } from './InstallPrompt';

interface NewTabProps {
  onCreatePage: (prompt: string) => void;
  isGrounded: boolean;
  onToggleGrounding: () => void;
  bookmarks: Bookmark[];
  onNavigateToBookmark: (url: string, tabKind: TabKind) => void;
  onOpenBookmarks: () => void;
}

const LUCKY_PROMPTS = [
  "A real-time dashboard of the current weather in major world cities",
  "A news aggregator showing the latest headlines from today",
  "A stock market tracker with live price updates for tech companies",
  "A flight departure board for a retro-futuristic airport terminal",
  "A cocktail recipe builder where you pick ingredients and it suggests drinks",
  "A volcano monitoring dashboard with seismic activity and alert levels",
  "A deep sea creature field guide with depth zones and habitat maps",
  "A transit route planner showing connections, fares, and travel times",
  "A space mission log with crew profiles, experiments, and status updates",
  "A vintage vinyl record collection catalog sorted by genre and decade",
  "A hiking trail directory with elevation profiles and difficulty ratings",
  "A ferry timetable for an island archipelago with route maps",
];

export const NewTab: React.FC<NewTabProps> = ({
  onCreatePage,
  isGrounded,
  onToggleGrounding,
  bookmarks,
  onNavigateToBookmark,
  onOpenBookmarks,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onCreatePage(prompt.trim());
    }
  };

  const handleHowItWorks = () => {
    onCreatePage(
      `A docs page for "Bowser" — a demo powered by Gemini 3 Flash, a model released in March 2026.` +
      `The Bowser demo works by sending the user's description to the Gemini API, and Gemini generates a complete HTML page in real-time using streaming.` +
      `The page is rendered live in an iframe as tokens arrive. Links within the page trigger new prompts to Gemini, so users can navigate an entirely AI-generated web. ` +
      `Introduce Bowser in the docs, how every page is generated in realtime by Gemini 3 Flash, how each click becomes a new prompt, generated based on the previous page. ` +
      `All pages are generated from scratch using a prompt, including this one. Stat that this is enabled by the speed and coding capabilities of Gemini 3 Flash.` +
      `Add that this is an experiment only, Gemini can make mistakes, results may vary. Don't make claims about 'worlds first' or 'groundbreaking'.` +
      `Empasize that every page (*including this one*!) is generated from scratch. Generations use the previous page only, there is no state apart from the previous page.` +
      `Add a call to action of 'See Examples' which takes the user to a page with examples of things Gemini can generate.`
    );
  };

  const handleLucky = () => {
    if (prompt.trim().length >= 3) {
      onCreatePage(prompt.trim());
    } else {
      const randomPrompt = LUCKY_PROMPTS[Math.floor(Math.random() * LUCKY_PROMPTS.length)];
      onCreatePage(randomPrompt);
    }
  };

  const topBookmarks = bookmarks.slice(0, 8);

  return (
    <div className="newtab-page overflow-y-auto">
      <div className="newtab-content min-h-full py-16">
        {/* Wordmark */}
        <div className="flex flex-col items-center gap-1 mb-4">
          <h1
            className="text-[28px] font-semibold tracking-tight"
            style={{ color: 'var(--bw-text-primary)', letterSpacing: '-0.03em' }}
          >
            Bowser
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="newtab-form">
          <div className="newtab-input-row">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="newtab-input"
              placeholder="Describe any website…"
              aria-label="Describe a website to generate"
              autoFocus
            />
            <button type="submit" className="newtab-submit" aria-label="Submit">
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-4 mt-2">
          <div className="newtab-buttons">
            <button onClick={handleHowItWorks} className="newtab-btn">
              How it works
            </button>
            <button onClick={handleLucky} className="newtab-btn">
              Surprise me
            </button>
          </div>

          {/* Grounding toggle */}
          <button
            onClick={onToggleGrounding}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg transition-colors"
            style={{
              background: isGrounded ? 'var(--bw-accent-subtle)' : 'transparent',
              border: `1px solid ${isGrounded ? 'var(--bw-accent)' : 'var(--bw-border)'}`,
            }}
          >
            <span
              className="material-symbols-outlined text-base"
              style={{ color: isGrounded ? 'var(--bw-accent)' : 'var(--bw-text-quaternary)' }}
            >
              language
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: isGrounded ? 'var(--bw-accent)' : 'var(--bw-text-tertiary)' }}
            >
              Real-time browsing {isGrounded ? 'on' : 'off'}
            </span>
          </button>

          <InstallPrompt />
        </div>

        {/* Favorites */}
        {topBookmarks.length > 0 && (
          <div className="mt-12 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-[11px] font-medium uppercase tracking-widest"
                style={{ color: 'var(--bw-text-quaternary)' }}
              >
                Favorites
              </h2>
              {bookmarks.length > 8 && (
                <button
                  onClick={onOpenBookmarks}
                  className="text-[11px] font-medium transition-colors"
                  style={{ color: 'var(--bw-text-quaternary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
                >
                  View all →
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {topBookmarks.map(bookmark => (
                <button
                  key={bookmark.id}
                  onClick={() => onNavigateToBookmark(bookmark.url, bookmark.tabKind)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all group"
                  style={{
                    background: 'transparent',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bw-bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--bw-border)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                  title={bookmark.title}
                >
                  <span
                    className="material-symbols-outlined text-lg transition-transform group-hover:scale-105"
                    style={{ color: bookmark.tabKind === 'web' ? 'var(--bw-green)' : 'var(--bw-accent)', opacity: 0.7 }}
                  >
                    {bookmark.tabKind === 'web' ? 'public' : 'auto_awesome'}
                  </span>
                  <span
                    className="text-[11px] truncate w-full text-center transition-colors"
                    style={{ color: 'var(--bw-text-tertiary)' }}
                  >
                    {bookmark.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
