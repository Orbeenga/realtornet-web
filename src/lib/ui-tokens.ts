export const UI_TOKENS = {
  FILTER_PILL:
    "h-11 rounded-xl border border-gray-200 bg-white px-4 shadow-sm",
  SEARCH_INPUT: "h-12",
  SEARCH_BUTTON: "h-12",
} as const;

export type UIToken = keyof typeof UI_TOKENS;
