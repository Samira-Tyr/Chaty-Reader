import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.jsx";
import "./app/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("No se encontró el contenedor de Chaty Reader.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
