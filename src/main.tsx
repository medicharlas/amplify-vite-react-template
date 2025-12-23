import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
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
    const [output, setOutput] = useState<DecisionOutput | null>(null);

    const canSubmit = useMemo(() => {
        return decision.trim() && optionA.trim() && optionB.trim();
    }, [decision, optionA, optionB]);

    async function generate() {
        setError("");
        setOutput(null);

        if (!canSubmit) {
            setError("Please fill Decision, Option A, and Option B.");
            return;
        }

        setLoading(true);
        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    decision,
                    optionA,
                    optionB,
                    userContext,
                    // criteria: optional advanced field if you add UI later
                }),
            });

            const data = await resp.json();

            if (!resp.ok) {
                // Lambda returns { error: "...", details?: "..." }
                const msg =
                    data?.error
                        ? `${data.error}${data.details ? ` — ${data.details}` : ""}`
                        : `HTTP ${resp.status}`;
                throw new Error(msg);
            }

            // Lambda returns { output: <json> }
            setOutput(data.output as DecisionOutput);
        } catch (e: any) {
            setError(e?.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", margin: 32, maxWidth: 900 }}>
            <h2 style={{ marginBottom: 8 }}>Decision Coach</h2>
            <div style={{ opacity: 0.8, marginBottom: 16 }}>
                Compare two options with transparent scoring and tradeoffs.
            </div>

            <div style={{ display: "grid", gap: 12 }}>
                <label>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Decision</div>
                    <input
                        value={decision}
                        onChange={(e) => setDecision(e.target.value)}
                        placeholder="e.g., Should I move to Bellevue or stay in Seattle?"
                        style={{ width: "100%", padding: 10 }}
                    />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Option A</div>
                        <textarea
                            value={optionA}
                            onChange={(e) => setOptionA(e.target.value)}
                            placeholder="Describe Option A..."
                            style={{ width: "100%", minHeight: 90, padding: 10 }}
                        />
                    </label>

                    <label>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Option B</div>
                        <textarea
                            value={optionB}
                            onChange={(e) => setOptionB(e.target.value)}
                            placeholder="Describe Option B..."
                            style={{ width: "100%", minHeight: 90, padding: 10 }}
                        />
                    </label>
                </div>

                <label>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Context (optional)</div>
                    <textarea
                        value={userContext}
                        onChange={(e) => setUserContext(e.target.value)}
                        placeholder="Constraints, budget, timeline, family, priorities, etc."
                        style={{ width: "100%", minHeight: 90, padding: 10 }}
                    />
                </label>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button
                        onClick={generate}
                        disabled={loading || !canSubmit}
                        style={{ padding: "10px 14px", cursor: loading ? "not-allowed" : "pointer" }}
                    >
                        {loading ? "Analyzing..." : "Compare A vs B"}
                    </button>
                    <div style={{ opacity: 0.7 }}>
                        Tip: Add specific constraints for better recommendations.
                    </div>
                </div>

                {error && (
                    <div style={{ background: "#ffe5e5", padding: 12, borderRadius: 8 }}>
                        <b>Error:</b> {error}
                    </div>
                )}

                {output && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                            <h3 style={{ margin: 0 }}>Recommendation: {output.recommendation}</h3>
                            <div style={{ opacity: 0.8 }}>
                                (A: {output.scores?.A} / B: {output.scores?.B})
                            </div>
                        </div>
                        <p style={{ marginTop: 8 }}>{output.one_line_summary}</p>

                        <h4>Score breakdown</h4>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                <tr>
                                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Criterion</th>
                                    <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>Weight</th>
                                    <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>A</th>
                                    <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>B</th>
                                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Why</th>
                                </tr>
                                </thead>
                                <tbody>
                                {output.score_breakdown?.map((row, idx) => (
                                    <tr key={idx}>
                                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{row.criterion}</td>
                                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>{row.weight}</td>
                                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>{row.A_score}</td>
                                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>{row.B_score}</td>
                                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{row.why}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <h4 style={{ marginTop: 16 }}>Tradeoffs</h4>
                        <ul>
                            {output.tradeoffs?.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>

                        <h4>Risks</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                                <b>Option A</b>
                                <ul>{output.risks?.A?.map((r, i) => <li key={i}>{r}</li>)}</ul>
                            </div>
                            <div>
                                <b>Option B</b>
                                <ul>{output.risks?.B?.map((r, i) => <li key={i}>{r}</li>)}</ul>
                            </div>
                        </div>

                        <h4>What would change my mind?</h4>
                        <ul>
                            {output.what_would_change_my_mind?.map((x, i) => <li key={i}>{x}</li>)}
                        </ul>

                        <h4>Follow-up questions</h4>
                        <ul>
                            {output.follow_up_questions?.map((q, i) => <li key={i}>{q}</li>)}
                        </ul>

                        <h4>Raw JSON</h4>
                        <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, overflowX: "auto" }}>
              {JSON.stringify(output, null, 2)}
            </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
