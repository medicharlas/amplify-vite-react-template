import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// Your API Gateway endpoint (prefer WITHOUT trailing slash)
const API_URL = "https://l93d45v2bl.execute-api.us-east-1.amazonaws.com/prod/";

type Criterion = { criterion: string; weight?: number };

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
        B_score?: number;
    }>;
    tradeoffs: string[];
    risks: { A: string[]; B: string[] };
    what_would_change_my_mind: string[];
    follow_up_questions: string[];
};

const prettyJson = (obj: unknown) => JSON.stringify(obj, null, 2);

const App: React.FC = () => {
    const [decision, setDecision] = useState("");
    const [optionA, setOptionA] = useState("");
    const [optionB, setOptionB] = useState("");
    const [userContext, setUserContext] = useState("");

    // Optional criteria input as simple text lines: "Cost: 30"
    const [criteriaText, setCriteriaText] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [rawResponse, setRawResponse] = useState<string>("");
    const [result, setResult] = useState<DecisionOutput | null>(null);

    const parsedCriteria: Criterion[] | undefined = useMemo(() => {
        const lines = criteriaText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

        if (lines.length === 0) return undefined;

        const criteria: Criterion[] = [];
        for (const line of lines) {
            // Accept formats:
            // "Cost: 30" or "Cost - 30" or "Cost"
            const m = line.match(/^(.+?)\s*[:\-]\s*(\d{1,3})\s*$/);
            if (m) {
                criteria.push({ criterion: m[1].trim(), weight: Number(m[2]) });
            } else {
                criteria.push({ criterion: line });
            }
        }
        return criteria;
    }, [criteriaText]);

    const submit = async () => {
        setError("");
        setRawResponse("");
        setResult(null);

        const d = decision.trim();
        const a = optionA.trim();
        const b = optionB.trim();

        if (!d || !a || !b) {
            setError("Please fill Decision, Option A, and Option B.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                decision: d,
                optionA: a,
                optionB: b,
                criteria: parsedCriteria, // optional
                userContext: userContext.trim(), // optional
            };

            const resp = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const text = await resp.text(); // read as text first for better debugging
            setRawResponse(text);

            if (!resp.ok) {
                // Your Lambda returns JSON: { error: "...", details?: "..." }
                try {
                    const j = JSON.parse(text);
                    throw new Error(j.error || `HTTP ${resp.status}`);
                } catch {
                    throw new Error(`HTTP ${resp.status}: ${text}`);
                }
            }

            const json = JSON.parse(text);
            // Your lambda returns: { output: { ...schema... } }
            const out = json?.output;
            if (!out) {
                setError("API returned success, but missing 'output'. Check Lambda response shape.");
                return;
            }
            setResult(out as DecisionOutput);
        } catch (e: any) {
            setError(e?.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    const copy = async () => {
        const toCopy = result ? prettyJson(result) : rawResponse || "";
        await navigator.clipboard.writeText(toCopy);
    };

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", margin: 32, maxWidth: 980 }}>
            <h2 style={{ marginBottom: 8 }}>Decision Coach Bot</h2>
            <p style={{ marginTop: 0, opacity: 0.8 }}>
                Compare Option A vs Option B with weighted criteria and a clear recommendation.
            </p>

            <div style={{ display: "grid", gap: 12 }}>
                <div>
                    <label style={{ fontWeight: 600 }}>Decision (what are you deciding?)</label>
                    <input
                        value={decision}
                        onChange={(e) => setDecision(e.target.value)}
                        placeholder='e.g., "Choose between two job offers"'
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                    />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                        <label style={{ fontWeight: 600 }}>Option A</label>
                        <textarea
                            value={optionA}
                            onChange={(e) => setOptionA(e.target.value)}
                            placeholder="Describe Option A..."
                            style={{ width: "100%", height: 110, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                        />
                    </div>
                    <div>
                        <label style={{ fontWeight: 600 }}>Option B</label>
                        <textarea
                            value={optionB}
                            onChange={(e) => setOptionB(e.target.value)}
                            placeholder="Describe Option B..."
                            style={{ width: "100%", height: 110, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                        />
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                        <label style={{ fontWeight: 600 }}>
                            Criteria (optional, one per line — you can include weights)
                        </label>
                        <textarea
                            value={criteriaText}
                            onChange={(e) => setCriteriaText(e.target.value)}
                            placeholder={`Example:\nCost: 25\nGrowth: 25\nWork-life balance: 20\nCommute: 15\nRisk: 15`}
                            style={{ width: "100%", height: 140, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                        />
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                            If you leave this blank, the bot will infer 5–8 criteria automatically.
                        </div>
                    </div>

                    <div>
                        <label style={{ fontWeight: 600 }}>User context (optional)</label>
                        <textarea
                            value={userContext}
                            onChange={(e) => setUserContext(e.target.value)}
                            placeholder="Anything important about you or constraints (budget, timeline, family, goals, etc.)"
                            style={{ width: "100%", height: 140, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                        />
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                        onClick={submit}
                        disabled={loading}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "none",
                            background: "#111",
                            color: "white",
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Analyzing..." : "Get Recommendation"}
                    </button>

                    <button
                        onClick={copy}
                        disabled={!rawResponse && !result}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #ccc",
                            background: "white",
                            cursor: !rawResponse && !result ? "not-allowed" : "pointer",
                        }}
                    >
                        Copy Output
                    </button>

                    {error ? <span style={{ color: "crimson" }}>{error}</span> : null}
                </div>

                <hr style={{ margin: "18px 0" }} />

                <h3 style={{ margin: 0 }}>Result</h3>

                {result ? (
                    <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 18 }}>
                                Recommendation: {result.recommendation}
                            </div>
                            <div style={{ opacity: 0.85 }}>{result.one_line_summary}</div>
                            <div style={{ marginTop: 8, opacity: 0.85 }}>
                                Scores — A: {result.scores?.A} | B: {result.scores?.B}
                            </div>
                        </div>

                        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>Score breakdown</div>
                            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{prettyJson(result.score_breakdown)}</pre>
                        </div>

                        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>Tradeoffs & risks</div>
                            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                {prettyJson({ tradeoffs: result.tradeoffs, risks: result.risks })}
              </pre>
                        </div>

                        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>What would change my mind</div>
                            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{prettyJson(result.what_would_change_my_mind)}</pre>
                        </div>

                        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>Follow-up questions</div>
                            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{prettyJson(result.follow_up_questions)}</pre>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: 12, border: "1px dashed #bbb", borderRadius: 10, opacity: 0.85 }}>
                        No result yet. Fill in Decision + Option A + Option B and click “Get Recommendation”.
                    </div>
                )}

                <details style={{ marginTop: 10 }}>
                    <summary style={{ cursor: "pointer" }}>Debug: Raw API response</summary>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{rawResponse || "(empty)"}</pre>
                </details>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
