"use client";

import { Icon, addCollection, type IconifyJSON } from "@iconify/react";
import bundle from "./iconify-bundle.json";

// The whole app draws from one offline Solar duotone subset (see
// iconify-bundle.json). Registering it once at module scope means no
// runtime fetches to api.iconify.design ever happen — the icon data ships
// in the bundle, which is what keeps icons rendering with no network and
// inside the offline PWA shell.
let registered = false;
if (!registered) {
  addCollection(bundle as unknown as IconifyJSON);
  registered = true;
}

/**
 * Semantic icon names → fully qualified Iconify ids, all from the Solar
 * "bold duotone" family so every glyph shares one weight and consists of a
 * solid layer plus a soft accent. Picked visually against the existing
 * chrome (see the icon-set render notes in the feature commit).
 */
export const UI = {
  // editor toolbar
  bold: "solar:text-bold-bold-duotone",
  italic: "solar:text-italic-bold-duotone",
  strike: "solar:text-cross-bold-duotone",
  code: "solar:code-bold-duotone",
  bulletList: "solar:list-bold-duotone",
  numberedList: "solar:list-ordered-bold-duotone",
  taskList: "solar:checklist-bold-duotone",
  quote: "solar:quote-bold-duotone",
  link: "solar:link-bold-duotone",
  date: "solar:calendar-minimalistic-bold-duotone",
  time: "solar:clock-circle-bold-duotone",
  rule: "solar:minus-bold-duotone",
  // view modes (edit / raw / read)
  edit: "solar:pen-new-square-bold-duotone",
  plain: "solar:document-bold-duotone",
  read: "solar:eye-bold-duotone",
  // note actions
  notes: "solar:notebook-minimalistic-bold-duotone",
  search: "solar:magnifer-bold-duotone",
  zen: "solar:maximize-bold-duotone",
  zenExit: "solar:minimize-bold-duotone",
  ai: "solar:magic-stick-3-bold-duotone",
  ask: "solar:chat-round-question-mark-bold-duotone",
  help: "solar:question-circle-bold-duotone",
  config: "solar:tuning-2-bold-duotone",
  save: "solar:diskette-bold-duotone",
  back: "solar:alt-arrow-left-bold-duotone",
  // top bar
  undo: "solar:undo-left-bold-duotone",
  redo: "solar:undo-right-bold-duotone",
  settings: "solar:settings-bold-duotone",
  // theme
  sun: "solar:sun-2-bold-duotone",
  moon: "solar:moon-stars-bold-duotone",
  // AI menu items
  summarize: "solar:document-text-bold-duotone",
  rewrite: "solar:pen-new-round-bold-duotone",
  grammar: "solar:list-check-bold-duotone",
  expand: "solar:scale-bold-duotone",
  simplify: "solar:minimize-square-2-bold-duotone",
  todo: "solar:checklist-bold-duotone",
  prompt: "solar:chat-round-dots-bold-duotone",
  // settings menu items
  export: "solar:download-minimalistic-bold-duotone",
  delete: "solar:trash-bin-trash-bold-duotone",
  // shared primitives
  close: "solar:close-circle-bold-duotone",
  checkCircle: "solar:check-circle-bold-duotone",
  check: "solar:check-bold-duotone",
  // note cards (home page)
  pin: "solar:pin-bold-duotone",
  chevronDown: "solar:alt-arrow-down-bold-duotone",
} as const;

export type IconId = keyof typeof UI;

/**
 * Renders one of the bundled icons. Color follows `currentColor`, so the
 * same component works on text, buttons and accent backgrounds. The prop
 * surface stays narrow (className/style) on purpose: Icon's render props
 * are stricter than React's SVGProps and every consumer to date only
 * styles glyphs, never attributes them.
 */
export function SolarIcon({
  icon,
  className,
  style,
  title,
}: {
  icon: IconId;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <Icon icon={UI[icon]} aria-hidden="true" className={className} style={style}>
      {title ? <title>{title}</title> : null}
    </Icon>
  );
}
