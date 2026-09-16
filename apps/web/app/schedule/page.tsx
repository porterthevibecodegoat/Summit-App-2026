import Link from "next/link";
import { groupPublishedProgramByDay } from "@not-alone/domain";
import { ScheduleBrowser } from "../../components/schedule-browser";
import { getPublicSnapshot, publicScheduleItems } from "../../lib/snapshot";

export const metadata = { title: "Summit Schedule" };

export default async function SchedulePage() {
  const snapshot = await getPublicSnapshot();
  const items = publicScheduleItems(snapshot);
  const pendingDays = groupPublishedProgramByDay(snapshot).filter(day => day.notes.length).map(day => ({
    key: day.date, label: day.dayLabel.split(",")[0]!, date: day.dayLabel.split(", ")[1]!,
    notes: day.notes.map(note => ({ id: note.id, title: note.title, body: note.body }))
  }));

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
      <ScheduleBrowser items={items} pendingDays={pendingDays} />
    </main>
  );
}
