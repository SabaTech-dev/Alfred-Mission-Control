"use client";

import { useState } from "react";
import { Search, TrendingUp, FileText, Globe, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";

type Tab = "keywords" | "analyze" | "content";

interface KeywordResult {
  keyword: string;
  volume: string;
  competition: "Low" | "Medium" | "High";
  trend: "up" | "down" | "stable";
}

interface AnalyzeResult {
  score: number;
  title: string;
  titleLength: number;
  metaDescription: string;
  h1Count: number;
  h2Count: number;
  imgCount: number;
  imgWithoutAlt: number;
  wordCount: number;
  brokenLinks: string[];
  recommendations: string[];
}

interface ContentIdea {
  title: string;
  keyword: string;
  intent: "Informational" | "Commercial" | "Navigational";
  difficulty: "Low" | "Medium" | "High";
}

export default function SeoPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("keywords");

  const tabs: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: "keywords", label: "Keyword Research", icon: Search },
    { id: "analyze", label: "On-Page Analyzer", icon: TrendingUp },
    { id: "content", label: "Content Plan", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
        >
          SEO Module
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Keyword research, on-page analysis, and content planning
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === id ? "var(--accent)" : "transparent",
              color: tab === id ? "#000" : "var(--text-primary)",
            }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "keywords" && <KeywordResearch />}
      {tab === "analyze" && <OnPageAnalyzer />}
      {tab === "content" && <ContentPlan />}
    </div>
  );
}

function KeywordResearch() {
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [error, setError] = useState("");

  const search = async () => {
    if (!seed.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/seo/keywords?seed=${encodeURIComponent(seed)}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResults(data.keywords || []);
    } catch {
      setError("Failed to fetch keywords. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Enter seed keyword..."
          className="flex-1 px-4 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <button
          onClick={search}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{ backgroundColor: "var(--accent)", color: "#000" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      {results.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left p-3">Keyword</th>
                <th className="text-left p-3">Volume</th>
                <th className="text-left p-3">Competition</th>
                <th className="text-left p-3">Trend</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="p-3" style={{ color: "var(--text-primary)" }}>{r.keyword}</td>
                  <td className="p-3" style={{ color: "var(--text-secondary)" }}>{r.volume}</td>
                  <td className="p-3">
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor:
                          r.competition === "Low" ? "rgba(74,222,128,0.15)" :
                          r.competition === "Medium" ? "rgba(251,191,36,0.15)" :
                          "rgba(255,22,56,0.15)",
                        color:
                          r.competition === "Low" ? "#4ade80" :
                          r.competition === "Medium" ? "#fbbf24" : "#ff1638",
                      }}
                    >
                      {r.competition}
                    </span>
                  </td>
                  <td className="p-3" style={{ color: "var(--text-secondary)" }}>
                    {r.trend === "up" ? "📈" : r.trend === "down" ? "📉" : "➡️"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OnPageAnalyzer() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/seo/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Failed to analyze URL.");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = result
    ? result.score >= 80 ? "#4ade80" : result.score >= 50 ? "#fbbf24" : "#ff1638"
    : "var(--text-primary)";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
          placeholder="https://example.com"
          className="flex-1 px-4 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <button
          onClick={analyze}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{ backgroundColor: "var(--accent)", color: "#000" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
          Analyze
        </button>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Score */}
          <div
            className="rounded-xl p-6 text-center"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="text-5xl font-bold" style={{ color: scoreColor }}>
              {result.score}
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Score / 100</div>
          </div>

          {/* Metrics */}
          <div
            className="rounded-xl p-4 space-y-2 md:col-span-2"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Metrics
            </h3>
            {[
              ["Title", `${result.title.substring(0, 50)}${result.title.length > 50 ? "..." : ""}`],
              ["Title Length", `${result.titleLength} chars`],
              ["Meta Description", result.metaDescription ? "Present" : "Missing"],
              ["H1 Tags", String(result.h1Count)],
              ["H2 Tags", String(result.h2Count)],
              ["Images", `${result.imgCount} (${result.imgWithoutAlt} without alt)`],
              ["Word Count", String(result.wordCount)],
              ["Broken Links", String(result.brokenLinks.length)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                <span style={{ color: "var(--text-primary)" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div
              className="rounded-xl p-4 md:col-span-3"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                Recommendations
              </h3>
              <ul className="space-y-1">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--accent)" }}>→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContentPlan() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/seo/content?keyword=${encodeURIComponent(keyword)}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setIdeas(data.ideas || []);
    } catch {
      setError("Failed to generate content plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="Target keyword..."
          className="flex-1 px-4 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{ backgroundColor: "var(--accent)", color: "#000" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Generate
        </button>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      {ideas.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Keyword</th>
                <th className="text-left p-3">Intent</th>
                <th className="text-left p-3">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="p-3" style={{ color: "var(--text-primary)" }}>{idea.title}</td>
                  <td className="p-3" style={{ color: "var(--text-secondary)" }}>{idea.keyword}</td>
                  <td className="p-3" style={{ color: "var(--text-secondary)" }}>{idea.intent}</td>
                  <td className="p-3">
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor:
                          idea.difficulty === "Low" ? "rgba(74,222,128,0.15)" :
                          idea.difficulty === "Medium" ? "rgba(251,191,36,0.15)" :
                          "rgba(255,22,56,0.15)",
                        color:
                          idea.difficulty === "Low" ? "#4ade80" :
                          idea.difficulty === "Medium" ? "#fbbf24" : "#ff1638",
                      }}
                    >
                      {idea.difficulty}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
