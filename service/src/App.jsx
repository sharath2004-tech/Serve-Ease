import { useState, createContext, useContext } from 'react'
import AuthPage from './components/AuthPage'
import CustomerDashboard from './components/customer/CustomerDashboard'
import VendorDashboard from './components/vendor/VendorDashboard'
import Toast from './components/Toast'

export const AppContext = createContext(null)

export function useApp() { return useContext(AppContext) }

function App() {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user_id')
    return u ? parseInt(u, 10) : null
  })
  const [role, setRole] = useState(() => localStorage.getItem('role') || null)
  const [toasts, setToasts] = useState([])
  const [pendingBooking, setPendingBooking] = useState(null)

  const showToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  const login = (userId, userRole) => {
    setUser(userId)
    setRole(userRole)
    localStorage.setItem('user_id', String(userId))
    localStorage.setItem('role', userRole)
  }

  const logout = () => {
    setUser(null)
    setRole(null)
    localStorage.removeItem('user_id')
    localStorage.removeItem('role')
  }

  return (
    <AppContext.Provider value={{ user, role, login, logout, showToast, pendingBooking, setPendingBooking }}>
      <div id="recaptcha-container" />
      <Toast toasts={toasts} />
      {!user
        ? <AuthPage />
        : role === 'vendor'
          ? <VendorDashboard />
          : <CustomerDashboard />
      }
    </AppContext.Provider>
  )
}

export default App
