import Link from "next/link";
import { Directory } from "../components/directory";
import { TicketCheckout } from "../components/ticket-checkout";

export default function HomePage() {
  return <main>
    <section className="hero"><div className="heroContent"><p className="eyebrow">November 2–4, 2026 · Wynn Las Vegas</p><h1>Not Alone Summit</h1><p className="heroCopy">A premier national convening bringing together leading CEOs, artists, athletes, philanthropists, clinicians, researchers, and youth ambassadors to advance emotional and mental health.</p><div className="heroActions"><Link href="#directory" className="primaryButton">Meet the 2026 Summit</Link><Link href="/schedule" className="secondaryButton">View schedule</Link></div></div><div className="heroArt" aria-hidden="true" /></section>
    <section className="recapSection"><div className="recapIntro"><p className="eyebrow">Experience the Summit</p><h2>See what connection looks like.</h2><p>The official Not Alone Summit recap plays automatically, followed by the people and experiences coming together in 2026.</p></div><div className="videoFrame"><iframe src="https://www.youtube-nocookie.com/embed/bMAASyMiFHM?autoplay=1&mute=1&controls=0&loop=1&playlist=bMAASyMiFHM&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1" title="Not Alone Summit recap video" allow="autoplay; encrypted-media; picture-in-picture" /></div></section>
    <section className="jewelQuote"><blockquote>“The Davos of Human Development”</blockquote><p>— Jewel</p></section>
    <Directory />
    <TicketCheckout />
    <section className="installSection"><div><p className="eyebrow">Website + app</p><h2>Follow along with the summit.</h2><p>Use every attendee feature in your browser, or add the website to your home screen. Native app users can also receive in-app notifications.</p></div><div className="installCard"><span className="appIcon">NA</span><div><strong>Not Alone Summit</strong><p>Install from your browser’s Share or Install menu.</p></div></div></section>
  </main>;
}
