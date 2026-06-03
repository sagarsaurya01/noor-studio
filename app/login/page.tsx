'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function sendOTP() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setError(error.message)
    } else {
      setMessage('OTP sent to your email!')
      setStep('otp')
    }
    setLoading(false)
  }

  async function verifyOTP() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error) {
      setError(error.message)
    } else {
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Noor Studio</h1>
          <p className="text-gray-400">From idea to every platform — automated.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">
            {step === 'email' ? 'Sign in to your account' : 'Enter your OTP'}
          </h2>

          {step === 'email' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendOTP()}
                  placeholder="you@example.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                onClick={sendOTP}
                disabled={loading || !email}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">OTP sent to <span className="text-white">{email}</span></p>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Enter 6-digit OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyOTP()}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-center text-2xl tracking-widest"
                />
              </div>
              <button
                onClick={verifyOTP}
                disabled={loading || otp.length < 6}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
                className="w-full text-gray-400 text-sm hover:text-white transition"
              >
                ← Back to email
              </button>
            </div>
          )}

          {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
          {message && <p className="mt-4 text-green-400 text-sm">{message}</p>}
        </div>
      </div>
    </div>
  )
}
