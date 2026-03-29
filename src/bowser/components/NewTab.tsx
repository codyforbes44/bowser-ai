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
      <div className="newtab-content min-h-full py-12">
        <form onSubmit={handleSubmit} className="newtab-form">
          <div className="newtab-input-row">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="newtab-input"
              placeholder="Imagine any website..."
              aria-label="Describe a website to generate"
              autoFocus
            />
            <button type="submit" className="newtab-submit" aria-label="Submit">
              <span className="material-symbols-outlined">keyboard_return</span>
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-6 mt-4">
          <div className="newtab-buttons">
            <button onClick={handleHowItWorks} className="newtab-btn newtab-how-it-works">
              How does this work?
            </button>
            <button onClick={handleLucky} className="newtab-btn newtab-lucky">
              I'm Feeling Lucky
            </button>
          </div>

          <div className="flex items-center gap-3 bg-[#1e1f23] px-4 py-2 rounded-full border border-white/10 hover:border-white/20 transition-colors cursor-pointer" onClick={onToggleGrounding}>
            <span className={`material-symbols-outlined text-xl ${isGrounded ? 'text-blue-400' : 'text-gray-500'}`}>
              language
            </span>
            <span className="text-sm text-gray-300 font-medium select-none">Real-time Web Browsing</span>
            <div
              className={`toggle-track ${isGrounded ? 'active' : ''}`}
              role="switch"
              aria-checked={isGrounded}
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onToggleGrounding(); }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleGrounding();
                }
              }}
            >
              <div className="toggle-thumb" />
            </div>
          </div>
          <InstallPrompt />
        </div>

        {topBookmarks.length > 0 && (
          <div className="mt-14 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Favorites</h2>
              {bookmarks.length > 8 && (
                <button
                  onClick={onOpenBookmarks}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  See all bookmarks →
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {topBookmarks.map(bookmark => (
                <button
                  key={bookmark.id}
                  onClick={() => onNavigateToBookmark(bookmark.url, bookmark.tabKind)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#1e1f23] border border-white/5 hover:border-white/15 hover:bg-[#28292d] transition-all group"
                  title={bookmark.title}
                >
                  <span className={`material-symbols-outlined text-xl ${bookmark.tabKind === 'web' ? 'text-green-400/70' : 'text-blue-400/70'} group-hover:scale-110 transition-transform`}>
                    {bookmark.tabKind === 'web' ? 'public' : 'auto_awesome'}
                  </span>
                  <span className="text-[11px] text-gray-400 truncate w-full text-center group-hover:text-gray-200 transition-colors">
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
