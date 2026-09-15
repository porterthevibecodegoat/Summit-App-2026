import type { Metadata } from "next";
import { AwardsYearPage } from "../../../components/awards-year-page";
export const metadata: Metadata = { title: "2025 Not Alone Awards", description: "The 2025 Not Alone Awards archive." };
export default function Awards2025Page() { return <AwardsYearPage year={2025} />; }
