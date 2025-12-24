import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const API_URL = "https://l93d45v2bl.execute-api.us-east-1.amazonaws.com/prod/";

type DecisionResponse = {
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
};

function App() {
    const [decision, setDecision] = useState("");
    const [optionA, setOptionA] = useState("");
    const [optionB, setOptionB] = useState("");
    const [userContext, setUserContext] = useState("");
    const [loading, setLoading] = useState(false);

    const [rawJson, setRawJson] = useState<string>("");
    const [error, setError] = useState<string>("");

    const parsed: DecisionResponse | null = useMemo(() => {
        if (!rawJson) return null;
        try {
            return JSON.parse(rawJson) as DecisionResponse;
        } catch {
            return null;
        }
    }, [rawJson]);

    async function run() {
        setError("");
        setRawJson("");

        if (!decision.trim() || !optionA.trim() || !optionB.trim()) {
            setError("Please fill in Decision, Option A, and Option B.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    decision,
                    optionA,
                    optionB,
                    userContext,
                    // criteria: optional (you can add later)
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data?.error || `HTTP ${res.status}`);
                return;
            }

            // Lambda returns: { output: <object> }
            setRawJson(JSON.stringify(data.output, null, 2));
        } catch (e: any) {
            setError(e?.message || "Network error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "40px auto", padding: 16 }}>
            <h1 style={{ marginBottom: 6 }}>Decision Coach</h1>
            <p style={{ marginTop: 0, opacity: 0.8 }}>
                Compare Option A vs Option B with weighted criteria and a clear recommendation.
            </p>

            <div style={{ display: "grid", gap: 12 }}>
                <label>
                    <div style={{ fontWeight: 600 }}>Decision</div>
                    <input
                        value={decision}
                        onChange={(e) => setDecision(e.target.value)}
                        placeholder="Example: Should I switch teams or stay in my current role?"
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                    />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label>
                        <div style={{ fontWeight: 600 }}>Option A</div>
                        <textarea
                            value={optionA}
                            onChange={(e) => setOptionA(e.target.value)}
                            placeholder="Describe Option A"
                            style={{ width: "100%", height: 90, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                        />
                    </label>
                    <label>
                        <div style={{ fontWeight: 600 }}>Option B</div>
                        <textarea
                            value={optionB}
                            onChange={(e) => setOptionB(e.target.value)}
                            placeholder="Describe Option B"
                            style={{ width: "100%", height: 90, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                        />
                    </label>
                </div>

                <label>
                    <div style={{ fontWeight: 600 }}>Context (optional)</div>
                    <textarea
                        value={userContext}
                        onChange={(e) => setUserContext(e.target.value)}
                        placeholder="Budget, timeline, family constraints, career goals, risk tolerance, etc."
                        style={{ width: "100%", height: 90, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                    />
                </label>

                <button
                    onClick={run}
                    disabled={loading}
                    style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "none",
                        cursor: loading ? "not-allowed" : "pointer",
                        background: "#4f46e5",
                        color: "white",
                        fontWeight: 700,
                    }}
                >
                    {loading ? "Analyzing..." : "Analyze decision"}
                </button>

                {error && (
                    <div style={{ padding: 12, borderRadius: 10, background: "#fee2e2", color: "#991b1b" }}>
                        {error}
                    </div>
                )}

                {parsed && (
                    <div style={{ padding: 14, borderRadius: 12, border: "1px solid #ddd" }}>
                        <h2 style={{ marginTop: 0 }}>Recommendation: {parsed.recommendation}</h2>
                        <p style={{ marginTop: 0 }}><b>Summary:</b> {parsed.one_line_summary}</p>
                        <p style={{ marginTop: 0 }}>
                            <b>Scores:</b> A = {parsed.scores.A} | B = {parsed.scores.B}
                        </p>

                        <h3>Breakdown</h3>
                        <ul>
                            {parsed.score_breakdown.map((x, i) => (
                                <li key={i} style={{ marginBottom: 8 }}>
                                    <b>{x.criterion}</b> (weight {x.weight}) — A:{x.A_score} / B:{x.B_score}
                                    <div style={{ opacity: 0.85 }}>{x.why}</div>
                                </li>
                            ))}
                        </ul>

                        <h3>Tradeoffs</h3>
                        <ul>{parsed.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}</ul>

                        <h3>Risks</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                                <b>Option A</b>
                                <ul>{parsed.risks.A.map((r, i) => <li key={i}>{r}</li>)}</ul>
                            </div>
                            <div>
                                <b>Option B</b>
                                <ul>{parsed.risks.B.map((r, i) => <li key={i}>{r}</li>)}</ul>
                            </div>
                        </div>

                        <h3>What would change my mind</h3>
                        <ul>{parsed.what_would_change_my_mind.map((w, i) => <li key={i}>{w}</li>)}</ul>

                        <h3>Follow-up questions</h3>
                        <ul>{parsed.follow_up_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                    </div>
                )}

                {/* Raw output for debugging */}
                {rawJson && (
                    <details>
                        <summary>Raw JSON output</summary>
                        <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12, borderRadius: 10 }}>
              {rawJson}
            </pre>
                    </details>
                )}
            </div>
        </div>
    );
}

createRoot(document.getElementById("root")!).render(<App />);
