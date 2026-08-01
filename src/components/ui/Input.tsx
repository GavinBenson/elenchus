import type { InputHTMLAttributes } from 'react'

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none ${className}`}
    />
  )
}
