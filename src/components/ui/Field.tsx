import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils/cn'

const baseControl =
  'w-full rounded-md border border-[--color-border] bg-[--color-surface] px-3 py-1.5 text-sm text-[--color-text] ' +
  'placeholder:text-[--color-text-subtle] focus-visible:outline-2 focus-visible:outline-offset-0 ' +
  'focus-visible:outline-[--color-accent] disabled:opacity-50'

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-[--color-text-muted]">
      {children}
    </label>
  )
}

export function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseControl, className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseControl, 'min-h-[80px] resize-y', className)} {...rest} />
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseControl, 'cursor-pointer', className)} {...rest}>
      {children}
    </select>
  )
}
