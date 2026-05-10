import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useApp } from '../../App'
import PendingBookings from './PendingBookings'
import VendorServices from './VendorServices'

export default function VendorDashboard() {
  const { user, logout } = useApp()
  const [tab, setTab]     = useState('bookings')
  const [stats, setStats] = useState({ live: 0, reputation: 4.6, earnings: '$0.00' })

  useEffect(() => {
    api(`/vendor/stats?vendor_id=${user}`)
      .then(setStats)
      .catch(() => {})
  }, [user])

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-sm">⚡</div>
            <span className="font-extrabold text-xl text-slate-800">Serve Ease</span>
            <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded-lg tracking-wide">VENDOR</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400 font-medium">Vendor #{user}</span>
            <button onClick={logout} className="text-sm font-semibold text-rose-500 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Stats banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-extrabold mb-6">Vendor Dashboard</h1>
          <div className="grid grid-cols-3 gap-4 max-w-xl">
            {[
              { label: 'Active Jobs', value: stats.live,        icon: '⚡' },
              { label: 'Rating',      value: `${stats.reputation}★`, icon: '⭐' },
              { label: 'Earnings',    value: stats.earnings,    icon: '💰' },
            ].map(s => (
              <div key={s.label} className="bg-white/20 rounded-2xl p-4 text-center backdrop-blur-sm border border-white/10">
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className="text-2xl font-extrabold leading-tight">{s.value}</p>
                <p className="text-xs text-indigo-100 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
          {[['bookings', '📋 Bookings'], ['services', '⚙️ Services']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                tab === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>{l}</button>
          ))}
        </div>

        {tab === 'bookings' ? <PendingBookings /> : <VendorServices />}
      </div>

    </div>
  )
}
