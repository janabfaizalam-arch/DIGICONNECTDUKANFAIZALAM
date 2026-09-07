import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  FileText,
  Image,
  Lightbulb,
  Palette,
  Search,
  Settings,
  ShieldCheck,
  Share2,
  Sparkles,
} from "lucide-react";

/**
 * The Content Engine's own screens, in pipeline order.
 *
 * One list, used by the sub-navigation, by the admin panel's map in
 * `lib/admin/nav.ts` and by the contract test that checks no screen exists
 * without a door. This project has already had twenty-five admin screens that
 * worked and that nothing linked to; putting the list in one place is how the
 * thirteenth one here does not become the twenty-sixth of those.
 */
export type ContentEngineScreen = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Which pipeline stage this screen is the home of. */
  stage: string;
};

export const CONTENT_ENGINE_HOME = "/admin/content-engine";

export const CONTENT_ENGINE_SCREENS: ContentEngineScreen[] = [
  {
    href: CONTENT_ENGINE_HOME,
    label: "Overview",
    description: "The whole pipeline, this week's numbers, and what is waiting for you",
    icon: Sparkles,
    stage: "dashboard",
  },
  {
    href: "/admin/content-engine/ideas",
    label: "Ideas",
    description: "The ranked idea bank, and where the next post comes from",
    icon: Lightbulb,
    stage: "MINE",
  },
  {
    href: "/admin/content-engine/angles",
    label: "Angles",
    description: "Five hooks for one topic, with a recommendation",
    icon: Search,
    stage: "ANGLE",
  },
  {
    href: "/admin/content-engine/drafts",
    label: "Drafts",
    description: "The master content for each post, and edits to it",
    icon: FileText,
    stage: "WRITE",
  },
  {
    href: "/admin/content-engine/fact-check",
    label: "Fact check",
    description: "Every claim, its source, and who verified it",
    icon: ShieldCheck,
    stage: "FACT_CHECK",
  },
  {
    href: "/admin/content-engine/designs",
    label: "Designs",
    description: "Canvas, headline and colours for each platform",
    icon: Palette,
    stage: "DESIGN",
  },
  {
    href: "/admin/content-engine/repurpose",
    label: "Repurpose",
    description: "One post packaged natively for each platform",
    icon: Share2,
    stage: "REPURPOSE",
  },
  {
    href: "/admin/content-engine/approval",
    label: "Approval",
    description: "Content, claims, design and versions together, before anything goes out",
    icon: CheckCircle2,
    stage: "APPROVAL",
  },
  {
    href: "/admin/content-engine/calendar",
    label: "Calendar",
    description: "What is scheduled, and the weekly rhythm behind it",
    icon: CalendarClock,
    stage: "SCHEDULE",
  },
  {
    href: "/admin/content-engine/analytics",
    label: "Analytics",
    description: "What each post did, and what the numbers say about the next one",
    icon: BarChart3,
    stage: "LEARN",
  },
  {
    href: "/admin/content-engine/brand",
    label: "Brand voice",
    description: "How DigiConnect sounds, derived from posts that worked",
    icon: Image,
    stage: "brand",
  },
  {
    href: "/admin/content-engine/settings",
    label: "Settings",
    description: "What the engine may do on its own, and what is connected",
    icon: Settings,
    stage: "settings",
  },
];
