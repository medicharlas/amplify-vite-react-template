import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const API_URL = "https://l93d45v2bl.execute-api.us-east-1.amazonaws.com/prod/";

type Output = {
    recommendation: "A" | "B" | "Tie";
    confidence: "High" | "Medium" | "Low";
    decision_score: number;
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

function Meter({ value }: { value: number }) {
    const v = Math.max(0, Math.min(100, value));
    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "#374151" }}>
                Decision confidence: <b>{v}/100</b>
            </div>
            <div style={{ height: 8, background: "#e5e7eb", borderRadius: 999 }}>
                <div
                    style={{
                        width: `${v}%`,
                        height: "100%",
                        background: "#111827",
                        borderRadius: 999,
                    }}
                />
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
                padding: 16,
                background: "#fff",
                minWidth: 0,
            }}
        >
            <h3 style={{ marginBottom: 4 }}>{title}</h3>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                {subtitle}
            </div>

            <div style={{ fontSize: 16 }}>
                <b>Recommendation:</b> {data.recommendation}
            </div>
            <p style={{ marginTop: 6 }}>{data.simple_summary}</p>

            <Meter value={data.decision_score} />

            <div style={{ marginTop: 6 }}>
                Confidence: <b>{data.confidence}</b>
            </div>

            <button
                onClick={() => setOpen(!open)}
                style={{
                    marginTop: 12,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#f3f4f6",
                    color: "#111827",
                    fontWeight: 600,
                    cursor: "pointer",
                }}
            >
                {open ? "Hide reasoning" : "Show reasoning"}
            </button>

            {open && (
                <div style={{ marginTop: 12 }}>
                    <h4>Why this works</h4>
                    <ul>
                        {data.why_this_works.map((x, i) => (
                            <li key={i}>{x}</li>
                        ))}
                    </ul>

                    <h4>Risks</h4>
                    <ul>
                        {data.risks.map((x, i) => (
                            <li key={i}>{x}</li>
                        ))}
                    </ul>

                    <h4>What could change your mind</h4>
                    <ul>
                        {data.what_would_change_my_mind.map((x, i) => (
                            <li key={i}>{x}</li>
                        ))}
                    </ul>

                    <h4>Question to think about</h4>
                    <p>{data.follow_up_question}</p>
                </div>
            )}
        </div>
    );
}

function FAQ() {
    return (
        <section
            style={{
                maxWidth: 900,
                margin: "80px auto 40px",
                padding: "0 16px",
                fontSize: 15,
            }}
        >
            <h2 style={{ marginBottom: 16 }}>Common questions</h2>

            <p>
                <strong>What does this website do?</strong>
                <br />
                Decision Coach helps you choose between two options by showing how
                different mindsets (safe vs bold) approach the same decision.
            </p>

            <p>
                <strong>Is this a chatbot like ChatGPT?</strong>
                <br />
                No. This tool is focused on structured decision-making, not open-ended
                conversation. It highlights tradeoffs clearly.
            </p>

            <p>
                <strong>What decisions work best here?</strong>
                <br />
                Career moves, job switches, money choices, travel plans, and any situation
                where you’re stuck between two options.
            </p>
        </section>
    );
}

function App() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState<DualOutput | null>(null);
    const [error, setError] = useState("");

    async function submit() {
        setError("");
        setOutput(null);

        if (!prompt.trim()) {
            setError("Please describe your dilemma.");
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
            if (!res.ok) throw new Error(data?.error || "Request failed");

            setOutput(data.output as DualOutput);
        } catch (e: any) {
            setError(e.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div
                style={{
                    maxWidth: 1000,
                    margin: "40px auto",
                    padding: 16,
                    fontFamily:
                        "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                }}
            >
                <h1>Decision Coach</h1>
                <p style={{ color: "#374151" }}>
                    Stuck between two choices? See what a <b>safe</b> mindset and a <b>bold</b> mindset would recommend..

                </p>

                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={'Example: Switch teams or stay? Option A: long commute, known team. Option B: short commute, unknown growth. Constraints: family time matters.\n'}
                    style={{
                        width: "100%",
                        minHeight: 140,
                        padding: 12,
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        marginTop: 12,
                    }}
                />

                <button
                    onClick={submit}
                    disabled={loading}
                    style={{
                        marginTop: 12,
                        padding: "10px 16px",
                        borderRadius: 10,
                        background: "#111827",
                        color: "#fff",
                        border: "none",
                        fontWeight: 700,
                        cursor: loading ? "not-allowed" : "pointer",
                    }}
                >
                    {loading ? "Comparing advice…" : "Get advice (safe vs bold)"}
                </button>

                {error && (
                    <div style={{ marginTop: 10, color: "#b91c1c" }}>{error}</div>
                )}

                {output && (
                    <div
                        style={{
                            marginTop: 20,
                            display: "grid",
                            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
                            gap: 16,
                        }}
                    >
                        <ResultCard
                            title="Practical & Safe"
                            subtitle="Minimize regret and protect stability"
                            data={output.practical}
                        />
                        <ResultCard
                            title="Bold & Growth-Oriented"
                            subtitle="Optimize upside and accept uncertainty"
                            data={output.bold}
                        />
                    </div>
                )}
            </div>

            <FAQ />
        </>
    );
}

createRoot(document.getElementById("root")!).render(<App />);