import type { Visibility } from "../types";

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: "Private",
  internal: "Internal",
  post: "Public",
};

export const VISIBILITY_VALUES = Object.keys(VISIBILITY_LABELS) as Visibility[];
