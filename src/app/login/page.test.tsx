// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import LoginPage from './page'
import { DEMO_PASSWORD, DEMO_USERS } from '@/lib/demo-users'

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock, replace: vi.fn() }),
}))

const fetchMock = vi.fn()

/** A login request that never settles, for observing the pending state. */
function hangingFetch() {
  return new Promise<never>(() => {})
}

beforeEach(() => {
  pushMock.mockClear()
  refreshMock.mockClear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('login — contract', () => {
  it('keeps every frozen login test id', () => {
    render(<LoginPage />)
    for (const id of ['login-form', 'login-email', 'login-password', 'login-submit']) {
      expect(screen.getByTestId(id)).toBeInTheDocument()
    }
  })

  it('renders a demo button for each fixture role', () => {
    render(<LoginPage />)
    for (const user of DEMO_USERS) {
      expect(screen.getByTestId(`demo-login-${user.role}`)).toBeInTheDocument()
    }
  })
})

describe('login — manual credentials', () => {
  it('posts what was typed and navigates on success', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    render(<LoginPage />)

    fireEvent.change(screen.getByTestId('login-email'), {
      target: { value: 'someone@elenchus.test' },
    })
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'hunter2' } })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'))
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        body: JSON.stringify({ email: 'someone@elenchus.test', password: 'hunter2' }),
      })
    )
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('shows the server message on a rejected sign-in and does not navigate', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'invalid_credentials', message: 'Invalid email or password' } }),
    })
    render(<LoginPage />)

    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'))
    })

    expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid email or password')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('does not throw a second error when the failure body is not the expected shape', async () => {
    // The previous implementation read body.error.message unguarded.
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => 'not json shaped' })
    render(<LoginPage />)

    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'))
    })

    expect(screen.getByTestId('login-error')).toHaveTextContent('500')
  })

  it('reports a network failure rather than hanging silently', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    render(<LoginPage />)

    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'))
    })

    expect(screen.getByTestId('login-error')).toHaveTextContent('Could not reach the server')
    expect(screen.getByTestId('login-submit')).toBeEnabled()
  })

  it('clears a previous error when a later attempt succeeds', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => null })
    render(<LoginPage />)
    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'))
    })
    expect(screen.getByTestId('login-error')).toBeInTheDocument()

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'))
    })

    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument()
  })
})

describe('login — demo accounts', () => {
  it('signs in with the fixture credentials for the role that was clicked', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    render(<LoginPage />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('demo-login-recruiter'))
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        body: JSON.stringify({ email: 'recruiter@elenchus.test', password: DEMO_PASSWORD }),
      })
    )
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('only ever submits fixture addresses, never an arbitrary one', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    render(<LoginPage />)

    const fixtureEmails = DEMO_USERS.map((user) => user.email)
    for (const user of DEMO_USERS) {
      await act(async () => {
        fireEvent.click(screen.getByTestId(`demo-login-${user.role}`))
      })
      const body = JSON.parse(fetchMock.mock.lastCall![1].body)
      expect(fixtureEmails).toContain(body.email)
    }
  })
})

describe('login — pending state', () => {
  it('cannot be double-submitted while a request is in flight', async () => {
    fetchMock.mockImplementation(hangingFetch)
    render(<LoginPage />)

    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'))
    })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'))
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('login-submit')).toBeDisabled()
  })

  it('disables the demo buttons too, so one cannot race the form', async () => {
    fetchMock.mockImplementation(hangingFetch)
    render(<LoginPage />)

    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'))
    })

    for (const user of DEMO_USERS) {
      expect(screen.getByTestId(`demo-login-${user.role}`)).toBeDisabled()
    }

    await act(async () => {
      fireEvent.click(screen.getByTestId('demo-login-admin'))
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
