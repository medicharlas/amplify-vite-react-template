import ReactDOM from "react-dom/client";
import { useMemo, useState } from "react";
import "./index.css";

const API_URL = "https://l93d45v2bl.execute-api.us-east-1.amazonaws.com/prod/";

type DecisionOutput = {
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
    const [error, setError] = useState<string>("");
    const [result, setResult] = useState<DecisionOutput | null>(null);
    const [raw, setRaw] = useState<string>("");

    const canSubmit = useMemo(() => {
        return decision.trim() && optionA.trim() && optionB.trim();
    }, [decision, optionA, optionB]);

    const analyze = async () => {
        setError("");
        setResult(null);
        setRaw("");

        if (!canSubmit) {
            setError("Please fill Decision, Option A, and Option B.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                decision: decision.trim(),
                optionA: optionA.trim(),
                optionB: optionB.trim(),
                userContext: userContext.trim(),
                // criteria: optional (leave out for now)
            };

            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await resp.json();

            if (!resp.ok) {
                // Your lambda returns {error: "...", details?: "..."}
                throw new Error(json?.error || `HTTP ${resp.status}`);
            }

            // Your lambda returns: { output: { ...schema... } }
            const output = json?.output as DecisionOutput | undefined;
            if (!output) {
                setRaw(JSON.stringify(json, null, 2));
                throw new Error("No output returned from API.");
            }

            setResult(output);
            setRaw(JSON.stringify(output, null, 2));
        } catch (e: any) {
            setError(e?.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
            <h2>Decision Coach</h2>
            <p style={{ opacity: 0.8 }}>
                Describe the decision and compare Option A vs Option B. I’ll score each option and explain tradeoffs.
            </p>

            <label>Decision</label>
            <textarea
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                placeholder='Example: "Should I accept job offer X or stay at my current job Y?"'
                style={{ width: "100%", height: 70, marginBottom: 12 }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                    <label>Option A</label>
                    <textarea
                        value={optionA}
                        onChange={(e) => setOptionA(e.target.value)}
                        placeholder="Option A details..."
                        style={{ width: "100%", height: 90 }}
                    />
                </div>
                <div>
                    <label>Option B</label>
                    <textarea
                        value={optionB}
                        onChange={(e) => setOptionB(e.target.value)}
                        placeholder="Option B details..."
                        style={{ width: "100%", height: 90 }}
                    />
                </div>
            </div>

            <label style={{ display: "block", marginTop: 12 }}>Your context (optional)</label>
            <textarea
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="Your constraints, priorities, timeline, budget, family situation, risk tolerance, etc."
                style={{ width: "100%", height: 70, marginBottom: 12 }}
            />

            <button onClick={analyze} disabled={loading} style={{ padding: "10px 14px", cursor: "pointer" }}>
                {loading ? "Analyzing..." : "Analyze"}
            </button>

            {error && (
                <div style={{ marginTop: 12, padding: 12, border: "1px solid #f5a", borderRadius: 8 }}>
                    <b>Error:</b> {error}
                </div>
            )}

            {result && (
                <div style={{ marginTop: 18 }}>
                    <h3>Recommendation: {result.recommendation}</h3>
                    <p><b>Summary:</b> {result.one_line_summary}</p>
                    <p><b>Scores:</b> A = {result.scores.A} / B = {result.scores.B}</p>

                    <h4>Breakdown</h4>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                            <tr>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Criterion</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Weight</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>A</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>B</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Why</th>
                            </tr>
                            </thead>
                            <tbody>
                            {result.score_breakdown.map((row, idx) => (
                                <tr key={idx}>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{row.criterion}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{row.weight}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{row.A_score}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{row.B_score}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{row.why}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    <h4>Tradeoffs</h4>
                    <ul>{result.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}</ul>

                    <h4>Risks</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                            <b>Option A</b>
                            <ul>{result.risks.A.map((r, i) => <li key={i}>{r}</li>)}</ul>
                        </div>
                        <div>
                            <b>Option B</b>
                            <ul>{result.risks.B.map((r, i) => <li key={i}>{r}</li>)}</ul>
                        </div>
                    </div>

                    <h4>What would change my mind?</h4>
                    <ul>{result.what_would_change_my_mind.map((x, i) => <li key={i}>{x}</li>)}</ul>

                    <h4>Follow-up questions</h4>
                    <ul>{result.follow_up_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>

                    <details style={{ marginTop: 12 }}>
                        <summary>Raw JSON</summary>
                        <pre style={{ whiteSpace: "pre-wrap" }}>{raw}</pre>
                    </details>
                </div>
            )}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
