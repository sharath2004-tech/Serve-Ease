const ICON = { success: '✓', error: '✗', info: 'ℹ' }
const BORDER = { success: 'border-emerald-500', error: 'border-rose-500', info: 'border-blue-500' }
const COLOR  = { success: 'text-emerald-600', error: 'text-rose-600', info: 'text-blue-600' }

export default function Toast({ toasts }) {
  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border-l-4 bg-white max-w-sm animate-fade-in ${BORDER[t.type] || BORDER.info}`}>
          <span className={`text-lg font-black ${COLOR[t.type] || COLOR.info}`}>{ICON[t.type] || 'ℹ'}</span>
          <div>
            <p className="font-bold text-slate-800 text-sm capitalize">{t.type}</p>
            <p className="text-slate-600 text-sm">{t.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
