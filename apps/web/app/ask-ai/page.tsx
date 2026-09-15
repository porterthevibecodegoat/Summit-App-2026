"use client";

import { FormEvent, useState } from "react";

export default function AskAiPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask me anything about the approved summit schedule, venue, people, and experience.");
  async function submit(event: FormEvent) { event.preventDefault(); const response = await fetch("/api/ask-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) }); const data = await response.json() as { answer: string }; setAnswer(data.answer); }
  return <main className="contentPage narrow"><p className="eyebrow">Summit concierge</p><h1>Ask AI</h1><div className="askPagePanel"><p>{answer}</p><form onSubmit={submit}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What would you like to know?" required /><button className="primaryButton">Ask</button></form></div><p className="disclaimer">Answers are limited to approved summit information and are not medical advice or emergency support.</p></main>;
}
