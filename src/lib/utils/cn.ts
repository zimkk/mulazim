import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Combine class names and let later Tailwind utilities win over earlier conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
