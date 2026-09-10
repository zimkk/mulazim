import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, FolderKanban, Sparkles, Timer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormRow, Input } from '@/components/ui/Field'
import { Logo } from '@/components/ui/Logo'
import { m } from '@/lib/motion'
import { useToast } from '@/components/Toast'
import { useAuthStore } from '@/stores/authStore'

const HIGHLIGHTS = [
  { icon: Sparkles, text: 'A deterministic "what needs attention now" queue' },
  { icon: FolderKanban, text: 'Clients, projects and nested tasks in one place' },
  { icon: CalendarClock, text: 'Today, Upcoming, Calendar and weekly review' },
  { icon: Timer, text: 'Built-in time tracking, synced across every device' },
]

export default function Login() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { status, signIn, signUp, error } = useAuthStore()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true })
  }, [status, navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password, displayName || email.split('@')[0]!)
        notify('Welcome to Grid Manager', 'success')
      }
    } catch {
      /* error surfaced from store */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-backdrop grid h-full w-full lg:grid-cols-[1.1fr_1fr]">
      {/* Brand / hero panel */}
      <div className="relative hidden overflow-hidden bg-[var(--color-accent)] lg:block">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              'linear-gradient(150deg, var(--color-accent) 0%, var(--color-accent-2) 55%, color-mix(in srgb, var(--color-accent-2) 60%, #000) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(40rem 30rem at 80% 10%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(30rem 30rem at 10% 90%, rgba(255,255,255,0.12), transparent 55%)',
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <Logo className="size-7" />
            <span className="text-base font-semibold tracking-tight">Grid Manager</span>
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              Every active piece of work, in one calm view.
            </h2>
            <p className="mt-3 text-sm text-white/70">
              Freelance clients, company tasks, personal projects — so nothing gets neglected.
            </p>

            <ul className="mt-8 space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
                <m.li
                  key={text}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-center gap-3 text-sm text-white/90"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 ring-1 ring-inset ring-white/20">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </m.li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/50">Cross-platform · macOS, Linux &amp; Windows · self-updating</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-lg"
        >
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <Logo className="size-6" />
            <span className="text-sm font-semibold">Grid Manager</span>
          </div>

          <h1 className="mb-1 text-xl font-semibold tracking-tight">
            {mode === 'signin' ? 'Sign in' : 'Create your account'}
          </h1>
          <p className="mb-5 text-xs text-[var(--color-text-muted)]">
            Your clients, projects and tasks live in the cloud and follow you to any computer.
          </p>

          <form onSubmit={onSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <FormRow label="Display name">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jordan"
                  autoComplete="name"
                />
              </FormRow>
            )}
            <FormRow label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </FormRow>
            <FormRow label="Password">
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </FormRow>

            {error && <p className="text-xs text-[var(--color-stale)]">{error}</p>}

            <Button type="submit" variant="primary" className="w-full" loading={busy}>
              {mode === 'signin' ? 'Sign in' : 'Sign up'}
            </Button>
          </form>

          <button
            className="mt-4 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </m.div>
      </div>
    </div>
  )
}
