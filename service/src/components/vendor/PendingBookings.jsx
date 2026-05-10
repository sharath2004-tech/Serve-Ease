import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useApp } from '../../App'

export default function PendingBookings() {
  const { user, showToast } = useApp()
  const [pending,  setPending]  = useState([])
  const [accepted, setAccepted] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [busy, setBusy] = useState(null)

  const load = async () => {
    try {
      const [pend, mine] = await Promise.all([
        api('/bookings/pending'),
        api(`/bookings/vendor?vendor_id=${user}`),
      ])
      setPending(pend)
      setAccepted(mine.filter(b => b.status === 'accepted'))
    } catch { setPending([]); setAccepted([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const accept = async (id) => {
    setBusy(id)
    try {
      await api(`/bookings/${id}/accept`, 'POST', { vendor_id: user })
      showToast('Booking accepted!', 'success')
      load()
    } catch (err) { showToast(err.message, 'error') }
    finally { setBusy(null) }
  }

  const deliver = async (id) => {
    setBusy(id)
    try {
      await api(`/bookings/${id}/deliver`, 'POST', { vendor_id: user })
      showToast('Marked as delivered! 🎉', 'success')
      load()
    } catch (err) { showToast(err.message, 'error') }
    finally { setBusy(null) }
  }

  if (loading) return <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>

  return (
    <div className="space-y-8">

      {/* Active jobs */}
      {accepted.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full inline-block" /> Active Jobs ({accepted.length})
          </h3>
          <div className="space-y-3">
            {accepted.map(b => (
              <div key={b.id} className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-800">{b.service_type}</p>
                  <p className="text-sm text-slate-500 mt-0.5">📍 {b.location || '—'}</p>
                  {b.when && <p className="text-xs text-slate-400 mt-0.5">🗓 {new Date(b.when).toLocaleString()}</p>}
                </div>
                <button onClick={() => deliver(b.id)} disabled={busy === b.id}
                  className="shrink-0 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-60 transition-all">
                  {busy === b.id ? '…' : 'Mark Delivered'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending requests */}
      <div>
        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full inline-block" /> New Requests ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-bold text-slate-700">No pending bookings</p>
            <p className="text-slate-500 text-sm mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(b => (
              <div key={b.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">NEW</span>
                  <p className="font-bold text-slate-800 mt-1">{b.service_type}</p>
                  <p className="text-sm text-slate-500 mt-0.5">📍 {b.location || '—'}</p>
                  <p className="text-sm text-slate-500 mt-0.5">⏰ {b.when === 'ASAP' ? 'ASAP' : b.when ? new Date(b.when).toLocaleString() : 'ASAP'}</p>
                </div>
                <button onClick={() => accept(b.id)} disabled={busy === b.id}
                  className="shrink-0 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-all">
                  {busy === b.id ? '…' : 'Accept'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
