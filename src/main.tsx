import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const API_URL = "https://l93d45v2bl.execute-api.us-east-1.amazonaws.com/prod/"; // keep as-is

type CriterionInput = { criterion: string; weight: number };

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

// Some APIs return { output: DecisionOutput }, others return DecisionOutput directly.
type ApiResponse = { output?: DecisionOutput; error?: string; message?: string } & Record<string, any>;

const App: React.FC = () => {
    const [decision, setDecision] = useState("");
    const [optionA, setOptionA] = useState("");
    const [optionB, setOptionB] = useState("");
    const [userContext, setUserContext] = useState("");

    const [criteriaEnabled, setCriteriaEnabled] = useState(false);
    const [criteria, setCriteria] = useState<CriterionInput[]>([
        { criterion: "Cost", weight: 25 },
        { criterion: "Long-term growth", weight: 25 },
        { criterion: "Risk", weight: 25 },
        { criterion: "Lifestyle fit", weight: 25 },
    ]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [result, setResult] = useState<DecisionOutput | null>(null);
    const [rawJson, setRawJson] = useState<string>("");

    const weightsSum = useMemo(
        () => criteria.reduce((sum, c) => sum + (Number.isFinite(c.weight) ? c.weight : 0), 0),
        [criteria]
    );

    const updateCriterion = (idx: number, patch: Partial<CriterionInput>) => {
        setCriteria((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
    };

    const addCriterion = () => setCriteria((prev) => [...prev, { criterion: "", weight: 10 }]);
    const removeCriterion = (idx: number) => setCriteria((prev) => prev.filter((_, i) => i !== idx));

    // Helper: safe JSON parsing
    const parseJsonSafely = async (res: Response) => {
        const text = await res.text();
        if (!text) return { text: "", json: null as any };

        try {
            return { text, json: JSON.parse(text) };
        } catch {
            return { text, json: null as any };
        }
    };

    const submit = async () => {
        setError("");
        setResult(null);
        setRawJson("");

        const d = decision.trim();
        const a = optionA.trim();
        const b = optionB.trim();

        if (!d || !a || !b) {
            setError("Please fill Decision, Option A, and Option B.");
            return;
        }

        const payload: any = {
            decision: d,
            optionA: a,
            optionB: b,
            userContext: userContext.trim(),
        };

        if (criteriaEnabled) {
            payload.criteria = criteria
                .filter((c) => c.criterion.trim())
                .map((c) => ({ criterion: c.criterion.trim(), weight: Number(c.weight) }));
        }

        setLoading(true);

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const { text, json } = await parseJsonSafely(res);

            if (!res.ok) {
                // Show the most useful error we can
                const msg =
                    (json && (json.error || json.message)) ||
                    text ||
                    `HTTP ${res.status} ${res.statusText}`;
                throw new Error(msg);
            }

            // If backend returned non-JSON but status 200, still fail clearly
            if (!json) {
                throw new Error(
                    `API returned non-JSON response (status 200). Response was: ${text.slice(0, 300)}`
                );
            }

            const data = json as ApiResponse;

            const out: DecisionOutput | undefined =
                data.output ?? (data as any); // accept direct DecisionOutput

            // Basic shape check
            if (!out || !out.recommendation || !out.scores) {
                throw new Error(
                    "API response JSON did not match expected format. Expected { output: DecisionOutput } or DecisionOutput."
                );
            }

            setResult(out);
            setRawJson(JSON.stringify(out, null, 2));
        } catch (e: any) {
            // Common CORS/network failures show up here with TypeError "Failed to fetch"
            const msg = e?.message || "Request failed";
            if (msg.toLowerCase().includes("failed to fetch")) {
                setError(
                    "Network/CORS error: the browser could not call the API. Check API Gateway CORS (OPTIONS) and Access-Control-Allow-Origin headers."
                );
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const copyJson = async () => {
        try {
            if (!rawJson) return;
            await navigator.clipboard.writeText(rawJson);
        } catch {
            setError("Could not copy to clipboard (browser permission issue).");
        }
    };

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", margin: 24, maxWidth: 980 }}>
            <h2 style={{ marginBottom: 4 }}>Decision Coach</h2>
            <p style={{ marginTop: 0, opacity: 0.75 }}>
                Compare Option A vs Option B with weighted criteria and clear tradeoffs.
            </p>

            <div style={{ display: "grid", gap: 12 }}>
                <div>
                    <label style={{ fontWeight: 600 }}>Decision</label>
                    <input
                        value={decision}
                        onChange={(e) => setDecision(e.target.value)}
                        placeholder="e.g., Should I move to Seattle or stay in Bellevue?"
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                    />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                        <label style={{ fontWeight: 600 }}>Option A</label>
                        <textarea
                            value={optionA}
                            onChange={(e) => setOptionA(e.target.value)}
                            placeholder="Describe Option A"
                            style={{ width: "100%", height: 90, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                        />
                    </div>
                    <div>
                        <label style={{ fontWeight: 600 }}>Option B</label>
                        <textarea
                            value={optionB}
                            onChange={(e) => setOptionB(e.target.value)}
                            placeholder="Describe Option B"
                            style={{ width: "100%", height: 90, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ fontWeight: 600 }}>Your context (optional)</label>
                    <textarea
                        value={userContext}
                        onChange={(e) => setUserContext(e.target.value)}
                        placeholder="Constraints, priorities, timeline, budget, family, commute, etc."
                        style={{ width: "100%", height: 90, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                    />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                        type="checkbox"
                        checked={criteriaEnabled}
                        onChange={(e) => setCriteriaEnabled(e.target.checked)}
                    />
                    <span style={{ fontWeight: 600 }}>Provide my own criteria + weights</span>
                    {criteriaEnabled && (
                        <span style={{ opacity: 0.7 }}>(weights sum: {weightsSum} — ideally ~100)</span>
                    )}
                </div>

                {criteriaEnabled && (
                    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px", gap: 8, fontWeight: 700 }}>
                            <div>Criterion</div>
                            <div>Weight</div>
                            <div />
                        </div>

                        {criteria.map((c, idx) => (
                            <div
                                key={idx}
                                style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px", gap: 8, marginTop: 8 }}
                            >
                                <input
                                    value={c.criterion}
                                    onChange={(e) => updateCriterion(idx, { criterion: e.target.value })}
                                    placeholder="e.g., Cost"
                                    style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                                />
                                <input
                                    type="number"
                                    value={c.weight}
                                    onChange={(e) => updateCriterion(idx, { weight: Number(e.target.value) })}
                                    style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                                />
                                <button
                                    onClick={() => removeCriterion(idx)}
                                    style={{ borderRadius: 8, border: "1px solid #ddd", background: "white", cursor: "pointer" }}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}

                        <div style={{ marginTop: 10 }}>
                            <button
                                onClick={addCriterion}
                                style={{ borderRadius: 8, border: "1px solid #ddd", background: "white", padding: "8px 10px", cursor: "pointer" }}
                            >
                                + Add criterion
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={submit}
                        disabled={loading}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "none",
                            background: "#4f46e5",
                            color: "white",
                            cursor: "pointer",
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? "Analyzing..." : "Get recommendation"}
                    </button>

                    {rawJson && (
                        <button
                            onClick={copyJson}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "white",
                                cursor: "pointer",
                            }}
                        >
                            Copy JSON
                        </button>
                    )}
                </div>

                {error && (
                    <div style={{ padding: 12, borderRadius: 10, background: "#fee2e2", color: "#7f1d1d" }}>
                        {error}
                    </div>
                )}

                {result && (
                    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
                        <h3 style={{ marginTop: 0 }}>
                            Recommendation: <span style={{ color: "#4f46e5" }}>{result.recommendation}</span>
                        </h3>
                        <p style={{ marginTop: 0, opacity: 0.9 }}>{result.one_line_summary}</p>

                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                            <div style={{ padding: 10, borderRadius: 10, border: "1px solid #eee" }}>
                                <div style={{ fontWeight: 700 }}>Score A</div>
                                <div style={{ fontSize: 22 }}>{result.scores?.A ?? "-"}</div>
                            </div>
                            <div style={{ padding: 10, borderRadius: 10, border: "1px solid #eee" }}>
                                <div style={{ fontWeight: 700 }}>Score B</div>
                                <div style={{ fontSize: 22 }}>{result.scores?.B ?? "-"}</div>
                            </div>
                        </div>

                        <h4>Score breakdown</h4>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                <tr>
                                    <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Criterion</th>
                                    <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>Weight</th>
                                    <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>A</th>
                                    <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: 8 }}>B</th>
                                    <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Why</th>
                                </tr>
                                </thead>
                                <tbody>
                                {result.score_breakdown?.map((row, i) => (
                                    <tr key={i}>
                                        <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>{row.criterion}</td>
                                        <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8, textAlign: "right" }}>{row.weight}</td>
                                        <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8, textAlign: "right" }}>{row.A_score}</td>
                                        <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8, textAlign: "right" }}>{row.B_score}</td>
                                        <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>{row.why}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <h4>Tradeoffs</h4>
                        <ul>{result.tradeoffs?.map((t, i) => <li key={i}>{t}</li>)}</ul>

                        <h4>Risks</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>Option A</div>
                                <ul>{result.risks?.A?.map((r, i) => <li key={i}>{r}</li>)}</ul>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700 }}>Option B</div>
                                <ul>{result.risks?.B?.map((r, i) => <li key={i}>{r}</li>)}</ul>
                            </div>
                        </div>

                        <h4>What would change my mind</h4>
                        <ul>{result.what_would_change_my_mind?.map((x, i) => <li key={i}>{x}</li>)}</ul>

                        <h4>Follow-up questions</h4>
                        <ul>{result.follow_up_questions?.map((q, i) => <li key={i}>{q}</li>)}</ul>

                        <details style={{ marginTop: 10 }}>
                            <summary style={{ cursor: "pointer" }}>Raw JSON</summary>
                            <pre style={{ whiteSpace: "pre-wrap" }}>{rawJson}</pre>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
};

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");
const root = ReactDOM.createRoot(rootEl);
root.render(<App />);
