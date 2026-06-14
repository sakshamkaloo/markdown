"use client";

import { useState, useRef } from "react";

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

export default function ConverterPage() {
  const [url, setUrl] = useState("");
  const [headings, setHeadings] = useState("none");
  const [codeBlocks, setCodeBlocks] = useState("indented");
  const [suggestions, setSuggestions] = useState("reject");
  const [markdown, setMarkdown] = useState("");

  const [status, setStatus] = useState<Status>({
    type: "idle",
    message: "",
  });

  const [copied, setCopied] = useState(false);

  const outputRef = useRef<HTMLTextAreaElement>(null);

  async function convert() {
    if (!url.trim()) {
      setStatus({ type: "error", message: "Please enter a Google Docs URL." });
      return;
    }
    setStatus({ type: "loading", message: "Fetching document…" });
    setMarkdown("");
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), headings, codeBlocks, suggestions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", message: data.error || "Conversion failed." });
        return;
      }
      setMarkdown(data.markdown);
      setStatus({ type: "success", message: "✓ Converted successfully" });
    } catch {
      setStatus({ type: "error", message: "Network error. Please try again." });
    }
  }

  function copyMarkdown() {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "document.md";
    a.click();
  }

  return (
    <>
      {/* Main */}
      <main
        style={{
          minHeight: "100vh",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "90px 20px 48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle top glow — light mode friendly */}
        <div
          style={{
            position: "fixed",
            top: "-200px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "800px",
            height: "500px",
            background: "radial-gradient(ellipse, rgba(124,106,247,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div style={{ width: "100%", maxWidth: "820px", position: "relative", zIndex: 1 }}>

          {/* ── Hero ── */}
          <div style={{ textAlign: "center", marginBottom: "52px" }}>

            {/* Badge */}
            <div
              style={{
                display: "inline-block",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#6d28d9",
                background: "rgba(124,106,247,0.10)",
                border: "1px solid rgba(124,106,247,0.20)",
                padding: "6px 16px",
                borderRadius: "999px",
                marginBottom: "28px",
              }}
            >
              GOOGLE DOCS CONVERTER
            </div>

            {/* ✅ Fixed: dark text so it's visible on white background */}
            <h1
              style={{
                fontSize: "clamp(40px, 7vw, 68px)",
                lineHeight: 1.1,
                fontWeight: 800,
                color: "#0f172a",
                fontFamily: "Inter, sans-serif",
                letterSpacing: "-0.03em",
                marginBottom: "20px",
              }}
            >
              Convert Google Docs
              <br />
              into Markdown
            </h1>

            <p
              style={{
                color: "#64748b",
                fontSize: "18px",
                lineHeight: 1.7,
                maxWidth: "650px",
                margin: "0 auto",
              }}
            >
              Enter any public Google Docs URL and convert it to Markdown instantly. 
			  Perfect for documentation, content migration, and archiving. Free to use. No sign up required.
            </p>
          </div>

          {/* ── Converter Card ── */}
          <div
            style={{
              background: "#111114",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "24px",
              padding: "28px",
              boxShadow: "0 20px 80px rgba(0,0,0,0.18)",
            }}
          >
            {/* URL Input */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && convert()}
                placeholder="https://docs.google.com/document/d/..."
                style={{
                  flex: 1,
                  height: "56px",
                  background: "#18181c",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "14px",
                  padding: "0 18px",
                  color: "#fff",
                  fontSize: "15px",
                  outline: "none",
                }}
              />
              <button
                onClick={convert}
                disabled={status.type === "loading"}
                style={{
                  height: "56px",
                  padding: "0 24px",
                  border: "none",
                  borderRadius: "14px",
                  background: "#7c6af7",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 10px 30px rgba(124,106,247,0.35)",
                }}
              >
                Convert
              </button>
            </div>

            {/* Settings */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
              {[
                {
                  label: "Headings", val: headings, set: setHeadings,
                  opts: [{ v: "none", l: "None" }, { v: "linkable", l: "Linkable" }],
                },
                {
                  label: "Code Blocks", val: codeBlocks, set: setCodeBlocks,
                  opts: [{ v: "indented", l: "Indented" }, { v: "fenced", l: "Fenced" }],
                },
                {
                  label: "Suggestions", val: suggestions, set: setSuggestions,
                  opts: [{ v: "reject", l: "Reject" }, { v: "accept", l: "Accept" }],
                },
              ].map(({ label, val, set, opts }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#9ca3af", fontSize: "13px" }}>{label}</span>
                  <select
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    style={{
                      background: "#18181c",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#fff",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      outline: "none",
                    }}
                  >
                    {opts.map((o) => (
                      <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Status */}
            {status.message && (
              <div
                style={{
                  marginBottom: "16px",
                  color:
                    status.type === "error" ? "#ff5c5c"
                    : status.type === "success" ? "#4ade80"
                    : "#7c6af7",
                  fontSize: "14px",
                }}
              >
                {status.message}
              </div>
            )}

            {/* Output */}
            {markdown && (
              <div style={{ marginTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                  <h3 style={{ color: "#fff", fontSize: "16px" }}>Markdown Output</h3>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={copyMarkdown}
                      style={{
                        background: "#18181c",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#fff",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        cursor: "pointer",
                      }}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={downloadMarkdown}
                      style={{
                        background: "#18181c",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#fff",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        cursor: "pointer",
                      }}
                    >
                      Download
                    </button>
                  </div>
                </div>
                <textarea
                  ref={outputRef}
                  readOnly
                  value={markdown}
                  style={{
                    width: "100%",
                    minHeight: "380px",
                    background: "#0f0f12",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "20px",
                    color: "#fff",
                    resize: "vertical",
                    outline: "none",
                    lineHeight: 1.7,
                    fontSize: "14px",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
