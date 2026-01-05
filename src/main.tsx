import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const API_URL = "https://l93d45v2bl.execute-api.us-east-1.amazonaws.com/prod/";

type Confidence = "High" | "Medium" | "Low";

type DecisionResponse = {
  // Core schema (existing)
  recommendation: "A" | "B" | "Tie";
  one_line_summary: string;
  scores: { A: number; B: number };
  score_breakdown: Array<{
    criterion: string;
    weight: number;
    A_score: number;
    B_score: number;
    why: string;
  }>;
  tradeoffs: string[];
  risks: { A: string[]; B: string[] };
  what_would_change_my_mind: string[];
  follow_up_questions: string[];

  // New (for differentiation)
  confidence?: Confidence;
  extracted?: {
    decision?: string;
    optionA?: string;
    optionB?: string;
    userContext?: string;
    domain?: "career" | "money" | "other";
  };
};

type ApiEnvelope = { output: DecisionResponse };

type Mode = "career" | "money";
const MODE_LABEL: Record<Mode, string> = { career: "Career", money: "Money" };

type HistoryItem = {
  id: string;
  ts: number;
  mode: Mode;
  prompt: string;
  recommendation?: DecisionResponse["recommendation"];
  confidence?: Confidence;
  summary?: string;
  output?: DecisionResponse;
};

const LS_KEY = "hosh_decision_history_v1";

