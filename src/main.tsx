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

function Card(props: { title: string; children: any }) {
    return (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff" }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{props.title}</div>
            {props.children}
        </div>
    );
}

function Field(props: {
    label: string;
    hint?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    multiline?: boolean;
    required?: boolean;
}) {
    return (
        <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>
                    {props.label} {props.required ? <span style={{ color: "#ef4444" }}>*</span> : null}
                </div>
                {props.hint ? <div style={{ color: "#6b7280", fontSize: 12 }}>{props.hint}</div> : null}
            </div>

            {props.multiline ? (
                <textarea
                    value={props.value}
                    onChange={(e) => props.onChange(e.target.value)}
                    placeholder={props.placeholder}
                    style={{
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        minHeight: 90,
                        resize: "vertical",
                    }}
                />
            ) : (
                <input
                    value={props.value}
                    onChange={(e) => props.onChange(e.target.value)}
                    placeholder={props.placeholder}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
                />
            )}
        </div>
    );
}

function App() {
    const [decision, setDecision] = useState("");
    const [optionA, setOptionA] = useState("");
    const [optionB, setOptionB] = useState("");
    const [userContext, setUserContext] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [output, setOutput] = useState<DecisionResponse | null>(null);

    const canSubmit = useMemo(() => {
        return decision.trim().length > 0 && optionA.trim().length > 0 && optionB.trim().length > 0;
    }, [decision, optionA, optionB]);

    function fillExample() {
        setDecision("Should I move to Seattle or stay in Bellevue?");
        setOptionA("Move to Seattle");
        setOptionB("Stay in Bellevue");
        setUserContext("Budget $3k/mo, commute twice a week, prefer quieter neighborhoods, value community and safety.");
        setError("");
        setOutput(null);
    }

    async function submit() {
        setError("");
        setOutput(null);

        if (!canSubmit) {
            setError("Please fill in Decision, Option A, and Option B.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                decision: decision.trim(),
                optionA: optionA.trim(),
                optionB: optionB.trim(),
                userContext: userContext.trim(),
                // criteria: optional future enhancement
            };

            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
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
        <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", maxWidth: 980, margin: "30px auto", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                    <div style={{ fontSize: 26, fontWeight: 800 }}>Decision Coach</div>
                    <div style={{ color: "#6b7280" }}>
                        Enter a decision + two options. The bot returns a structured comparison and recommendation.
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={fillExample}
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
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                <Card title="1) Your inputs">
                    <div style={{ display: "grid", gap: 12 }}>
                        <Field
                            label="Decision"
                            required
                            hint="Describe your dilemma in one sentence."
                            value={decision}
                            onChange={setDecision}
                            placeholder='e.g., "Should I switch teams at work or stay?"'
                        />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <Field
                                label="Option A"
                                required
                                hint="First choice you’re considering."
                                value={optionA}
                                onChange={setOptionA}
                                placeholder='e.g., "Switch teams"'
                            />
                            <Field
                                label="Option B"
                                required
                                hint="Second choice you’re considering."
                                value={optionB}
                                onChange={setOptionB}
                                placeholder='e.g., "Stay on current team"'
                            />
                        </div>
                        <Field
                            label="Context (optional)"
                            hint="Add constraints/priorities: budget, timeline, commute, family, goals, risk tolerance…"
                            value={userContext}
                            onChange={setUserContext}
                            multiline
                            placeholder="Example: Budget $X, timeline Y months, priority: growth over stability, cannot relocate, etc."
                        />

                        <div style={{ fontSize: 13, color: "#6b7280" }}>
                            <b>What gets sent to the API:</b>{" "}
                            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                {"{ decision, optionA, optionB, userContext }"}
              </span>
                        </div>
                    </div>
                </Card>

                {error ? (
                    <Card title="Error">
                        <div style={{ color: "#b91c1c" }}><b>{error}</b></div>
                        <div style={{ color: "#6b7280", marginTop: 8, fontSize: 13 }}>
                            Tip: Click <b>Use example</b> to see a valid input format.
                        </div>
                    </Card>
                ) : null}

                {output ? (
                    <Card title="2) Recommendation">
                        <div style={{ display: "grid", gap: 10 }}>
                            <div style={{ fontSize: 18 }}>
                                Recommendation: <b>{output.recommendation}</b>
                            </div>
                            <div style={{ color: "#111827" }}>{output.one_line_summary}</div>

                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
                                <div>
                                    Score A: <b>{output.scores.A}</b>
                                </div>
                                <div>
                                    Score B: <b>{output.scores.B}</b>
                                </div>
                            </div>

                            <div style={{ marginTop: 8, fontWeight: 700 }}>Breakdown</div>
                            <div style={{ display: "grid", gap: 8 }}>
                                {output.score_breakdown.map((c, idx) => (
                                    <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                            <div><b>{c.criterion}</b> <span style={{ color: "#6b7280" }}>(weight {c.weight})</span></div>
                                            <div style={{ color: "#6b7280" }}>
                                                A {c.A_score} vs B {c.B_score}
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 6 }}>{c.why}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: 10, fontWeight: 700 }}>Tradeoffs</div>
                            <ul style={{ marginTop: 6 }}>
                                {output.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}
                            </ul>

                            <div style={{ marginTop: 10, fontWeight: 700 }}>Risks</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>Option A</div>
                                    <ul style={{ marginTop: 6 }}>
                                        {output.risks.A.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>Option B</div>
                                    <ul style={{ marginTop: 6 }}>
                                        {output.risks.B.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                            </div>

                            <div style={{ marginTop: 10, fontWeight: 700 }}>What would change my mind</div>
                            <ul style={{ marginTop: 6 }}>
                                {output.what_would_change_my_mind.map((x, i) => <li key={i}>{x}</li>)}
                            </ul>

                            <div style={{ marginTop: 10, fontWeight: 700 }}>Follow-up questions</div>
                            <ul style={{ marginTop: 6 }}>
                                {output.follow_up_questions.map((q, i) => <li key={i}>{q}</li>)}
                            </ul>
                        </div>
                    </Card>
                ) : null}
            </div>
        </div>
    );
}

createRoot(document.getElementById("root")!).render(<App />);