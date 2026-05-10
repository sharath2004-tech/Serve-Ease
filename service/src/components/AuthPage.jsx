import { useState, useRef } from 'react'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'
import { useApp } from '../App'

const PREVIEW = [
  { icon: '🔧', name: 'Plumbing' }, { icon: '⚡', name: 'Electrical' },
  { icon: '🏠', name: 'Cleaning' }, { icon: '❄️', name: 'AC Repair' },
  { icon: '🔑', name: 'Locksmith' }, { icon: '🎨', name: 'Painting' },
]

export default function AuthPage() {
  const { login, showToast } = useApp()
  const [phone, setPhone]   = useState('')
  const [role, setRole]     = useState('customer')
  const [step, setStep]     = useState('phone')
  const [otp, setOtp]       = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const confirmRef = useRef(null)
  const otpRefs    = useRef([])

  const sendOtp = async () => {
    if (phone.length !== 10) return showToast('Enter 10-digit mobile number', 'error')
    setLoading(true)
    try {
      // Fully destroy old verifier and wipe the DOM node
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear() } catch (_) {}
        window.recaptchaVerifier = null
      }
      const container = document.getElementById('recaptcha-container')
      if (container) container.innerHTML = ''

      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => console.log('[Firebase] reCAPTCHA solved'),
      })
      confirmRef.current = await signInWithPhoneNumber(auth, '+91' + phone, window.recaptchaVerifier)
      setStep('otp')
      showToast('OTP sent! Check your SMS.', 'success')
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      console.error('[Firebase] sendOtp error:', err.code, err.message)
      let msg = 'Could not send OTP'
      const c = err.code || ''
      if (c === 'auth/billing-not-enabled') msg = 'Firebase free plan only supports test numbers. Use the demo credentials below.'
      else if (c === 'auth/invalid-phone-number') msg = 'Invalid phone number'
      else if (c === 'auth/too-many-requests') msg = 'Too many attempts — try later'
      else if (c.includes('unauthorized-domain') || c.includes('app-not-authorized'))
        msg = 'Add this domain in Firebase Console → Auth → Settings → Authorized Domains'
      showToast(msg, 'error')
      if (window.recaptchaVerifier) { try { window.recaptchaVerifier.clear() } catch (_) {} window.recaptchaVerifier = null }
    } finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    const code = otp.join('')
    if (code.length !== 6) return showToast('Enter 6-digit OTP', 'error')
    if (!confirmRef.current) return showToast('Please request OTP first', 'error')
    setLoading(true)
    try {
      const result = await confirmRef.current.confirm(code)
      const res = await api('/auth/firebase', 'POST', { phone, role, uid: result.user.uid })
      login(res.user_id, res.role)
      showToast('Logged in successfully!', 'success')
    } catch {
      showToast('Invalid OTP. Please retry.', 'error')
    } finally { setLoading(false) }
  }

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next)
    if (val && i < 5) otpRefs.current[i + 1]?.focus()
  }
  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }

  const Spinner = () => <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800">Serve Ease</h1>
          <p className="text-slate-500 mt-1 text-sm">Premium Home Services</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-100 p-8 border border-slate-100">

          {step === 'phone' ? (
            <>
              {/* Role tabs */}
              <div className="flex gap-2 mb-6">
                {[['customer', '👤 Customer'], ['vendor', '🔧 Vendor']].map(([r, l]) => (
                  <button key={r} onClick={() => setRole(r)}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                      role === r ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>{l}</button>
                ))}
              </div>

              {/* Phone input */}
              <div className="relative mb-5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm select-none">+91</span>
                <input type="tel" maxLength={10} value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  placeholder="Mobile number"
                  className="w-full pl-14 pr-4 py-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none text-slate-800 font-medium transition-colors text-base" />
              </div>

              <button onClick={sendOtp} disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 disabled:opacity-60 transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2">
                {loading ? <><Spinner /> Sending…</> : 'Continue Securely →'}
              </button>

              {/* Demo cards */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center mb-3 font-semibold tracking-widest">DEMO QUICK LOGIN</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setPhone('9000000001'); setRole('customer') }}
                    className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-left hover:bg-emerald-100 transition-colors">
                    <p className="text-xs font-bold text-emerald-700">👤 Customer</p>
                    <p className="text-xs text-emerald-600 mt-0.5 font-mono">9000000001</p>
                    <p className="text-xs text-emerald-500 mt-1">OTP: <span className="font-bold font-mono">123456</span></p>
                  </button>
                  <button onClick={() => { setPhone('9876543210'); setRole('vendor') }}
                    className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-left hover:bg-indigo-100 transition-colors">
                    <p className="text-xs font-bold text-indigo-700">🔧 Vendor</p>
                    <p className="text-xs text-indigo-600 mt-0.5 font-mono">9876543210</p>
                    <p className="text-xs text-indigo-500 mt-1">OTP: <span className="font-bold font-mono">123456</span></p>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setStep('phone')} className="flex items-center gap-1 text-sm text-indigo-600 font-semibold mb-5 hover:underline">
                ← +91 {phone}
              </button>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Enter OTP</h2>
              <p className="text-slate-500 text-sm">Sent to +91 {phone}</p>
              {['9000000001','9876543210'].includes(phone) && (
                <p className="text-xs text-indigo-600 font-semibold mt-1 mb-4">💡 Demo OTP: <span className="font-mono bg-indigo-50 px-2 py-0.5 rounded-lg">1 2 3 4 5 6</span></p>
              )}
              {!['9000000001','9876543210'].includes(phone) && <div className="mb-6" />}

              {/* OTP boxes */}
              <div className="flex gap-2 justify-between mb-6">
                {otp.map((v, i) => (
                  <input key={i} type="text" inputMode="numeric" maxLength={1} value={v}
                    ref={el => otpRefs.current[i] = el}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    className="w-11 h-12 text-center text-xl font-bold rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors" />
                ))}
              </div>

              <button onClick={verifyOtp} disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60 transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2">
                {loading ? <><Spinner /> Verifying…</> : 'Verify & Login'}
              </button>
              <button onClick={sendOtp} disabled={loading} className="w-full mt-3 py-2.5 text-indigo-600 font-semibold text-sm hover:underline disabled:opacity-60">
                Resend OTP
              </button>
            </>
          )}
        </div>

        {/* Service preview */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {PREVIEW.map(s => (
            <div key={s.name} className="flex flex-col items-center gap-1 p-3 bg-white/70 rounded-xl text-center shadow-sm">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs text-slate-500 font-medium">{s.name}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
