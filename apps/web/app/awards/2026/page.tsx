import type { Metadata } from "next";
import { AwardsYearPage } from "../../../components/awards-year-page";
export const metadata: Metadata = { title: "2026 Not Alone Awards", description: "The 2026 Not Alone Awards at Wynn Las Vegas." };
export default function Awards2026Page() { return <AwardsYearPage year={2026} />; }
