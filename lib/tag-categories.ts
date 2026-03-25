export const TAG_CATEGORIES = ["medium", "genre", "movement", "mood"] as const;
export type TagCategory = (typeof TAG_CATEGORIES)[number];

export function isTagCategory(value: string): value is TagCategory {
  return (TAG_CATEGORIES as readonly string[]).includes(value);
}
