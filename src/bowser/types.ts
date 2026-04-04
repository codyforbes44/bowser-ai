export type TabKind = 'web' | 'ai' | 'agent' | 'new-tab' | 'history' | 'bookmarks' | 'settings';

/** Strongly-typed agent action definitions */
export type AgentActionType =
  | 'browse_url'
  | 'search_web'
  | 'generate_page'
  | 'extract_data'
  | 'analyze_image'
  | 'user_confirm';

export interface AgentAction {
  type: AgentActionType;
  description: string;
  params: Record<string, unknown>;
  requiresConfirmation?: boolean;
}

export interface AgentStep {
  id: string;
  tool: string;
  input: string;
  output: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'awaiting_confirmation';
  timestamp: number;
  action?: AgentAction;
}

export interface AgentTask {
  goal: string;
  steps: AgentStep[];
  status: 'planning' | 'executing' | 'complete' | 'error' | 'awaiting_confirmation';
  finalHtml: string;
  pinnedInsights?: PinnedInsight[];
  preconnectDomains?: string[];
}

export interface PinnedInsight {
  id: string;
  text: string;
  source: string;
  timestamp: number;
}

export interface Breadcrumb {
  sitename: string;
  page: string;
}

export interface TokenCount {
  input: number;
  output: number;
  isEstimate?: boolean;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Page {
  html: string;
  breadcrumb: Breadcrumb;
  scrollPosition: number;
  timestamp: number;
  tokenCount: TokenCount;
  prompt: string;
  contextHtml: string | null;
  isGrounded: boolean;
  groundingSources: GroundingSource[];
  searchEntryPointHtml: string;
}

export interface FormFieldState {
  name: string;
  type: string;
  value: string;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  timestamp: number;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  timestamp: number;
  tabKind: TabKind;
  folderId?: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  tabKind: TabKind;
}

export interface Tab {
  id: string;
  tabKind: TabKind;
  history: Page[];
  currentIndex: number;
  loading: boolean;
  loadingMessage: string;
  generatedContent: string;
  breadcrumb: Breadcrumb;
  tokenCount: TokenCount | null;
  groundingSources: GroundingSource[];
  searchEntryPointHtml: string;
  navigationId: number;
  browserUrl?: string;
  pinned?: boolean;
  customTitle?: string;
  webHistory: string[];
  webHistoryIndex: number;
  agentTask?: AgentTask;
}

/** Stable unique ID using crypto.randomUUID — safe across page reloads and session restores */
export function createTab(tabKind: TabKind = 'web'): Tab {
  const isWeb = tabKind === 'web';
  return {
    id: crypto.randomUUID(),
    tabKind,
    history: [],
    currentIndex: -1,
    loading: false,
    loadingMessage: '',
    generatedContent: '',
    breadcrumb: isWeb ? { sitename: 'https://google.com', page: '' } : { sitename: '', page: '' },
    tokenCount: null,
    groundingSources: [],
    searchEntryPointHtml: '',
    navigationId: 0,
    browserUrl: isWeb ? 'https://google.com' : undefined,
    webHistory: isWeb ? ['https://google.com'] : [],
    webHistoryIndex: isWeb ? 0 : -1,
  };
}
