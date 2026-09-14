import type { ScheduleItem } from "@not-alone/validation";

export function sessionHref(item: Pick<ScheduleItem, "id" | "startUtc" | "title">) {
  return {
    pathname: "/session/[id]" as const,
    params: {
      id: item.id,
      startsAtUtc: item.startUtc,
      title: item.title
    }
  };
}
