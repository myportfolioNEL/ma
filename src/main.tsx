import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import { initQuality } from "./lib/quality";

/**
 * main.tsx — the only entry point.
 *
 * index.css is imported here and nowhere else: Vite then bundles the four
 * stylesheets in the order tokens -> base -> ui -> sections, which is the
 * order the cascade depends on.
 */
/* قبل أي رسم: أيّ نسخة يستحقّ هذا الجهاز؟ الوسم يصل إلى <html> قبل أن يُركَّب
   أوّل مكوّن، فلا يرى الزائر وميض تحوّل من ثقيل إلى خفيف. */
initQuality();

const container = document.getElementById("root");

if (!container) {
  throw new Error('Mount node #root was not found in index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
