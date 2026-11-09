import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type Nav = Pick<AppRouterInstance, "push" | "replace" | "back">;

// View transition animations removed (they caused jank). Navigation is immediate.
export function transitionPush(router: Nav, href: string) {
  router.push(href);
}

export function transitionReplace(router: Nav, href: string) {
  router.replace(href);
}

export function transitionBack(router: Nav, fallback = "/") {
  if (typeof window !== "undefined" && window.history.length > 1) router.back();
  else router.push(fallback);
}
