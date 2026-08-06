"use client";

import { useRef, useState } from "react";

type State = "idle" | "loading" | "success" | "duplicate" | "error";

export default function NewsletterForm() {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = inputRef.current?.value?.trim() ?? "";
    if (!email) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setErrorMsg(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (data?.duplicate) {
        setState("duplicate");
        return;
      }

      setState("success");
    } catch {
      setState("error");
      setErrorMsg("A network error occurred. Please try again.");
    }
  }

  if (state === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          padding: "1.75rem 2rem",
          border: "1px solid rgba(200,165,110,0.3)",
          background: "rgba(200,165,110,0.06)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.6875rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--bc-gold-light)",
            fontWeight: 500,
          }}
        >
          Welcome to Bansari Privé
        </span>
        <p
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: "clamp(1.125rem, 1.5vw, 1.375rem)",
            fontWeight: 400,
            fontStyle: "italic",
            lineHeight: 1.5,
            color: "var(--bc-cream)",
            margin: 0,
          }}
        >
          You are now on the inside.
        </p>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.875rem",
            lineHeight: 1.65,
            color: "rgba(255,253,249,0.55)",
            margin: 0,
            fontWeight: 300,
          }}
        >
          Expect early access to new arrivals, private launches, and member-only offers in your inbox.
        </p>
      </div>
    );
  }

  if (state === "duplicate") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "1.75rem 2rem",
          border: "1px solid rgba(200,165,110,0.2)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.875rem",
            lineHeight: 1.65,
            color: "rgba(255,253,249,0.65)",
            margin: 0,
            fontWeight: 300,
          }}
        >
          You are already a Bansari Privé member. We will be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <label
        htmlFor="newsletter-email"
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "0.6875rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(255,253,249,0.5)",
          fontWeight: 500,
        }}
      >
        Your email address
      </label>

      <div style={{ display: "flex", gap: 0 }}>
        <input
          ref={inputRef}
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={state === "loading"}
          style={{
            flex: 1,
            height: "3.25rem",
            background: "transparent",
            border: "1px solid rgba(200,165,110,0.25)",
            borderRight: "none",
            color: "var(--bc-cream)",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.9375rem",
            fontWeight: 300,
            padding: "0 1.25rem",
            outline: "none",
            transition: "border-color var(--bc-base-t)",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(200,165,110,0.6)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(200,165,110,0.25)";
          }}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          aria-label="Subscribe to newsletter"
          style={{
            height: "3.25rem",
            padding: "0 1.75rem",
            background: "var(--bc-gold)",
            border: "none",
            color: "var(--bc-dark)",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.6875rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: state === "loading" ? "wait" : "pointer",
            opacity: state === "loading" ? 0.7 : 1,
            transition: "opacity var(--bc-base-t), background var(--bc-base-t)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (state !== "loading") {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bc-gold-light)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bc-gold)";
          }}
        >
          {state === "loading" ? "Joining\u2026" : "Join Privé"}
        </button>
      </div>

      {state === "error" && errorMsg && (
        <p
          role="alert"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.8125rem",
            color: "#f87171",
            margin: 0,
            fontWeight: 400,
          }}
        >
          {errorMsg}
        </p>
      )}

      <p
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "0.6875rem",
          color: "rgba(255,253,249,0.3)",
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        No spam. Your data stays private. Unsubscribe at any time.
      </p>
    </form>
  );
}
