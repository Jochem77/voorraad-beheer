import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import './Login.css'

interface LoginProps {
  onLoginSuccess: () => void
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password
        })
        if (signUpError) throw signUpError
        setError('Account aangemaakt! Check je email voor verificatie.')
        setEmail('')
        setPassword('')
      } else {
        // Sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (signInError) throw signInError
        onLoginSuccess()
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Voorraad Beheer</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jochem.steenbakkers@gmail.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Wachtwoord</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn-login"
          >
            {loading ? 'Bezig...' : (isSignUp ? 'Account aanmaken' : 'Inloggen')}
          </button>
        </form>

        <div className="toggle-mode">
          {isSignUp ? (
            <>
              Heb je al een account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="toggle-button"
              >
                Log in
              </button>
            </>
          ) : (
            <>
              Geen account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="toggle-button"
              >
                Maak er een aan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
