/**
 * DEMO MODE
 *
 * Credify has no login in the MVP. Instead, the header offers a clearly labelled switch
 * between the two roles. The mode is worked out from the page address (URL):
 *   /analyst...                 -> Analyst view
 *   /, /apply..., /status...    -> Applicant view
 *   anything else (/methodology) -> shared page, neither role highlighted
 *
 * Why derive it from the URL instead of storing it?
 * Nothing needs to be saved or synchronised, the browser's back button always works,
 * and any page can be shared as a link that opens in the right mode.
 */

export type DemoMode = "applicant" | "analyst";

export function modeForPath(pathname: string): DemoMode | null {
  if (pathname.startsWith("/analyst")) return "analyst";
  if (pathname === "/" || pathname.startsWith("/apply") || pathname.startsWith("/status")) {
    return "applicant";
  }
  return null;
}

export const MODE_HOME: Record<DemoMode, string> = {
  applicant: "/",
  analyst: "/analyst",
};
