"use client";

import { FormEvent, useState } from "react";

export function AskAiBubble() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask about the schedule, venue, people, or summit experience.");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setAnswer("Looking that up…");
    const response = await fetch("/api/ask-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
    const data = await response.json() as { answer?: string };
    setAnswer(data.answer ?? "I couldn't find that in the approved summit information.");
  }
  return <div className="aiBubble">
    {open && <div className="aiPanel"><div className="aiPanelHeader"><div><span>✦</span><strong>Ask AI</strong></div><button onClick={() => setOpen(false)}>×</button></div><p>{answer}</p><form onSubmit={submit}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a summit question…" required /><button type="submit">Send</button></form><small>Answers use approved summit information. For emergencies call 911 or 988.</small></div>}
    <button className="aiLauncher" onClick={() => setOpen(!open)}><span>✦</span> Ask AI</button>
  </div>;
}
