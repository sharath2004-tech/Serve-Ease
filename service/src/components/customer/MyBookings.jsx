import { useState, useEffect } from 'react'
import { api } from '../../api'

const STATUS = {
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: '⏳ Pending' },
  accepted:  { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    label: '✅ Accepted' },
  delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '🎉 Completed' },
}

export default function MyBookings({ userId }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api(`/bookings/user?user_id=${userId}`)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>

  if (!bookings.length) return (
    <div className="text-center py-20">
      <p className="text-5xl mb-4">📋</p>
      <p className="text-xl font-bold text-slate-700">No bookings yet</p>
      <p className="text-slate-500 mt-1 text-sm">Switch to Services tab to book one!</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {bookings.map(b => {
        const cfg = STATUS[b.status] || STATUS.pending
        return (
          <div key={b.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">{b.service_type}</p>
              <p className="text-sm text-slate-500 mt-0.5">📍 {b.location || 'Location not specified'}</p>
              {b.when && <p className="text-xs text-slate-400 mt-0.5">🗓 {new Date(b.when).toLocaleString()}</p>}
              <p className="text-xs text-slate-400 mt-0.5">Booked {new Date(b.created_at).toLocaleDateString()}</p>
            </div>
            <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
