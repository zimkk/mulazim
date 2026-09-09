import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { FormRow, Input } from '@/components/ui/Field'
import { Card, CardBody } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { useToast } from '@/components/Toast'
import { useAuthStore } from '@/stores/authStore'

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
        notify('Account created. Check your email if confirmation is required.', 'success')
      }
    } catch {
      /* error surfaced from store */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-[--color-bg]">
      <Card className="w-full max-w-sm">
        <CardBody>
          <div className="mb-5 flex items-center gap-2">
            <Logo className="size-6" />
            <span className="text-sm font-semibold">Grid Manager</span>
          </div>
          <h1 className="mb-1 text-base font-semibold">
            {mode === 'signin' ? 'Sign in' : 'Create your account'}
          </h1>
          <p className="mb-4 text-xs text-[--color-text-muted]">
            Your clients, projects and tasks live in the cloud and follow you to any computer.
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
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

            {error && <p className="text-xs text-[--color-stale]">{error}</p>}

            <Button type="submit" variant="primary" className="w-full" loading={busy}>
              {mode === 'signin' ? 'Sign in' : 'Sign up'}
            </Button>
          </form>

          <button
            className="mt-3 text-xs text-[--color-text-muted] hover:text-[--color-text]"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </CardBody>
      </Card>
    </div>
  )
}
