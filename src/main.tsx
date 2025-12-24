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
    const [error, setError] = useState<string>("");
    const [output, setOutput] = useState<DecisionResponse | null>(null);

    const canSubmit = useMemo(() => {
        return decision.trim() && optionA.trim() && optionB.trim();
    }, [decision, optionA, optionB]);

    async function submit() {
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
                    // criteria: optional; leave out for now
                }),
            });

            const data = await resp.json();

            if (!resp.ok) {
                throw new Error(data?.error || `HTTP ${resp.status}`);
            }

            setOutput(data.output as DecisionResponse);
        } catch (e: any) {
            setError(e?.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ fontFamily: "sans-serif", maxWidth: 900, margin: "40px auto", padding: 16 }}>
            <h2>Decision Coach</h2>
            <p>Compare Option A vs Option B with structured reasoning.</p>

            <div style={{ display: "grid", gap: 10 }}>
                <input
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    placeholder="Decision (e.g., Should I move to Seattle or stay in Bellevue?)"
                    style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                />
                <input
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value)}
                    placeholder="Option A"
                    style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                />
                <input
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value)}
                    placeholder="Option B"
                    style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                />
                <textarea
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder="Context (optional): budget, timeline, priorities, constraints…"
                    style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc", minHeight: 90 }}
                />

                <button
                    onClick={submit}
                    disabled={loading || !canSubmit}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "none",
                        cursor: loading || !canSubmit ? "not-allowed" : "pointer",
                    }}
                >
                    {loading ? "Thinking…" : "Get Recommendation"}
                </button>

                {error ? (
                    <div style={{ padding: 12, border: "1px solid #f3b", borderRadius: 8 }}>
                        <b>Error:</b> {error}
                    </div>
                ) : null}

                {output ? (
                    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                        <h3>
                            Recommendation: <span>{output.recommendation}</span>
                        </h3>
                        <p>{output.one_line_summary}</p>

                        <h4>Scores</h4>
                        <p>
                            A: <b>{output.scores.A}</b> &nbsp;|&nbsp; B: <b>{output.scores.B}</b>
                        </p>

                        <h4>Breakdown</h4>
                        <ul>
                            {output.score_breakdown.map((c, idx) => (
                                <li key={idx}>
                                    <b>{c.criterion}</b> (weight {c.weight}) — A {c.A_score} vs B {c.B_score}: {c.why}
                                </li>
                            ))}
                        </ul>

                        <h4>Tradeoffs</h4>
                        <ul>{output.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}</ul>

                        <h4>Risks</h4>
                        <b>Option A</b>
                        <ul>{output.risks.A.map((r, i) => <li key={i}>{r}</li>)}</ul>
                        <b>Option B</b>
                        <ul>{output.risks.B.map((r, i) => <li key={i}>{r}</li>)}</ul>

                        <h4>What would change my mind</h4>
                        <ul>{output.what_would_change_my_mind.map((x, i) => <li key={i}>{x}</li>)}</ul>

                        <h4>Follow-up questions</h4>
                        <ul>{output.follow_up_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

createRoot(document.getElementById("root")!).render(<App />);
