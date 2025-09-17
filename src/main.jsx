import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css"; // ถ้ามี Tailwind/Styles ของโปรเจกต์

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);