import type { Metadata } from "next";
import { AwardsYearPage } from "../../../components/awards-year-page";
import { getReviewedContentSnapshot } from "../../../lib/snapshot";
import { publishedAwardsProgram } from "@not-alone/domain";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "2026 Not Alone Awards", description: "The 2026 Not Alone Awards at Wynn Las Vegas." };
export default async function Awards2026Page() {
  const snapshot = await getReviewedContentSnapshot();
  return <AwardsYearPage year={2026} snapshot={snapshot} program={snapshot ? publishedAwardsProgram(snapshot) : null} />;
}
