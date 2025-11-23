import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";

const apiUrl = "https://l93d45v2bl.execute-api.us-east-1.amazonaws.com/prod/";

Amplify.configure(apiUrl);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
