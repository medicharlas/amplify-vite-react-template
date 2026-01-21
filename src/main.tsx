import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const API_URL = "https://l93d45v2bl.execute-api.us-east-1.amazonaws.com/prod/";

type Mode = "career" | "money";
type Explain = "simple" | "normal";
type Confidence = "High" | "Medium" | "Low";

type DecisionResponse = {
    recommendation: "A" | "B" | "Tie";
    confidence: Confidence;
    decision_score: number; // 0-100
    one_line_summary: string;
    simple_summary: string;
    scores: { A: number; B: number }; // 0-100
    score_breakdown: Array<{
        criterion: string;
        weight: number;
        A_score: number; // 0-10
        B_score: number; // 0-10
        why: string;
    }>;
    tradeoffs: string[];
    risks: { A: string[]; B: string[] };
    what_would_change_my_mind: string[];
    follow_up_questions: string[];
    extracted?: {
        decision?: string;
        optionA?: string;
        optionB?: string;
        userContext?: string;
        domain?: "career" | "money" | "other";
    };
};

type ApiEnvelope = { output: DecisionResponse };

type HistoryItem = {
    id: string;
    ts: number;
    mode: Mode;
    explain: Explain;
    prompt: string;
    summary?: string;
    recommendation?: "A" | "B" | "Tie";
    confidence?: Confidence;
    score?: number;
    output?: DecisionResponse;
};

const LS_KEY = "hosh_decision_history_v2";

function safeParse<T>(s: string | null, fallback: T): T {
    try {
        if (!s) return fallback;
        return JSON.parse(s) as T;
    } catch {
        return fallback;
    }
}

function formatTime(ts: number) {
    return new Date(ts).toLocaleString();
}

function clamp(n: number, min = 0, max = 100) {
    return Math.max(min, Math.min(max, n));
}

