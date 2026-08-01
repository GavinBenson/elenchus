import { twMerge } from 'tailwind-merge'

/**
 * Merges a primitive's base Tailwind classes with a caller's overrides.
 * Plain string concatenation does not work: Tailwind has no specificity
 * resolution, so whether a caller's `px-8` beats a base `px-3` depends on
 * compiled stylesheet order rather than argument order. twMerge resolves
 * conflicts by keeping the last class in each conflicting group.
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return twMerge(classes.filter(Boolean).join(' '))
}
