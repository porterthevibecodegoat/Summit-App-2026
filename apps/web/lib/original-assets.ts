import assets from "./original-assets.json";

export function originalAsset(source: string): string {
  const path = assets[source as keyof typeof assets];
  if (!path) throw new Error("Original event image has not been pinned");
  return path;
}
