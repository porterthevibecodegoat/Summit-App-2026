import { getActiveOperationalNotices, getCountdownLabel, getEventPhase, getNowAndUpcoming, toEventTimeRange } from "@not-alone/domain";
import Link from "next/link";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { getPublicSnapshot } from "../../../lib/snapshot";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live Event Companion" };

export default async function LivePage() {
  const snapshot = await getPublicSnapshot();
  const nowUtc = new Date().toISOString();
  const timeline = getNowAndUpcoming({ snapshot, nowUtc, audienceGroups: ["public"] });
  const notices = getActiveOperationalNotices(snapshot, nowUtc, ["public"]);
  const phase = getEventPhase(snapshot, nowUtc, ["public"]);
  const current = timeline.current[0];
  const next = timeline.upcoming[0];

  return (
    <main className="companion-theme">
      <SiteHeader />
      <section className="companion-intro section-shell">
        <div>
          <p className="eyebrow purple">Not Alone Summit</p>
          <h1>Event companion</h1>
          <p>{snapshot.event.dateLabel} | {snapshot.event.venueName}</p>
        </div>
        <div className={`phase-badge phase-${phase}`}>{phase === "before" ? "Event preview" : phase === "after" ? "Event complete" : phase === "empty" ? "Schedule pending" : "Live event"}</div>
      </section>

      {notices.length > 0 ? (
        <section className="notice-stack section-shell" aria-label="Important event updates">
          {notices.map((notice) => (
            <article className={`notice notice-${notice.severity}`} key={notice.id}>
              <strong>{notice.title}</strong><p>{notice.body}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="live-board section-shell">
        <article className="now-panel">
          <div className="panel-label"><span className="live-dot" /> {current ? "Live now" : phase === "before" ? "Coming up" : "Current status"}</div>
          {current ? (
            <>
              <h2>{current.title}</h2>
              <p>{current.summary}</p>
              <div className="event-facts"><strong>{toEventTimeRange(current, snapshot.event.timeZone)}</strong><span>{current.locationName}</span></div>
            </>
          ) : next ? (
            <>
              <h2>{next.title}</h2>
              <p>Begins in {getCountdownLabel(next.startUtc, nowUtc)}.</p>
              <div className="event-facts"><strong>{toEventTimeRange(next, snapshot.event.timeZone)}</strong><span>{next.locationName}</span></div>
            </>
          ) : (
            <><h2>Thank you for gathering with us.</h2><p>The published program has concluded. Event information and resources remain available below.</p></>
          )}
        </article>

        <aside className="next-panel">
          <p className="panel-label">Next</p>
          {timeline.upcoming.slice(current ? 0 : 1, current ? 3 : 4).map((item) => (
            <div className="next-item" key={item.id}>
              <strong>{item.title}</strong>
              <span>{toEventTimeRange(item, snapshot.event.timeZone)}</span>
              <small>{item.locationName}</small>
            </div>
          ))}
          {timeline.upcoming.length === 0 ? <p>No additional published sessions.</p> : null}
        </aside>
      </section>

      <section className="companion-actions section-shell">
        <Link href="/summit/schedule"><strong>Full schedule</strong><span>Browse every published session by day.</span></Link>
        <a href="https://www.inspiringchildren.org/summit-venue" rel="noreferrer"><strong>Venue</strong><span>Find Wynn Las Vegas and venue details.</span></a>
        <a href="https://www.inspiringchildren.org/summit-contact" rel="noreferrer"><strong>Event help</strong><span>Contact the Summit team for assistance.</span></a>
      </section>
      <SiteFooter />
    </main>
  );
}
