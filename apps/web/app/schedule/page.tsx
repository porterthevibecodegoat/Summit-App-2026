import Link from "next/link";
import { ScheduleBrowser } from "../../components/schedule-browser";
import { getPublicSnapshot, publicScheduleItems } from "../../lib/snapshot";

export const metadata = { title: "Summit Schedule" };

export default async function SchedulePage() {
  const snapshot = await getPublicSnapshot();
  const items = publicScheduleItems(snapshot);

  return (
    <main className="contentPage schedulePage">
      <section className="pageIntro">
        <div>
          <p className="eyebrow">Published event schedule</p>
          <h1>Plan the day at a glance.</h1>
          <p>Times are shown in {snapshot.event.timeZone.replace("_", " ")}. Select a day to see only that day&apos;s programming.</p>
        </div>
        <Link className="primaryButton" href="/summit/live">Live companion</Link>
      </section>
      <ScheduleBrowser items={items} />
    </main>
  );
}
