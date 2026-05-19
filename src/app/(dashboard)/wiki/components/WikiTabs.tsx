/**
 * Wiki tabs component
 */
import { BookMarked, Brain, Share2 } from "lucide-react";

interface WikiTabsProps {
  activeTab: 'wiki' | 'hindsight' | 'graph';
  onTabChange: (tab: 'wiki' | 'hindsight' | 'graph') => void;
}

export function WikiTabs({ activeTab, onTabChange }: WikiTabsProps) {
  return (
    <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
      <button
        onClick={() => onTabChange('wiki')}
        style={{
          padding: "6px 12px",
          borderRadius: "6px 6px 0 0",
          border: "none",
          backgroundColor: activeTab === 'wiki' ? 'var(--card)' : 'transparent',
          borderBottom: activeTab === 'wiki' ? '2px solid var(--accent)' : '1px solid var(--border)',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: activeTab === 'wiki' ? 600 : 400,
          color: activeTab === 'wiki' ? 'var(--text-primary)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <BookMarked size={14} />
        Wiki Explorer
      </button>
      <button
        onClick={() => onTabChange('hindsight')}
        style={{
          padding: "6px 12px",
          borderRadius: "6px 6px 0 0",
          border: "none",
          backgroundColor: activeTab === 'hindsight' ? 'var(--card)' : 'transparent',
          borderBottom: activeTab === 'hindsight' ? '2px solid var(--accent)' : '1px solid var(--border)',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: activeTab === 'hindsight' ? 600 : 400,
          color: activeTab === 'hindsight' ? 'var(--text-primary)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <Brain size={14} />
        Hindsight Memory
      </button>
      <button
        onClick={() => onTabChange('graph')}
        style={{
          padding: "6px 12px",
          borderRadius: "6px 6px 0 0",
          border: "none",
          backgroundColor: activeTab === 'graph' ? 'var(--card)' : 'transparent',
          borderBottom: activeTab === 'graph' ? '2px solid var(--accent)' : '1px solid var(--border)',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: activeTab === 'graph' ? 600 : 400,
          color: activeTab === 'graph' ? 'var(--text-primary)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <Share2 size={14} />
        Graph
      </button>
    </div>
  );
}