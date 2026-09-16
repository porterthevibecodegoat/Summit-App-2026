"use client";

import { useMemo, useState } from "react";
import type { WebScheduleItem } from "../lib/snapshot";

function parts(item: WebScheduleItem) {
  const date = new Date(item.startUtc);
  const timeZone = item.eventTimeZone;
  return {
    key: new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date),
    weekday: new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(date),
    date: new Intl.DateTimeFormat("en-US", { timeZone, month: "long", day: "numeric" }).format(date),
    start: new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(date),
    end: new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(item.endUtc))
  };
}

type PendingDay = { key: string; label: string; date: string; notes: { id: string; title: string; body: string }[] };

export function ScheduleBrowser({ items, pendingDays = [] }: { items: WebScheduleItem[]; pendingDays?: PendingDay[] }) {
  const days = useMemo(() => {
    const grouped = new Map<string, { label: string; date: string; items: WebScheduleItem[] }>();
    for (const item of items) {
      const itemParts = parts(item);
      const current = grouped.get(itemParts.key);
      grouped.set(itemParts.key, {
        label: itemParts.weekday,
        date: itemParts.date,
        items: [...(current?.items ?? []), item]
      });
    }
    for (const day of pendingDays) {
      if (!grouped.has(day.key)) grouped.set(day.key, { label: day.label, date: day.date, items: [] });
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ({ key, ...value }));
  }, [items, pendingDays]);
  const [activeDay, setActiveDay] = useState(days[0]?.key ?? "");
  const selected = days.find((day) => day.key === activeDay) ?? days[0];

  if (!selected) return <p className="empty-state">The published schedule will appear here when available.</p>;

  const timeGroups = new Map<string, WebScheduleItem[]>();
  for (const item of selected.items) {
    const start = parts(item).start;
    timeGroups.set(start, [...(timeGroups.get(start) ?? []), item]);
  }

  return (
    <div className="schedule-browser">
      <div className="day-tabs" role="tablist" aria-label="Schedule days">
        {days.map((day) => (
          <button
            key={day.key}
            type="button"
            role="tab"
            aria-selected={day.key === selected.key}
            className={day.key === selected.key ? "active" : ""}
            onClick={() => setActiveDay(day.key)}
          >
            <strong>{day.label}</strong>
            <span>{day.date}</span>
          </button>
        ))}
      </div>

      <div className="time-groups">
        {[...timeGroups.entries()].map(([time, groupedItems]) => (
          <section className="time-group" key={time} aria-labelledby={`time-${time.replace(/\W/g, "-")}`}>
            <h2 id={`time-${time.replace(/\W/g, "-")}`}>{time}</h2>
            <div className="session-stack">
              {groupedItems.map((item) => {
                const itemParts = parts(item);
                return (
                  <article className={`session-row status-${item.status}`} key={item.id}>
                    <div className="session-row-topline">
                      <span>{itemParts.start} - {itemParts.end}</span>
                      {item.featured ? <strong>Featured</strong> : null}
                      {item.status !== "scheduled" ? <strong>{item.status}</strong> : null}
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                    <div className="session-location">{item.locationName}</div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {pendingDays.find(day => day.key === selected.key)?.notes.map(note => <section key={note.id} className="schedule-pending">
        <h2>{note.title}</h2>
        {note.body.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </section>)}
    </div>
  );
}
