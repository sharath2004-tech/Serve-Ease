import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useApp } from '../../App'
import BookingModal from './BookingModal'
import MyBookings from './MyBookings'

const FALLBACK = [
  { id: 'f1', icon: '🔧', name: 'Plumbing',        price_hint: 'From ₹299', category: 'Home' },
  { id: 'f2', icon: '⚡', name: 'Electrical',       price_hint: 'From ₹399', category: 'Home' },
  { id: 'f3', icon: '🏠', name: 'Deep Cleaning',    price_hint: 'From ₹499', category: 'Cleaning' },
  { id: 'f4', icon: '❄️', name: 'AC Repair',        price_hint: 'From ₹599', category: 'Appliance' },
  { id: 'f5', icon: '🔑', name: 'Locksmith',        price_hint: 'From ₹199', category: 'Emergency' },
  { id: 'f6', icon: '🎨', name: 'Painting',         price_hint: 'From ₹799', category: 'Home' },
  { id: 'f7', icon: '🌿', name: 'Gardening',        price_hint: 'From ₹299', category: 'Outdoor' },
  { id: 'f8', icon: '🔌', name: 'Appliance Repair', price_hint: 'From ₹399', category: 'Appliance' },
  { id: 'f9', icon: '🚿', name: 'Bathroom Fixing',  price_hint: 'From ₹349', category: 'Home' },
]

const ICON_MAP = { Plumbing: '🔧', Electrical: '⚡', 'Deep Cleaning': '🏠', 'AC Repair': '❄️', Locksmith: '🔑', Painting: '🎨', Gardening: '🌿', 'Appliance Repair': '🔌', 'Bathroom Fixing': '🚿' }
const CATEGORIES = ['All', 'Home', 'Cleaning', 'Appliance', 'Outdoor', 'Emergency']

export default function CustomerDashboard() {
  const { user, logout, showToast, pendingBooking, setPendingBooking } = useApp()
  const [tab, setTab]               = useState('services')
  const [services, setServices]     = useState([])
  const [search, setSearch]         = useState('')
  const [category, setCategory]     = useState('All')
  const [bookTarget, setBookTarget] = useState(null)

  useEffect(() => {
    api('/vendor/services')
      .then(data => setServices(data.length ? data : FALLBACK))
      .catch(() => setServices(FALLBACK))
  }, [])

  useEffect(() => {
    if (pendingBooking) { setBookTarget(pendingBooking); setPendingBooking(null) }
  }, [pendingBooking, setPendingBooking])

  const displayed = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) &&
    (category === 'All' || (s.category || 'Home') === category)
  )

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-sm">⚡</div>
            <span className="font-extrabold text-xl text-slate-800">Serve Ease</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400 font-medium">Customer #{user}</span>
            <button onClick={logout} className="text-sm font-semibold text-rose-500 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-extrabold mb-1">What service do you need?</h1>
          <p className="text-indigo-200 text-sm mb-6">Trusted professionals at your doorstep</p>
          <div className="relative max-w-xl">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search plumbing, electrical, cleaning…"
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-slate-800 font-medium focus:outline-none shadow-lg" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
          {[['services', '🏠 Services'], ['bookings', '📋 My Bookings']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                tab === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>{l}</button>
          ))}
        </div>

        {tab === 'services' ? (
          <>
            {/* Category chips */}
            <div className="flex gap-2 flex-wrap mb-6">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                    category === c
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}>{c}</button>
              ))}
            </div>

            {displayed.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-lg font-bold text-slate-700">No services found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {displayed.map((s, idx) => (
                  <button key={s.id || s.name} onClick={() => setBookTarget(s.name)}
                    className="bg-white rounded-2xl p-5 text-center hover:shadow-lg hover:shadow-indigo-100 hover:-translate-y-1 transition-all border border-slate-100 group cursor-pointer relative overflow-hidden">
                    {idx < 3 && <span className="absolute top-2 right-2 text-xs bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-md">HOT</span>}
                    <div className="text-4xl mb-3">{ICON_MAP[s.name] || s.icon || '⚙️'}</div>
                    <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                    <p className="text-xs text-indigo-600 font-semibold mt-1">{s.price_hint || 'From ₹299'}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="text-amber-400 text-xs">★★★★★</span>
                    </div>
                    <div className="mt-3 bg-indigo-600 text-white text-xs font-bold py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      Book Now
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <MyBookings userId={user} />
        )}
      </div>

      {bookTarget && (
        <BookingModal
          serviceName={bookTarget}
          onClose={() => setBookTarget(null)}
          onBooked={() => { setBookTarget(null); setTab('bookings'); showToast('Booking confirmed! 🎉', 'success') }}
        />
      )}
    </div>
  )
}
