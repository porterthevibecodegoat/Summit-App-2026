import { OriginalSummitPage } from "../components/original-event-page";
import { getReviewedContentSnapshot } from "../lib/snapshot";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <OriginalSummitPage year={2026} snapshot={await getReviewedContentSnapshot()} />;
}
