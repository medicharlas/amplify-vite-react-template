import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const API_URL = "https://l93d45v2bl.execute-api.us-east-1.amazonaws.com/prod/";

type Output = {
    recommendation: "A" | "B" | "Tie";
    confidence: "High" | "Medium" | "Low";
    decision_score: number;
    one_line_summary: string;
    simple_summary: string;
    why_this_works: string[];
    risks: string[];
    what_would_change_my_mind: string[];
    follow_up_question: string;
};

type DualOutput = {
    practical: Output;
    bold: Output;
};

function Badge({ text }: { text: string }) {
    return (
        <span
            style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                fontWeight: 800,
                fontSize: 12,
                color: "#111827",
            }}
        >
      {text}
    </span>
    );
}

function Meter({ value }: { value: number }) {
    const v = Math.max(0, Math.min(100, value));
    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151" }}>
                <span>Decision score</span>
                <span style={{ fontWeight: 900, color: "#111827" }}>{v}/100</span>
            </div>
            <div style={{ height: 10, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
                <div style={{ width: `${v}%`, height: "100%", background: "#111827" }} />
            </div>
        </div>
    );
}

function ResultCard({
                        title,
                        subtitle,
                        data,
                    }: {
    title: string;
    subtitle: string;
    data: Output;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 14,
                background: "#fff",
                minWidth: 0,
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>
                    <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{subtitle}</div>
                </div>
                <Badge text={`Confidence: ${data.confidence}`} />
            </div>

            <div style={{ marginTop: 10, fontSize: 16 }}>
                Recommendation: <b>{data.recommendation}</b>
            </div>
            <div style={{ marginTop: 6, color: "#111827" }}>{data.simple_summary}</div>

            <Meter value={data.decision_score} />

            <button
                onClick={() => setOpen((v) => !v)}
                style={{
                    marginTop: 12,
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    background: "#f3f4f6",
                    color: "#111827",
                    fontWeight: 800,
                    cursor: "pointer",
                }}
            >
                {open ? "Hide reasoning" : "Show reasoning"}
            </button>

            {open ? (
                <div style={{ marginTop: 12, color: "#0f172a" }}>
                    <div style={{ fontWeight: 900, marginTop: 8 }}>Why this works</div>
                    <ul style={{ marginTop: 6 }}>
                        {data.why_this_works.map((x, i) => (
                            <li key={i} style={{ lineHeight: 1.5 }}>
                                {x}
                            </li>
                        ))}
                    </ul>

                    <div style={{ fontWeight: 900, marginTop: 10 }}>Risks</div>
                    <ul style={{ marginTop: 6 }}>
                        {data.risks.map((x, i) => (
                            <li key={i} style={{ lineHeight: 1.5 }}>
                                {x}
                            </li>
                        ))}
                    </ul>

                    <div style={{ fontWeight: 900, marginTop: 10 }}>What could change your mind</div>
                    <ul style={{ marginTop: 6 }}>
                        {data.what_would_change_my_mind.map((x, i) => (
                            <li key={i} style={{ lineHeight: 1.5 }}>
                                {x}
                            </li>
                        ))}
                    </ul>

                    <div style={{ fontWeight: 900, marginTop: 10 }}>One question to ask</div>
                    <div style={{ marginTop: 6 }}>{data.follow_up_question}</div>
                </div>
            ) : null}
        </div>
    );
}

function App() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [out, setOut] = useState<DualOutput | null>(null);
    const [error, setError] = useState("");

    async function submit() {
        setError("");
        setOut(null);

        if (!prompt.trim()) {
            setError("Please type your dilemma.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

            setOut(data.output as DualOutput);
        } catch (e: any) {
            setError(e?.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                maxWidth: 1000,
                margin: "30px auto",
                padding: 16,
                fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            }}
        >
            <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 30, fontWeight: 900 }}>Decision Coach</div>
                <div style={{ color: "#374151" }}>
                    Stuck between two choices? See what a <b>safe</b> mindset and a <b>bold</b> mindset would recommend..
                </div>
            </div>

            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Switch teams or stay? Option A: long commute, known team. Option B: short commute, unknown growth. Constraints: family time matters."
                style={{
                    width: "100%",
                    minHeight: 130,
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                }}
            />

            <button
                onClick={submit}
                disabled={loading}
                style={{
                    marginTop: 12,
                    padding: "10px 16px",
                    borderRadius: 12,
                    border: "none",
                    background: "#111827",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: loading ? "not-allowed" : "pointer",
                }}
            >
                {loading ? "Comparing…" : "Compare styles"}
            </button>

            {error ? <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>{error}</div> : null}

            {out ? (
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14 }}>
                    <ResultCard
                        title="Practical & safe"
                        subtitle="Minimize regret, protect downside."
                        data={out.practical}
                    />
                    <ResultCard
                        title="Bold & growth-oriented"
                        subtitle="Optimize upside, accept uncertainty."
                        data={out.bold}
                    />
                </div>
            ) : null}
        </div>
    );
}

createRoot(document.getElementById("root")!).render(<App />);