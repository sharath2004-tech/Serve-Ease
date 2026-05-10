import { useState } from 'react'
import { api } from '../../api'
import { useApp } from '../../App'

export default function BookingModal({ serviceName, onClose, onBooked }) {
  const { user, showToast } = useApp()
  const [when, setWhen]       = useState('')
  const [location, setLocation] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)

  const book = async () => {
    if (!location.trim()) return showToast('Please enter location', 'error')
    setLoading(true)
    try {
      await api('/book', 'POST', {
        customer_id: user,
        service_type: serviceName,
        when: when || null,
        location,
        contact_phone: contact,
      })
      onBooked()
    } catch (err) {
      showToast(err.message || 'Booking failed', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Book {serviceName}</h2>
            <p className="text-slate-500 text-sm mt-0.5">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 text-slate-500 text-lg font-bold">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">When?</label>
            <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">Location <span className="text-rose-500">*</span></label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Enter your full address"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1.5">Contact Number</label>
            <input type="tel" value={contact} onChange={e => setContact(e.target.value)}
              placeholder="Alternate phone (optional)"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors" />
          </div>
        </div>

        <div className="flex gap-3 mt-7">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={book} disabled={loading}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Booking…</>
              : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  )
}
