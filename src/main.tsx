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
    const [error, setError] = useState("");
    const [output, setOutput] = useState<DecisionResponse | null>(null);

    const canSubmit = useMemo(
        () => decision.trim() && optionA.trim() && optionB.trim(),
        [decision, optionA, optionB]
    );

    function useExample() {
        setDecision("Should I move to Seattle or stay in Bellevue?");
        setOptionA("Move to Seattle");
        setOptionB("Stay in Bellevue");
        setUserContext("Budget $3k/mo, commute twice a week, prefer quieter neighborhoods.");
        setError("");
        setOutput(null);
    }

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
                    decision: decision.trim(),
                    optionA: optionA.trim(),
                    optionB: optionB.trim(),
                    userContext: userContext.trim(),
                }),
            });

            const data = await resp.json().catch(() => ({}));

            if (!resp.ok) {
                throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
            }

            setOutput(data.output as DecisionResponse);
        } catch (e: any) {
            setError(e?.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", maxWidth: 760, margin: "30px auto", padding: 16 }}>
            <h2 style={{ marginBottom: 6 }}>Decision Coach</h2>
            <div style={{ color: "#6b7280", marginBottom: 14 }}>
                Enter a decision + two options. I’ll compare them and recommend one.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                <input
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    placeholder='Decision (e.g., "Switch teams or stay?")'
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input
                        value={optionA}
                        onChange={(e) => setOptionA(e.target.value)}
                        placeholder="Option A"
                        style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
                    />
                    <input
                        value={optionB}
                        onChange={(e) => setOptionB(e.target.value)}
                        placeholder="Option B"
                        style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
                    />
                </div>

                <textarea
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder="Context (optional): budget, timeline, priorities…"
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db", minHeight: 90, resize: "vertical" }}
                />

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={useExample}
                        style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
                    >
                        Use example
                    </button>
                    <button
                        onClick={submit}
                        disabled={loading || !canSubmit}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "none",
                            background: loading || !canSubmit ? "#9ca3af" : "#111827",
                            color: "#fff",
                            cursor: loading || !canSubmit ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Thinking…" : "Get recommendation"}
                    </button>
                </div>

                {error ? (
                    <div style={{ padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#991b1b" }}>
                        {error}
                    </div>
                ) : null}

                {output ? (
                    <div style={{ marginTop: 8, padding: 14, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>
                            Recommendation: {output.recommendation}
                        </div>
                        <div style={{ marginTop: 6 }}>{output.one_line_summary}</div>

                        <div style={{ marginTop: 10, display: "flex", gap: 18, flexWrap: "wrap" }}>
                            <div>Score A: <b>{output.scores.A}</b></div>
                            <div>Score B: <b>{output.scores.B}</b></div>
                        </div>

                        <div style={{ marginTop: 12, fontWeight: 800 }}>Top reasons</div>
                        <ol style={{ marginTop: 6 }}>
                            {output.score_breakdown.slice(0, 5).map((c, idx) => (
                                <li key={idx}>
                                    <b>{c.criterion}</b> — A {c.A_score} vs B {c.B_score} (weight {c.weight}): {c.why}
                                </li>
                            ))}
                        </ol>

                        <div style={{ marginTop: 12, fontWeight: 800 }}>Follow-up questions</div>
                        <ul style={{ marginTop: 6 }}>
                            {output.follow_up_questions.map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

createRoot(document.getElementById("root")!).render(<App />);