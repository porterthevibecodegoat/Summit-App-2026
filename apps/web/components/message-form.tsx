"use client";

import { FormEvent, useState } from "react";

export function MessageForm({ recipient }: { recipient: string }) {
  const [status, setStatus] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Sending request…");
    const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json() as { message?: string; error?: string };
    setStatus(data.message ?? data.error ?? "Unable to send request.");
    if (response.ok) event.currentTarget.reset();
  }
  return <form className="messageForm" onSubmit={submit}>
    <input type="hidden" name="recipient" value={recipient} />
    <div className="fieldRow"><label>Your name<input name="senderName" required /></label><label>Your email<input name="senderEmail" type="email" required /></label></div>
    <label>What would you like to do?<select name="intent" defaultValue="connect"><option value="connect">Connect</option><option value="meet">Meet at the summit</option><option value="chat">Chat</option></select></label>
    <label>Message<textarea name="message" minLength={10} maxLength={1000} required placeholder={`Write a respectful note to ${recipient}…`} /></label>
    <label className="consent"><input type="checkbox" name="consent" value="yes" required /> I agree to share my name, email, and message with this person.</label>
    <button className="primaryButton" type="submit">Send connection request</button>
    {status && <p className="formStatus" role="status">{status}</p>}
  </form>;
}
