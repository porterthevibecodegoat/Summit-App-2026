"use client";

import { FormEvent, useState } from "react";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function TicketCheckout() {
  const [donation, setDonation] = useState(0);
  const [status, setStatus] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Checking availability…");
    const response = await fetch("/api/tickets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), donation }) });
    const result = await response.json() as { message?: string };
    setStatus(result.message ?? "We could not complete that request.");
  }
  return <section className="ticketSection" id="rsvp"><div className="ticketPitch"><p className="eyebrow">RSVP & get a free ticket</p><h2>Your ticket is free. Your support makes this possible.</h2><p>We are a nonprofit and rely on donations, so we appreciate any amount you are kind enough to share with us. A donation is completely optional and is not required to receive a ticket.</p><strong>Tickets are limited and going fast. Only 1,000 free tickets are available.</strong></div><form className="ticketCard" onSubmit={submit}><label>Full name<input name="name" required autoComplete="name" /></label><label>Email<input name="email" required type="email" autoComplete="email" /></label><div className="donationHeading"><label htmlFor="donation">Optional donation</label><output>{dollars.format(donation)}</output></div><input id="donation" className="donationSlider" type="range" min="0" max="1000000" step="100" value={donation} onChange={(event) => setDonation(Number(event.target.value))} aria-valuetext={dollars.format(donation)} /><div className="sliderLabels"><span>$0</span><span>$1,000,000</span></div><p className="checkoutNote">No donation will be charged until secure payment processing is connected.</p><button className="primaryButton" type="submit">Request my free ticket</button>{status && <p className="formStatus" role="status">{status}</p>}</form></section>;
}