function encodeState(state: { mode: Mode; explain: Explain; prompt: string }) {
    // base64 url-safe
    const json = JSON.stringify(state);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeState(b64url: string) {
    try {
        const b64 = b64url.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((b64url.length + 3) % 4);
        const json = decodeURIComponent(escape(atob(b64)));
        return JSON.parse(json) as { mode: Mode; explain: Explain; prompt: string };
    } catch {
        return null;
    }
}

function confidenceBadge(conf: Confidence) {
    const base = {
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800 as const,
        border: "1px solid #d1d5db",
        background: "#f8fafc",
        color: "#0f172a",
    };
    if (conf === "High") return { ...base, border: "1px solid #86efac", background: "#f0fdf4" };
    if (conf === "Medium") return { ...base, border: "1px solid #fde68a", background: "#fffbeb" };
    return { ...base, border: "1px solid #fecaca", background: "#fff1f2" };
}

function Meter({ value }: { value: number }) {
    const v = clamp(value);
    return (
        <div style={{ width: "100%", maxWidth: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
                <span>Decision score</span>
                <span style={{ fontWeight: 800, color: "#111827" }}>{v}/100</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden", marginTop: 6 }}>
                <div style={{ width: `${v}%`, height: "100%", background: "#111827" }} />
            </div>
        </div>
    );
}

function App() {
    const [mode, setMode] = useState<Mode>("career");
    const [explain, setExplain] = useState<Explain>("simple");
    const [prompt, setPrompt] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [output, setOutput] = useState<DecisionResponse | null>(null);
    const [showReasoning, setShowReasoning] = useState(false);

    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Ensure scroll even if CSS locks it
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;
        html.style.overflow = "auto";
        body.style.overflow = "auto";
        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, []);

    // Load from share link OR history
    useEffect(() => {
        const url = new URL(window.location.href);
        const s = url.searchParams.get("s");
        if (s) {
            const decoded = decodeState(s);
            if (decoded?.prompt) {
                setMode(decoded.mode);
                setExplain(decoded.explain);
                setPrompt(decoded.prompt);
            }
        }

        const items = safeParse<HistoryItem[]>(localStorage.getItem(LS_KEY), []);
        items.sort((a, b) => b.ts - a.ts);
        setHistory(items.slice(0, 10));
    }, []);

    function persistHistory(next: HistoryItem[]) {
        const trimmed = next.slice(0, 25);
        setHistory(trimmed);
        localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
    }

    const presets = useMemo(() => {
        const career = [
            {
                label: "Switch teams vs stay",
                text: "I’m deciding whether to switch to a new team or stay. Option A: Switch to a higher-visibility team. Option B: Stay. Context: promotion in ~12 months, I care about work-life balance.",
            },
            {
                label: "Manager role vs IC role",
                text: "I’m deciding between becoming a manager or staying an IC. Option A: Move to management. Option B: Stay IC. Context: I enjoy mentoring, but I value deep technical work.",
            },
        ];
        const money = [
            {
                label: "Invest vs savings",
                text: "I have $10,000. Option A: Invest in a low-cost index fund. Option B: Keep in a high-yield savings account. Context: medium risk tolerance, 3–5 year horizon, emergency fund matters.",
            },
            {
                label: "Pay debt vs invest",
                text: "I have extra $1,000/month. Option A: Pay down my debt faster. Option B: Invest monthly. Context: debt APR ~9%, investing horizon 5+ years, moderate risk tolerance.",
            },
        ];
        return mode === "career" ? career : money;
    }, [mode]);

    const placeholder =
        mode === "career"
            ? 'Example: "Switch teams or stay? Option A: switch. Option B: stay. Context: promotion timeline, WLB."'
            : 'Example: "Invest or save? Option A: invest. Option B: save. Context: risk tolerance, time horizon."';

    async function analyze() {
        setError("");
        setOutput(null);
        setShowReasoning(false);

        const p = prompt.trim();
        if (!p) {
            setError("Type your dilemma first.");
            return;
        }

        setLoading(true);
        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: p, mode, explain }),
            });

            const data = (await resp.json()) as Partial<ApiEnvelope> & { error?: string };
            if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

            const out = (data as ApiEnvelope).output;
            setOutput(out);

            const item: HistoryItem = {
                id: crypto?.randomUUID?.() || String(Date.now()),
                ts: Date.now(),
                mode,
                explain,
                prompt: p,
                summary: explain === "simple" ? out.simple_summary : out.one_line_summary,
                recommendation: out.recommendation,
                confidence: out.confidence,
                score: out.decision_score,
                output: out,
            };
            persistHistory([item, ...history].sort((a, b) => b.ts - a.ts));
        } catch (e: any) {
            setError(e?.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    function loadHistoryItem(h: HistoryItem) {
        setMode(h.mode);
        setExplain(h.explain);
        setPrompt(h.prompt);
        setOutput(h.output || null);
        setError("");
        setShowReasoning(false);
    }

    function clearHistory() {
        localStorage.removeItem(LS_KEY);
        setHistory([]);
    }

    async function copyShareLink() {
        const state = { mode, explain, prompt: prompt.trim() };
        const s = encodeState(state);
        const url = new URL(window.location.href);
        url.searchParams.set("s", s);
        const link = url.toString();

        try {
            await navigator.clipboard.writeText(link);
            setError("✅ Link copied!");
            setTimeout(() => setError(""), 1500);
        } catch {
            // fallback
            window.prompt("Copy this link:", link);
        }
    }

    const compactSummary = output
        ? explain === "simple"
            ? output.simple_summary
            : output.one_line_summary
        : "";

    return (
        <div
            style={{
                maxWidth: 920,
                margin: "26px auto",
                padding: 16,
                minHeight: "100vh",
                overflowY: "auto",
                fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            }}
        >
            {/* Header (short) */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                    <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1 }}>Decision Coach</div>
                    <div style={{ color: "#374151", marginTop: 4 }}>Make better career & money decisions — quickly.</div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
                                    fontWeight: 800,
                                    cursor: "pointer",
                                }}
                            >
                                {m === "career" ? "Career" : "Money"}
                            </button>
                        ))}
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#111827" }}>
                        <input
                            type="checkbox"
                            checked={explain === "simple"}
                            onChange={(e) => setExplain(e.target.checked ? "simple" : "normal")}
                        />
                        Explain simply
                    </label>

                    <button
                        onClick={copyShareLink}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 12,
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                            color: "#0f172a",
                            fontWeight: 800,
                            cursor: "pointer",
                        }}
                        title="Copy a shareable link to this decision"
                    >
                        Share
                    </button>
                </div>
            </div>

            {/* Main grid */}
            <div
                style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                    gap: 14,
                    alignItems: "start",
                    width: "100%",
                }}
            >
                {/* Input card (minimal) */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, minWidth: 0 }}>
                    <div style={{ fontWeight: 900 }}>Your dilemma</div>

                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={placeholder}
                        style={{
                            width: "100%",
                            minHeight: 120,
                            marginTop: 8,
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            padding: 12,
                            resize: "vertical",
                        }}
                    />

                    <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <button
                            onClick={analyze}
                            disabled={loading}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 12,
                                border: "none",
                                background: loading ? "#9ca3af" : "#111827",
                                color: "#fff",
                                fontWeight: 900,
                                cursor: loading ? "not-allowed" : "pointer",
                            }}
                        >
                            {loading ? "Thinking…" : "Get recommendation"}
                        </button>

                        {/* Preset dropdown */}
                        <select
                            onChange={(e) => {
                                const idx = Number(e.target.value);
                                if (!Number.isNaN(idx) && presets[idx]) setPrompt(presets[idx].text);
                            }}
                            defaultValue=""
                            style={{
                                padding: "10px 12px",
                                borderRadius: 12,
                                border: "1px solid #d1d5db",
                                background: "#fff",
                                color: "#0f172a",
                                fontWeight: 700,
                            }}
                            title="Choose a preset"
                        >
                            <option value="" disabled>
                                Presets…
                            </option>
                            {presets.map((p, i) => (
                                <option key={i} value={i}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                        Tip: include two options + one constraint (timeline/budget/risk).
                    </div>

                    {error ? (
                        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#991b1b" }}>
                            {error}
                        </div>
                    ) : null}
                </div>

                {/* History (compact) */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>History</div>
                        <button
                            onClick={clearHistory}
                            disabled={history.length === 0}
                            style={{
                                padding: "6px 10px",
                                borderRadius: 10,
                                border: "1px solid #d1d5db",
                                background: history.length ? "#f8fafc" : "#f3f4f6",
                                color: history.length ? "#0f172a" : "#6b7280",
                                cursor: history.length ? "pointer" : "not-allowed",
                                fontWeight: 800,
                            }}
                        >
                            Clear
                        </button>
                    </div>

                    {history.length === 0 ? (
                        <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>Recent decisions show up here.</div>
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
                                    title="Load"
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                        <div style={{ fontWeight: 900 }}>
                                            {(h.mode === "career" ? "Career" : "Money") + " • " + (h.recommendation || "—")}{" "}
                                            {typeof h.score === "number" ? `(${h.score}/100)` : ""}
                                        </div>
                                        <div style={{ color: "#6b7280", fontSize: 12 }}>{formatTime(h.ts)}</div>
                                    </div>
                                    {h.summary ? (
                                        <div style={{ marginTop: 6, color: "#111827", fontSize: 13, wordBreak: "break-word" }}>{h.summary}</div>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Output (full width, minimal first) */}
                {output ? (
                    <div style={{ gridColumn: "1 / -1", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
                        {/* Minimal result header */}
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                            <div style={{ display: "grid", gap: 6 }}>
                                <div style={{ fontSize: 18 }}>
                                    Recommendation: <b>{output.recommendation}</b>
                                </div>
                                <div style={{ color: "#111827" }}>{compactSummary}</div>
                            </div>

                            <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                                <span style={confidenceBadge(output.confidence)}>Confidence: {output.confidence}</span>
                                <Meter value={output.decision_score} />
                            </div>
                        </div>

                        {/* Minimal CTA */}
                        <button
                            onClick={() => setShowReasoning((v) => !v)}
                            style={{
                                marginTop: 12,
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #d1d5db",
                                background: "#f8fafc",
                                cursor: "pointer",
                                fontWeight: 800,
                                color: "#0f172a",
                            }}
                        >
                            {showReasoning ? "Hide reasoning" : "Show reasoning"}
                        </button>

                        {/* Reasoning (collapsed by default) */}
                        {showReasoning ? (
                            <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
                                {/* What could change your mind */}
                                {output.what_would_change_my_mind?.length ? (
                                    <div style={{ border: "1px solid #e5e7eb", background: "#f8fafc", borderRadius: 12, padding: 12 }}>
                                        <div style={{ fontWeight: 900, marginBottom: 6 }}>What could change your mind</div>
                                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                                            {output.what_would_change_my_mind.slice(0, 5).map((x, i) => (
                                                <li key={i}>{x}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}

                                {/* Why this works */}
                                {output.score_breakdown?.length ? (
                                    <div>
                                        <div style={{ fontWeight: 900 }}>Why this works</div>
                                        <ul style={{ marginTop: 6 }}>
                                            {output.score_breakdown.slice(0, 4).map((c, i) => (
                                                <li key={i}>
                                                    <b>{c.criterion}</b>: {c.why}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}

                                {/* Questions */}
                                {output.follow_up_questions?.length ? (
                                    <div>
                                        <div style={{ fontWeight: 900 }}>Questions to think about</div>
                                        <ul style={{ marginTop: 6 }}>
                                            {output.follow_up_questions.slice(0, 5).map((q, i) => (
                                                <li key={i}>{q}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}

                                {/* Full breakdown (optional) */}
                                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, color: "#6b7280", fontSize: 12 }}>
                                    Sent as:{" "}
                                    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {"{ prompt, mode, explain }"}
                  </span>
                                </div>

                                <details>
                                    <summary style={{ cursor: "pointer", fontWeight: 900, color: "#111827" }}>Full breakdown</summary>
                                    <div style={{ marginTop: 10 }}>
                                        <ul style={{ marginTop: 6 }}>
                                            {output.score_breakdown.map((c, idx) => (
                                                <li key={idx}>
                                                    <b>{c.criterion}</b> (w {c.weight}) — A {c.A_score} vs B {c.B_score}: {c.why}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </details>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div style={{ marginTop: 12, color: "#6b7280", fontSize: 12 }}>
                Built for decisions, not generic chat.
            </div>
        </div>
    );
}

createRoot(document.getElementById("root")!).render(<App />);