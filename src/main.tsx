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
    decision_score: number;
    one_line_summary: string;
    simple_summary: string;
    score_breakdown: Array<{
        criterion: string;
        weight: number;
        A_score: number;
        B_score: number;
        why: string;
    }>;
    what_would_change_my_mind: string[];
    follow_up_questions: string[];
};

function Meter({ value }: { value: number }) {
    const pct = Math.max(0, Math.min(100, value));
    return (
        <div style={{ maxWidth: 300 }}>
            <div style={{ fontSize: 12, color: "#374151" }}>
                Decision score <b>{pct}/100</b>
            </div>
            <div style={{ height: 10, background: "#e5e7eb", borderRadius: 999 }}>
                <div
                    style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: "#111827",
                        borderRadius: 999,
                    }}
                />
            </div>
        </div>
    );
}

export default function App() {
    const [mode, setMode] = useState<Mode>("career");
    const [explain, setExplain] = useState<Explain>("simple");
    const [prompt, setPrompt] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [output, setOutput] = useState<DecisionResponse | null>(null);
    const [showReasoning, setShowReasoning] = useState(false);

    useEffect(() => {
        document.body.style.overflow = "auto";
        document.documentElement.style.overflow = "auto";
    }, []);

    const placeholder = useMemo(
        () =>
            mode === "career"
                ? "Example: Switch teams or stay? Option A: switch. Option B: stay. Context: promotion timeline, work-life balance."
                : "Example: Invest or save? Option A: invest in index fund. Option B: keep in savings. Context: medium risk, 3–5 years.",
        [mode]
    );

    async function submit() {
        setError("");
        setOutput(null);
        setShowReasoning(false);

        if (!prompt.trim()) {
            setError("Please describe your dilemma.");
            return;
        }

        setLoading(true);
        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, mode, explain }),
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || "Request failed");

            setOutput(data.output);
        } catch (e: any) {
            setError(e.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                maxWidth: 900,
                margin: "30px auto",
                padding: 16,
                fontFamily:
                    "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            }}
        >
            {/* Header */}
            <h1 style={{ fontSize: 32, marginBottom: 4 }}>Decision Coach</h1>
            <p style={{ color: "#374151", marginBottom: 16 }}>
                Clear, opinionated help for career & money decisions.
            </p>

            {/* Controls */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                    onClick={() => setMode("career")}
                    style={{
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: "1px solid #d1d5db",
                        background: mode === "career" ? "#111827" : "#fff",
                        color: mode === "career" ? "#fff" : "#111827",
                        fontWeight: 700,
                    }}
                >
                    Career
                </button>
                <button
                    onClick={() => setMode("money")}
                    style={{
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: "1px solid #d1d5db",
                        background: mode === "money" ? "#111827" : "#fff",
                        color: mode === "money" ? "#fff" : "#111827",
                        fontWeight: 700,
                    }}
                >
                    Money
                </button>

                <label style={{ marginLeft: 12, fontSize: 14 }}>
                    <input
                        type="checkbox"
                        checked={explain === "simple"}
                        onChange={(e) =>
                            setExplain(e.target.checked ? "simple" : "normal")
                        }
                    />{" "}
                    Explain simply
                </label>
            </div>

            {/* Input */}
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: "100%",
                    minHeight: 120,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                }}
            />

            <div style={{ marginTop: 10 }}>
                <button
                    onClick={submit}
                    disabled={loading}
                    style={{
                        padding: "10px 16px",
                        borderRadius: 12,
                        border: "none",
                        background: "#111827",
                        color: "#fff",
                        fontWeight: 800,
                    }}
                >
                    {loading ? "Thinking…" : "Get recommendation"}
                </button>
            </div>

            {error && (
                <div
                    style={{
                        marginTop: 12,
                        padding: 10,
                        background: "#fee2e2",
                        color: "#991b1b",
                        borderRadius: 8,
                    }}
                >
                    {error}
                </div>
            )}

            {/* Output */}
            {output && (
                <div
                    style={{
                        marginTop: 20,
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 16,
                    }}
                >
                    <h2 style={{ marginBottom: 6 }}>
                        Recommendation: <b>{output.recommendation}</b>
                    </h2>

                    <p style={{ color: "#111827" }}>
                        {explain === "simple"
                            ? output.simple_summary
                            : output.one_line_summary}
                    </p>

                    <div style={{ marginTop: 10 }}>
                        <Meter value={output.decision_score} />
                        <div
                            style={{
                                marginTop: 6,
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: 999,
                                border: "1px solid #d1d5db",
                                background: "#f9fafb",
                                fontWeight: 700,
                            }}
                        >
                            Confidence: {output.confidence}
                        </div>
                    </div>

                    <button
                        onClick={() => setShowReasoning((v) => !v)}
                        style={{
                            marginTop: 14,
                            padding: "8px 14px",
                            borderRadius: 10,
                            border: "1px solid #d1d5db",
                            background: "#f3f4f6",
                            color: "#111827",          // ✅ force readable text
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = "#e5e7eb";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = "#f3f4f6";
                        }}
                    >
                        {showReasoning ? "Hide reasoning" : "Show reasoning"}
                    </button>
                    {showReasoning && (
                        <div style={{ marginTop: 14, color: "#0f172a" }}>
                            <h4>What could change your mind</h4>
                            <ul>
                                {output.what_would_change_my_mind.map((x, i) => (
                                    <li key={i}>{x}</li>
                                ))}
                            </ul>

                            <h4 style={{ marginTop: 12 }}>Follow-up questions</h4>
                            <ul>
                                {output.follow_up_questions.map((q, i) => (
                                    <li key={i}>{q}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

createRoot(document.getElementById("root")!).render(<App />);