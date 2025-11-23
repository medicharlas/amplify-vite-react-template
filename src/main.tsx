import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// Replace with your API Gateway endpoint
const API_URL = "https://l93d45v2bl.execute-api.us-east-1.amazonaws.com/prod/";

const App: React.FC = () => {
    const [prompt, setPrompt] = useState("");
    const [output, setOutput] = useState("");
    const [loading, setLoading] = useState(false);

    const generate = async () => {
        if (!prompt) return;
        setLoading(true);
        setOutput("");

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setOutput(data.output || "No response from API.");
        } catch (err: any) {
            setOutput(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ fontFamily: "sans-serif", margin: "40px" }}>
            <h2>Get answers to your question</h2>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type your prompt..."
                style={{ width: "100%", height: "100px" }}
            ></textarea>
            <br />
            <br />
            <button onClick={generate} disabled={loading}>
                {loading ? "Generating..." : "Generate"}
            </button>
            <h3>Output:</h3>
            <textarea
                value={output}
                readOnly
                style={{ width: "100%", height: "100px" }}
            ></textarea>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
