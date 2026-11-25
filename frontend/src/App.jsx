import { useState } from 'react'

function validateCredentials(password) {
  if (password.length < 8 || password.length > 72) {
    return 'Password must be between 8 and 72 characters.'
  }

  return ''
}

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [pendingAction, setPendingAction] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const action = event.nativeEvent.submitter?.value
    setMessage(null)

    if (action !== 'register' && action !== 'login') {
      setMessage({ type: 'error', text: 'Choose register or login to continue.' })
      return
    }

    const validationError = validateCredentials(password)
    if (validationError) {
      setMessage({ type: 'error', text: validationError })
      return
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')
    if (!apiBaseUrl) {
      setMessage({ type: 'error', text: 'The backend URL has not been configured.' })
      return
    }

    setPendingAction(action)

    try {
      const response = await fetch(`${apiBaseUrl}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json()

      if (!response.ok) {
        const apiError = result.detail ?? result.error
        throw new Error(
          typeof apiError === 'string'
            ? apiError
            : 'Please check the provided credentials and try again.',
        )
      }

      setMessage({ type: 'success', text: result.message })
      if (action === 'register') {
        setPassword('')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to reach the backend. Please try again.',
      })
    } finally {
      setPendingAction('')
    }
  }

  return (
    <main className="page-shell">
      <section className="auth-card" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">A</div>
        <p className="eyebrow">ACCOUNT ACCESS</p>
        <h1 id="page-title">Simple sign in, securely.</h1>
        <p className="intro">Register a username or sign in to your account.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="username">Username</label>
          <input
            autoComplete="username"
            id="username"
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter any username"
            value={username}
          />
          <p className="field-hint">Any username is allowed.</p>

          <label htmlFor="password">Password</label>
          <input
            autoComplete="current-password"
            id="password"
            maxLength={72}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
            type="password"
            value={password}
          />

          {message && (
            <p className={`form-message ${message.type}`} role="status">
              {message.text}
            </p>
          )}

          <div className="actions">
            <button
              className="submit-button secondary"
              disabled={Boolean(pendingAction)}
              name="action"
              type="submit"
              value="login"
            >
              {pendingAction === 'login' ? 'Signing in…' : 'Login'}
            </button>
            <button
              className="submit-button"
              disabled={Boolean(pendingAction)}
              name="action"
              type="submit"
              value="register"
            >
              {pendingAction === 'register' ? 'Registering…' : 'Register'}
            </button>
          </div>
        </form>

        <p className="security-note">
          <span aria-hidden="true">◇</span> Passwords are securely hashed before storage.
        </p>
      </section>
      <footer>Frontend and backend deployed independently.</footer>
    </main>
  )
}

export default App
