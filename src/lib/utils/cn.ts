import clsx, { type ClassValue } from 'clsx'

/** Tiny className combiner. Tailwind v4 handles conflicts well enough for this app's needs. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
