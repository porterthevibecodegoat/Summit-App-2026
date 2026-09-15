import Link from "next/link";
import { ScheduleBrowser } from "../../../components/schedule-browser";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { getPublicSnapshot, publicScheduleItems } from "../../../lib/snapshot";

export const metadata = { title: "Summit Schedule" };

export default async function SchedulePage() {
  const snapshot = await getPublicSnapshot();
  const items = publicScheduleItems(snapshot);

  return (
    <main className="companion-theme">
      <SiteHeader />
      <section className="page-intro section-shell">
        <div>
          <p className="eyebrow purple">Published event schedule</p>
          <h1>Plan the day at a glance.</h1>
          <p>Times are shown in {snapshot.event.timeZone.replace("_", " ")}. Select a day to see only that day&apos;s programming.</p>
        </div>
        <Link className="button button-dark" href="/summit/live">Live companion</Link>
      </section>
      <section className="schedule-section section-shell">
        <ScheduleBrowser items={items} />
      </section>
      <SiteFooter />
    </main>
  );
}
