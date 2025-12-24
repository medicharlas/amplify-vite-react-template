import { useState } from "react";
import { createRoot } from "react-dom/client";

const API_URL = "https://l93d45v2bl.execute-api.us-east-1.amazonaws.com/prod/";

function App() {
    const [decision, setDecision] = useState("");
    const [optionA, setOptionA] = useState("");
    const [optionB, setOptionB] = useState("");
    const [context, setContext] = useState("");
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function submit() {
        setError("");
        setResult(null);

        if (!decision || !optionA || !optionB) {
            setError("Please enter Decision, Option A, and Option B.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    decision,
                    optionA,
                    optionB,
                    userContext: context
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Server error");
            }

            setResult(data.output);
        } catch (e: any) {
            setError(e.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "system-ui" }}>
            <h2>Decision Coach</h2>
            <p>Compare two choices and get a clear recommendation.</p>

            <input
                placeholder="Decision (e.g. India or USA for vacation?)"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                style={{ width: "100%", padding: 10, marginBottom: 10 }}
            />

            <input
                placeholder="Option A"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                style={{ width: "100%", padding: 10, marginBottom: 10 }}
            />

            <input
                placeholder="Option B"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                style={{ width: "100%", padding: 10, marginBottom: 10 }}
            />

            <textarea
                placeholder="Optional context (budget, priorities, constraints)"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                style={{ width: "100%", padding: 10, height: 80 }}
            />

            <button
                onClick={submit}
                disabled={loading}
                style={{ marginTop: 10, padding: "10px 16px" }}
            >
                {loading ? "Thinking..." : "Get Recommendation"}
            </button>

            {error && <p style={{ color: "red" }}>{error}</p>}

            {result && (
                <div style={{ marginTop: 20 }}>
                    <h3>Recommendation: {result.recommendation}</h3>
                    <p>{result.one_line_summary}</p>

                    <p>
                        <b>Score A:</b> {result.scores.A} &nbsp; | &nbsp;
                        <b>Score B:</b> {result.scores.B}
                    </p>

                    <h4>Key Reasons</h4>
                    <ul>
                        {result.score_breakdown.map((r: any, i: number) => (
                            <li key={i}>
                                <b>{r.criterion}</b>: {r.why}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

createRoot(document.getElementById("root")!).render(<App />);