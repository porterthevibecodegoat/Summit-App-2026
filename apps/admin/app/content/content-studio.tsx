"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { EventNotice, EventSnapshot, Faq, MediaItem, Speaker, Sponsor } from "@not-alone/validation";
import { getStaffAuthHeaders } from "../staff-auth-bridge";

type Section = "event" | "speakers" | "faqs" | "sponsors" | "media" | "notices";
type EditableEvent = Pick<EventSnapshot["event"], "name" | "organizationName" | "dateLabel" | "venueName" | "city" | "positioning" | "presentedBy" | "poweredBy" | "tracks">;

export function ContentStudio({
  initialSnapshot,
  environmentName,
  mode
}: {
  initialSnapshot: EventSnapshot;
  environmentName: string;
  mode: "local-adapter" | "supabase";
}) {
  const [active, setActive] = useState<Section>("event");
  const [event, setEvent] = useState<EditableEvent>(pickEvent(initialSnapshot));
  const [speakers, setSpeakers] = useState(initialSnapshot.speakers);
  const [faqs, setFaqs] = useState(initialSnapshot.faqs);
  const [sponsors, setSponsors] = useState(initialSnapshot.sponsors);
  const [media, setMedia] = useState(initialSnapshot.media);
  const [notices, setNotices] = useState(initialSnapshot.notices);
  const [contentPages] = useState(initialSnapshot.contentPages);
  const [dirty, setDirty] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState(`Published revision ${initialSnapshot.revision} loaded from ${mode}.`);
  const counts = useMemo(() => ({ speakers: speakers.length, faqs: faqs.length, sponsors: sponsors.length, media: media.length, notices: notices.length }), [speakers, faqs, sponsors, media, notices]);

  function changed() {
    setDirty(true);
    setMessage("Unpublished content changes");
  }

  async function publish() {
    if (!window.confirm("Publish these content changes to every attendee device? The schedule and reminder times will remain unchanged.")) return;
    setPublishing(true);
    setMessage("Publishing content revision...");
    try {
      const response = await fetch("/api/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
        body: JSON.stringify({
          confirmPublish: true,
          content: {
            event,
            speakers: speakers.map(normalizeSpeaker),
            faqs,
            sponsors: sponsors.map(normalizeSponsor),
            media,
            notices: notices.map(normalizeNotice),
            contentPages
          }
        })
      });
      const result = await response.json() as { ok?: boolean; error?: string; issues?: string[]; publishedRevision?: number; message?: string };
      if (!response.ok || !result.ok) throw new Error([result.error, ...(result.issues ?? [])].filter(Boolean).join(" "));
      setDirty(false);
      setMessage(`Revision ${result.publishedRevision} published. ${result.message ?? "Attendee content is live."}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Content publication failed.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="content contentStudio">
      <div className="pageHeader">
        <div>
          <div className="kicker">Attendee content · {environmentName} · {mode}</div>
          <h1>Content Studio</h1>
          <p className="headerCopy">Manage the information attendees see outside the schedule. Changes go live together as one reviewed revision.</p>
        </div>
        <button className="primaryButton" disabled={!dirty || publishing} onClick={() => void publish()} type="button">
          {publishing ? "Publishing..." : "Review & Publish"}
        </button>
      </div>

      <div className={`contentStatus ${dirty ? "contentStatusDirty" : ""}`} role="status">{message}</div>

      <div className="contentTabs" role="tablist" aria-label="Content sections">
        <Tab active={active === "event"} label="Event information" onClick={() => setActive("event")} />
        <Tab active={active === "speakers"} label={`Speakers ${counts.speakers}`} onClick={() => setActive("speakers")} />
        <Tab active={active === "faqs"} label={`FAQs ${counts.faqs}`} onClick={() => setActive("faqs")} />
        <Tab active={active === "sponsors"} label={`Sponsors ${counts.sponsors}`} onClick={() => setActive("sponsors")} />
        <Tab active={active === "media"} label={`Media ${counts.media}`} onClick={() => setActive("media")} />
        <Tab active={active === "notices"} label={`Live notices ${counts.notices}`} onClick={() => setActive("notices")} />
      </div>

      {active === "event" ? <EventEditor value={event} onChange={(next) => { setEvent(next); changed(); }} /> : null}
      {active === "speakers" ? <SpeakerEditor items={speakers} eventId={initialSnapshot.event.id} onChange={(next) => { setSpeakers(next); changed(); }} /> : null}
      {active === "faqs" ? <FaqEditor items={faqs} onChange={(next) => { setFaqs(next); changed(); }} /> : null}
      {active === "sponsors" ? <SponsorEditor items={sponsors} onChange={(next) => { setSponsors(next); changed(); }} /> : null}
      {active === "media" ? <MediaEditor items={media} onChange={(next) => { setMedia(next); changed(); }} /> : null}
      {active === "notices" ? <NoticeEditor items={notices} eventId={initialSnapshot.event.id} onChange={(next) => { setNotices(next); changed(); }} /> : null}
    </section>
  );
}

function Tab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button aria-selected={active} className={active ? "active" : ""} onClick={onClick} role="tab" type="button">{label}</button>;
}

function EventEditor({ value, onChange }: { value: EditableEvent; onChange: (value: EditableEvent) => void }) {
  const field = (key: keyof EditableEvent, next: string) => onChange({ ...value, [key]: key === "tracks" ? next.split("\n").map((item) => item.trim()).filter(Boolean) : next });
  return (
    <section className="contentEditor">
      <div className="editorHeading"><div><div className="label">Core details</div><h2>Event information</h2></div></div>
      <div className="contentFormGrid">
        <Field label="Event name" value={value.name} onChange={(v) => field("name", v)} />
        <Field label="Organization" value={value.organizationName} onChange={(v) => field("organizationName", v)} />
        <Field label="Dates" value={value.dateLabel} onChange={(v) => field("dateLabel", v)} />
        <Field label="Venue" value={value.venueName} onChange={(v) => field("venueName", v)} />
        <Field label="City" value={value.city} onChange={(v) => field("city", v)} />
        <Field label="Presented by" value={value.presentedBy} onChange={(v) => field("presentedBy", v)} />
        <Field label="Powered by" value={value.poweredBy} onChange={(v) => field("poweredBy", v)} />
        <Field area label="Positioning" value={value.positioning} onChange={(v) => field("positioning", v)} />
        <Field area label="Tracks (one per line)" value={value.tracks.join("\n")} onChange={(v) => field("tracks", v)} />
      </div>
    </section>
  );
}

function SpeakerEditor({ items, eventId, onChange }: { items: Speaker[]; eventId: string; onChange: (items: Speaker[]) => void }) {
  return <CollectionEditor title="Speakers" addLabel="Add speaker" onAdd={() => onChange([...items, { id: uuid(), eventId, name: "New speaker", role: "Role", bio: "", headshotUrl: null, published: false }])}>
    {items.map((item) => <RecordEditor key={item.id} title={item.name} published={item.published} onPublished={(v) => onChange(update(items, item.id, { published: v }))} onRemove={() => onChange(remove(items, item.id))}>
      <Field label="Name" value={item.name} onChange={(v) => onChange(update(items, item.id, { name: v }))} />
      <Field label="Role" value={item.role} onChange={(v) => onChange(update(items, item.id, { role: v }))} />
      <Field label="Headshot URL" value={item.headshotUrl ?? ""} onChange={(v) => onChange(update(items, item.id, { headshotUrl: v || null }))} />
      <Field area label="Biography" value={item.bio} onChange={(v) => onChange(update(items, item.id, { bio: v }))} />
    </RecordEditor>)}
  </CollectionEditor>;
}

function FaqEditor({ items, onChange }: { items: Faq[]; onChange: (items: Faq[]) => void }) {
  return <CollectionEditor title="Frequently asked questions" addLabel="Add FAQ" onAdd={() => onChange([...items, { id: uuid(), question: "New question", answer: "Answer", category: "General", published: false }])}>
    {items.map((item) => <RecordEditor key={item.id} title={item.question} published={item.published} onPublished={(v) => onChange(update(items, item.id, { published: v }))} onRemove={() => onChange(remove(items, item.id))}>
      <Field label="Question" value={item.question} onChange={(v) => onChange(update(items, item.id, { question: v }))} />
      <Field label="Category" value={item.category} onChange={(v) => onChange(update(items, item.id, { category: v }))} />
      <Field area label="Answer" value={item.answer} onChange={(v) => onChange(update(items, item.id, { answer: v }))} />
    </RecordEditor>)}
  </CollectionEditor>;
}

function SponsorEditor({ items, onChange }: { items: Sponsor[]; onChange: (items: Sponsor[]) => void }) {
  return <CollectionEditor title="Sponsors and partners" addLabel="Add sponsor" onAdd={() => onChange([...items, { id: uuid(), name: "New sponsor", tier: "Partner", websiteUrl: null, logoUrl: null, published: false }])}>
    {items.map((item) => <RecordEditor key={item.id} title={item.name} published={item.published} onPublished={(v) => onChange(update(items, item.id, { published: v }))} onRemove={() => onChange(remove(items, item.id))}>
      <Field label="Name" value={item.name} onChange={(v) => onChange(update(items, item.id, { name: v }))} />
      <Field label="Tier" value={item.tier} onChange={(v) => onChange(update(items, item.id, { tier: v }))} />
      <Field label="Website URL" value={item.websiteUrl ?? ""} onChange={(v) => onChange(update(items, item.id, { websiteUrl: v || null }))} />
      <Field label="Logo URL" value={item.logoUrl ?? ""} onChange={(v) => onChange(update(items, item.id, { logoUrl: v || null }))} />
    </RecordEditor>)}
  </CollectionEditor>;
}

function MediaEditor({ items, onChange }: { items: MediaItem[]; onChange: (items: MediaItem[]) => void }) {
  return <CollectionEditor title="Media library" addLabel="Add media" onAdd={() => onChange([...items, { id: uuid(), title: "New media", type: "image", url: "", altText: "", published: false }])}>
    {items.map((item) => <RecordEditor key={item.id} title={item.title} published={item.published} onPublished={(v) => onChange(update(items, item.id, { published: v }))} onRemove={() => onChange(remove(items, item.id))}>
      <Field label="Title" value={item.title} onChange={(v) => onChange(update(items, item.id, { title: v }))} />
      <label className="contentField"><span>Type</span><select value={item.type} onChange={(e) => onChange(update(items, item.id, { type: e.target.value as MediaItem["type"] }))}><option value="image">Image</option><option value="video">Video</option><option value="link">Link</option></select></label>
      <Field label="Asset URL" value={item.url} onChange={(v) => onChange(update(items, item.id, { url: v }))} />
      <Field label="Alt text" value={item.altText} onChange={(v) => onChange(update(items, item.id, { altText: v }))} />
    </RecordEditor>)}
  </CollectionEditor>;
}

function NoticeEditor({ items, eventId, onChange }: { items: EventNotice[]; eventId: string; onChange: (items: EventNotice[]) => void }) {
  return <CollectionEditor title="Live notices" addLabel="Add notice" onAdd={() => onChange([...items, { id: uuid(), eventId, title: "Important update", body: "Add the attendee-facing details here.", severity: "change", startsAtUtc: new Date().toISOString(), endsAtUtc: null, published: false }])}>
    {items.map((item) => <RecordEditor key={item.id} title={item.title} published={item.published} onPublished={(v) => onChange(update(items, item.id, { published: v }))} onRemove={() => onChange(remove(items, item.id))}>
      <Field label="Headline" value={item.title} onChange={(v) => onChange(update(items, item.id, { title: v }))} />
      <label className="contentField"><span>Priority</span><select value={item.severity} onChange={(e) => onChange(update(items, item.id, { severity: e.target.value as EventNotice["severity"] }))}><option value="info">Information</option><option value="change">Schedule change</option><option value="urgent">Urgent</option></select></label>
      <Field label="Starts at (UTC ISO)" value={item.startsAtUtc} onChange={(v) => onChange(update(items, item.id, { startsAtUtc: v }))} />
      <Field label="Ends at (UTC ISO, optional)" value={item.endsAtUtc ?? ""} onChange={(v) => onChange(update(items, item.id, { endsAtUtc: v || null }))} />
      <Field area label="Message" value={item.body} onChange={(v) => onChange(update(items, item.id, { body: v }))} />
    </RecordEditor>)}
  </CollectionEditor>;
}

function CollectionEditor({ title, addLabel, onAdd, children }: { title: string; addLabel: string; onAdd: () => void; children: ReactNode }) {
  return <section className="contentEditor"><div className="editorHeading"><h2>{title}</h2><button className="secondaryButton" onClick={onAdd} type="button">+ {addLabel}</button></div><div className="recordList">{children}</div></section>;
}

function RecordEditor({ title, published, onPublished, onRemove, children }: { title: string; published: boolean; onPublished: (value: boolean) => void; onRemove: () => void; children: ReactNode }) {
  return <article className="recordEditor"><div className="recordHeader"><strong>{title}</strong><div className="recordActions"><label className="publishToggle"><input checked={published} onChange={(e) => onPublished(e.target.checked)} type="checkbox" /> Visible</label><button className="dangerTextButton" onClick={onRemove} type="button">Remove</button></div></div><div className="contentFormGrid">{children}</div></article>;
}

function Field({ label, value, onChange, area = false }: { label: string; value: string; onChange: (value: string) => void; area?: boolean }) {
  return <label className={`contentField ${area ? "wide" : ""}`}><span>{label}</span>{area ? <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} /> : <input value={value} onChange={(e) => onChange(e.target.value)} />}</label>;
}

function pickEvent(snapshot: EventSnapshot): EditableEvent {
  const { name, organizationName, dateLabel, venueName, city, positioning, presentedBy, poweredBy, tracks } = snapshot.event;
  return { name, organizationName, dateLabel, venueName, city, positioning, presentedBy, poweredBy, tracks };
}

function update<T extends { id: string }>(items: T[], id: string, patch: Partial<T>) { return items.map((item) => item.id === id ? { ...item, ...patch } : item); }
function remove<T extends { id: string }>(items: T[], id: string) { return items.filter((item) => item.id !== id); }
function uuid() { return crypto.randomUUID(); }
function normalizeSpeaker(item: Speaker): Speaker { return { ...item, headshotUrl: item.headshotUrl?.trim() || null }; }
function normalizeSponsor(item: Sponsor): Sponsor { return { ...item, websiteUrl: item.websiteUrl?.trim() || null, logoUrl: item.logoUrl?.trim() || null }; }
function normalizeNotice(item: EventNotice): EventNotice { return { ...item, startsAtUtc: item.startsAtUtc.trim(), endsAtUtc: item.endsAtUtc?.trim() || null }; }
