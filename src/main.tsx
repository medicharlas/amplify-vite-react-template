import { useState } from "react";
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
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [output, setOutput] = useState<DecisionResponse | null>(null);

    function tryExample() {
        setPrompt(
            "I’m deciding between Northern India and Singapore for a 7-day vacation from Hyderabad. Budget is $10,000. I like food, shopping, and easy travel with family."
        );
        setOutput(null);
        setError("");
    }

    async function send() {
        setError("");
        setOutput(null);

        const p = prompt.trim();
        if (!p) {
            setError("Type your dilemma first (include two options if possible).");
            return;
        }

        setLoading(true);
        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: p }),
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

            setOutput(data.output as DecisionResponse);
        } catch (e: any) {
            setError(e?.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                maxWidth: 760,
                margin: "32px auto",
                padding: 16,
                fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                }}
            >
                <div>
                    <h2 style={{ margin: 0 }}>Decision Coach</h2>
                    <div style={{ color: "#374151", marginTop: 4, fontWeight: 500 }}>
                        Type your dilemma naturally. Example: “India or Singapore for vacation, budget $10k…”
                    </div>
                </div>

                {/* Readable secondary button */}
                <button
                    onClick={tryExample}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                        color: "#0f172a",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                    title="Fill the textbox with a sample decision prompt"
                >
                    Try an example
                </button>
            </div>

            {/* Input box */}
            <div
                style={{
                    marginTop: 14,
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fff",
                }}
            >
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your dilemma here… (include two options if possible)"
            style={{
                width: "100%",
                minHeight: 120,
                border: "1px solid #d1d5db",
                borderRadius: 12,
                padding: 12,
                resize: "vertical",
            }}
        />

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button
                        onClick={send}
                        disabled={loading}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "none",
                            background: loading ? "#9ca3af" : "#111827",
                            color: "#fff",
                            fontWeight: 700,
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Thinking…" : "Send"}
                    </button>
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
                        {error}
                    </div>
                ) : null}
            </div>

            {/* Output */}
            {output ? (
                <div
                    style={{
                        marginTop: 14,
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 14,
                        background: "#fff",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ fontSize: 18 }}>
                            Recommendation: <b>{output.recommendation}</b>
                        </div>
                        <div style={{ color: "#6b7280" }}>
                            A {output.scores.A} • B {output.scores.B}
                        </div>
                    </div>

                    <div style={{ marginTop: 8 }}>{output.one_line_summary}</div>

                    <div style={{ marginTop: 12, fontWeight: 800 }}>Top reasons</div>
                    <ul style={{ marginTop: 6 }}>
                        {output.score_breakdown.slice(0, 4).map((c, idx) => (
                            <li key={idx}>
                                <b>{c.criterion}</b>: {c.why}
                            </li>
                        ))}
                    </ul>

                    {output.follow_up_questions?.length ? (
                        <>
                            <div style={{ marginTop: 12, fontWeight: 800 }}>Questions to clarify</div>
                            <ul style={{ marginTop: 6 }}>
                                {output.follow_up_questions.slice(0, 5).map((q, i) => (
                                    <li key={i}>{q}</li>
                                ))}
                            </ul>
                        </>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

createRoot(document.getElementById("root")!).render(<App />);