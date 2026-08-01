/**
 * First letter of the first and last word. Middle names are skipped so
 * "Ana Beatriz Lima" reads as AL, matching how ATS tools abbreviate.
 */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Deterministic hue from the name, so a person keeps the same colour across
 * every screen without storing anything.
 */
function hueFor(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360
  }
  return hash
}

export function Avatar({
  name,
  'data-testid': testId,
}: {
  name: string
  'data-testid'?: string
}) {
  const hue = hueFor(name)
  return (
    <span
      data-testid={testId}
      aria-hidden="true"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
      style={{
        backgroundColor: `oklch(0.88 0.05 ${hue})`,
        color: `oklch(0.35 0.08 ${hue})`,
      }}
    >
      {initialsFor(name)}
    </span>
  )
}
