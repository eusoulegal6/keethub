import type { ReactNode } from "react";

export interface NormalizedGameEntry {
  id: string;
  version: string;
  name: { default: string };
  description: { default: string };
  status: "stable" | "beta" | "draft";
  supportedPlayers: { min: number; max: number; recommended?: number };
  monetization: "free" | "paid";
  category: string[];
  badges: string[];
  assets: {
    thumbnail?: string;
    patchNotesUrl?: string;
  };
  navigation: {
    category: string;
    priority: number;
  };
  visibleIf: string[];
  route: { slug: string };
  featureFlags: string[];
  metrics?: {
    concurrentUsers?: number;
    uptimePercentage?: number;
  };
  plugin?: {
    previewComponent?: string;
    moduleId?: string;
  };
}

export type GamePreviewComponent = () => ReactNode;