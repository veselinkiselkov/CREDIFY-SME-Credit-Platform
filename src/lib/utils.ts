import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines CSS class names and resolves Tailwind conflicts.
 * Example: cn("px-4", isLarge && "px-6") returns "px-6" when isLarge is true.
 * This is the standard shadcn/ui helper.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
