import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useApp } from '../../App'

export default function VendorServices() {
  const { showToast } = useApp()
  const [services, setServices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm] = useState({ name: '', category: 'Home', price_hint: 'From ₹299' })
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = () => {
    api('/vendor/services')
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const addService = async () => {
    if (!form.name.trim()) return showToast('Service name required', 'error')
    setAdding(true)
    try {
      await api('/vendor/services', 'POST', form)
      showToast('Service added!', 'success')
      setForm({ name: '', category: 'Home', price_hint: 'From ₹299' })
      load()
    } catch (err) { showToast(err.message, 'error') }
    finally { setAdding(false) }
  }

  const deleteService = async (id) => {
    setDeleting(id)
    try {
      await api(`/vendor/services/${id}`, 'DELETE')
      showToast('Service deleted', 'success')
      load()
    } catch (err) { showToast(err.message, 'error') }
    finally { setDeleting(null) }
  }

  return (
    <div>
      {/* Add form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
        <h3 className="font-bold text-slate-800 mb-4">Add New Service</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" placeholder="Service name *" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && addService()}
            className="px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors" />
          <input type="text" placeholder="Category" value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            className="px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors" />
          <input type="text" placeholder="Price hint" value={form.price_hint}
            onChange={e => setForm({ ...form, price_hint: e.target.value })}
            className="px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors" />
        </div>
        <button onClick={addService} disabled={adding}
          className="mt-3 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-all">
          {adding ? 'Adding…' : '+ Add Service'}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-4xl mb-3">⚙️</p>
          <p className="font-bold text-slate-700">No services yet</p>
          <p className="text-slate-500 text-sm mt-1">Add a service above to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(s => (
            <div key={s.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-slate-800">{s.name}</p>
                <p className="text-sm text-slate-500">{s.category} · {s.price_hint}</p>
              </div>
              <button onClick={() => deleteService(s.id)} disabled={deleting === s.id}
                className="text-sm font-semibold text-rose-500 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50 disabled:opacity-60 transition-colors">
                {deleting === s.id ? '…' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