function safeParse<T>(s: string | null, fallback: T): T {
  try {
    if (!s) return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function confidenceStyle(c?: Confidence) {
  const base = {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700 as const,
    border: "1px solid #d1d5db",
    background: "#f8fafc",
    color: "#0f172a",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
  if (!c) return base;
  if (c === "High") return { ...base, border: "1px solid #86efac", background: "#f0fdf4" };
  if (c === "Medium") return { ...base, border: "1px solid #fde68a", background: "#fffbeb" };
  return { ...base, border: "1px solid #fecaca", background: "#fff1f2" };
}

function App() {
  const [mode, setMode] = useState<Mode>("career");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<DecisionResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  // Load history once
  useEffect(() => {
    const items = safeParse<HistoryItem[]>(localStorage.getItem(LS_KEY), []);
    // newest first
    items.sort((a, b) => b.ts - a.ts);
    setHistory(items.slice(0, 10));
  }, []);

  function persistHistory(next: HistoryItem[]) {
    const trimmed = next.slice(0, 25);
    setHistory(trimmed);
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  }

  const placeholder = useMemo(() => {
    if (mode === "career") {
      return "Example: Should I switch teams at Amazon or stay? Option A: Switch to Team X. Option B: Stay. Context: growth vs stability, promotion timeline, manager support…";
    }
    return "Example: Should I invest $10k in index funds or keep it in savings? Option A: Invest. Option B: Save. Context: risk tolerance, timeline, emergency fund…";
  }, [mode]);

  function tryExample() {
    if (mode === "career") {
      setPrompt(
        "I’m deciding whether to switch to a new team or stay on my current team. Option A: Switch to a new team with higher visibility. Option B: Stay where I am. Context: I value career growth, but I also care about work-life balance; promotion in ~12 months."
      );
    } else {
      setPrompt(
        "I’m deciding what to do with $10,000. Option A: Invest in a low-cost S&P 500 index fund. Option B: Keep it in a high-yield savings account. Context: medium risk tolerance, 3–5 year horizon, I want to keep an emergency buffer."
      );
    }
    setOutput(null);
    setError("");
    setShowDetails(false);
  }

  async function send() {
    setError("");
    setOutput(null);
    setShowDetails(false);

    const p = prompt.trim();
    if (!p) {
      setError("Type your dilemma first (include two options like “Option A … Option B …”).");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, mode }),
      });

      const data = (await resp.json()) as Partial<ApiEnvelope> & { error?: string };

      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

      const out = (data as ApiEnvelope).output;
      setOutput(out);

      // Auto-save to history
      const item: HistoryItem = {
        id: crypto?.randomUUID?.() || String(Date.now()),
        ts: Date.now(),
        mode,
        prompt: p,
        recommendation: out?.recommendation,
        confidence: out?.confidence,
        summary: out?.one_line_summary,
        output: out,
      };

      const next = [item, ...history].sort((a, b) => b.ts - a.ts);
      persistHistory(next);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function loadHistoryItem(item: HistoryItem) {
    setMode(item.mode);
    setPrompt(item.prompt);
    setOutput(item.output || null);
    setError("");
    setShowDetails(false);
  }

  function clearHistory() {
    localStorage.removeItem(LS_KEY);
    setHistory([]);
  }

  const topReasons = output?.score_breakdown?.slice(0, 4) ?? [];
  const changeMind = output?.what_would_change_my_mind?.slice(0, 6) ?? [];
  const followUps = output?.follow_up_questions?.slice(0, 5) ?? [];

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "28px auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Decision Coach</h2>
          <div style={{ color: "#374151", marginTop: 4, fontWeight: 500 }}>
            Career + Money decisions — fast, opinionated recommendations with tradeoffs and “what would change this.”
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["career", "money"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid #cbd5e1",
                  background: mode === m ? "#111827" : "#f8fafc",
                  color: mode === m ? "#fff" : "#0f172a",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title={`Mode: ${MODE_LABEL[m]}`}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>

          <button
            onClick={tryExample}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#0f172a",
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Fill with a sample prompt"
          >
            Try an example
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gridAutoRows: "min-content",
          gap: 14,
          alignItems: "start",
          width: "100%",
        }}
      >
        {/* Row 1, Col 1: Input */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#fff", minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>1) Describe your dilemma</div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            style={{
              width: "100%",
              minHeight: 130,
              border: "1px solid #d1d5db",
              borderRadius: 12,
              padding: 12,
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={send}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "none",
                background: loading ? "#9ca3af" : "#111827",
                color: "#fff",
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Thinking…" : "Get recommendation"}
            </button>

            <div style={{ color: "#6b7280", fontSize: 12 }}>
              Tip: Include two options (e.g., “Option A … Option B …”) + 1–2 constraints (timeline/budget).
            </div>
          </div>

          {error ? (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                border: "1px solid #fecaca",
                background: "#fff1f2",
                color: "#991b1b",
              }}
            >
              <b>Error:</b> {error}
            </div>
          ) : null}
        </div>

        {/* Row 1, Col 2: History */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#fff", minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Recent decisions</div>
            <button
              onClick={clearHistory}
              disabled={history.length === 0}
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: history.length ? "#fff" : "#f3f4f6",
                cursor: history.length ? "pointer" : "not-allowed",
                fontWeight: 700,
                color: history.length ? "#0f172a" : "#6b7280",
              }}
              title="Clear saved decisions"
            >
              Clear
            </button>
          </div>

          {history.length === 0 ? (
            <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
              Your recent decisions will appear here (saved locally in your browser).
            </div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => loadHistoryItem(h)}
                  style={{
                    textAlign: "left",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    padding: 10,
                    cursor: "pointer",
                  }}
                  title="Load this decision"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div style={{ fontWeight: 800 }}>
                      {MODE_LABEL[h.mode]} • {h.recommendation || "—"}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{formatTime(h.ts)}</div>
                  </div>
                  {h.summary ? (
                    <div style={{ marginTop: 6, color: "#111827", wordBreak: "break-word" }}>{h.summary}</div>
                  ) : null}
                  <div
                    style={{
                      marginTop: 6,
                      color: "#6b7280",
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {h.prompt}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row 2: Output (full width) */}
        {output ? (
          <div
            style={{
              gridColumn: "1 / -1",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 18 }}>
                Recommendation: <b>{output.recommendation}</b>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={confidenceStyle(output.confidence)}>Confidence: {output.confidence || "—"}</span>
                <span style={{ color: "#6b7280" }}>
                  A {output.scores?.A ?? 0} • B {output.scores?.B ?? 0}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>{output.one_line_summary}</div>

            {/* Goal #2: What would change my mind (highlighted) */}
            {changeMind.length ? (
              <div style={{ marginTop: 12, border: "1px solid #e5e7eb", background: "#f8fafc", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>What would change this decision</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {changeMind.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Top reasons */}
            {topReasons.length ? (
              <>
                <div style={{ marginTop: 12, fontWeight: 900 }}>Top reasons</div>
                <ul style={{ marginTop: 6 }}>
                  {topReasons.map((c, idx) => (
                    <li key={idx}>
                      <b>{c.criterion}</b>: {c.why}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {/* Follow-ups */}
            {followUps.length ? (
              <>
                <div style={{ marginTop: 10, fontWeight: 900 }}>Quick follow-ups</div>
                <ul style={{ marginTop: 6 }}>
                  {followUps.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </>
            ) : null}

            <button
              onClick={() => setShowDetails((v) => !v)}
              style={{
                marginTop: 10,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#f8fafc",
                cursor: "pointer",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {showDetails ? "Hide details" : "Show full breakdown"}
            </button>

            {showDetails ? (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  Sent as:{" "}
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {"{ prompt, mode }"}
                  </span>
                </div>

                <div>
                  <div style={{ fontWeight: 900 }}>Breakdown</div>
                  <ul style={{ marginTop: 6 }}>
                    {output.score_breakdown.map((c, idx) => (
                      <li key={idx}>
                        <b>{c.criterion}</b> (weight {c.weight}) — A {c.A_score} vs B {c.B_score}: {c.why}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div style={{ fontWeight: 900 }}>Tradeoffs</div>
                  <ul style={{ marginTop: 6 }}>
                    {output.tradeoffs.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>Risks (A)</div>
                    <ul style={{ marginTop: 6 }}>
                      {output.risks.A.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontWeight: 900 }}>Risks (B)</div>
                    <ul style={{ marginTop: 6 }}>
                      {output.risks.B.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 900 }}>What would change my mind</div>
                  <ul style={{ marginTop: 6 }}>
                    {output.what_would_change_my_mind.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 12, color: "#6b7280", fontSize: 12 }}>
        Unique by design: structured comparisons, saved history, and clear “what would change this decision” — not generic chat.
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);