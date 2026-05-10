import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// ── Database setup ──────────────────────────────────────────────
const db = new Database(join(__dirname, 'service.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'customer',
    otp TEXT,
    firebase_uid TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'General',
    price_hint TEXT DEFAULT 'From ₹299',
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    vendor_id INTEGER,
    service_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    location TEXT,
    contact_phone TEXT,
    scheduled_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// ── Seed demo data ──────────────────────────────────────────────
const seedUsers = () => {
  db.prepare("INSERT OR IGNORE INTO users (phone, role) VALUES (?, ?)").run('9000000001', 'customer')
  db.prepare("INSERT OR IGNORE INTO users (phone, role) VALUES (?, ?)").run('9876543210', 'vendor')
}

const seedServices = () => {
  if (db.prepare('SELECT COUNT(*) as c FROM services').get().c > 0) return
  const stmt = db.prepare('INSERT OR IGNORE INTO services (name, category, price_hint) VALUES (?, ?, ?)')
  ;[
    ['Plumbing',        'Home',       'From ₹299'],
    ['Electrical',      'Home',       'From ₹399'],
    ['Deep Cleaning',   'Cleaning',   'From ₹499'],
    ['AC Repair',       'Appliance',  'From ₹599'],
    ['Locksmith',       'Emergency',  'From ₹199'],
    ['Painting',        'Home',       'From ₹799'],
    ['Gardening',       'Outdoor',    'From ₹299'],
    ['Appliance Repair','Appliance',  'From ₹399'],
    ['Bathroom Fixing', 'Home',       'From ₹349'],
  ].forEach(s => stmt.run(...s))
}

seedUsers()
seedServices()

// ── Auth ────────────────────────────────────────────────────────
app.post('/api/auth/firebase', (req, res) => {
  let { phone = '', role = 'customer', uid } = req.body
  if (!phone) return res.status(400).json({ error: 'Phone required' })

  if (phone.startsWith('+91')) phone = phone.slice(3)
  else if (/^91\d{10}$/.test(phone)) phone = phone.slice(2)

  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone)
  if (!user) {
    const info = db.prepare('INSERT INTO users (phone, role, firebase_uid) VALUES (?, ?, ?)').run(phone, role, uid || null)
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
  } else if (user.role !== role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id)
    user = { ...user, role }
  }
  res.json({ user_id: user.id, role: user.role, message: 'Auth successful' })
})

// Mock OTP (kept for local dev fallback)
app.post('/api/send-otp', (req, res) => {
  const { phone, role = 'customer' } = req.body
  if (!phone) return res.status(400).json({ error: 'Phone required' })
  const otp = String(Math.floor(100000 + Math.random() * 900000))
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone)
  if (!user) db.prepare('INSERT INTO users (phone, role, otp) VALUES (?, ?, ?)').run(phone, role, otp)
  else db.prepare('UPDATE users SET otp = ?, role = ? WHERE phone = ?').run(otp, role, phone)
  res.json({ message: `OTP sent successfully (Mock OTP is ${otp})` })
})

app.post('/api/verify-otp', (req, res) => {
  const { phone, otp } = req.body
  const user = db.prepare('SELECT * FROM users WHERE phone = ? AND otp = ?').get(phone, otp)
  if (!user) return res.status(401).json({ error: 'Invalid OTP' })
  db.prepare('UPDATE users SET otp = NULL WHERE id = ?').run(user.id)
  res.json({ message: 'Login successful', user_id: user.id, role: user.role })
})

// ── Bookings ────────────────────────────────────────────────────
app.post('/api/book', (req, res) => {
  const { customer_id, service_type, when: scheduledAt, location, contact_phone } = req.body
  if (!customer_id || !service_type) return res.status(400).json({ error: 'Missing booking data' })
  const info = db.prepare(
    'INSERT INTO bookings (customer_id, service_type, scheduled_at, location, contact_phone) VALUES (?, ?, ?, ?, ?)'
  ).run(customer_id, service_type, scheduledAt || null, location || null, contact_phone || null)
  res.status(201).json({ message: 'Service booked successfully', booking_id: info.lastInsertRowid })
})

app.get('/api/bookings/user', (req, res) => {
  const user_id = parseInt(req.query.user_id)
  if (!user_id) return res.json([])
  const rows = db.prepare('SELECT * FROM bookings WHERE customer_id = ? ORDER BY created_at DESC').all(user_id)
  res.json(rows.map(b => ({ ...b, when: b.scheduled_at })))
})

app.get('/api/bookings/vendor', (req, res) => {
  const vendor_id = parseInt(req.query.vendor_id)
  if (!vendor_id) return res.json([])
  const rows = db.prepare('SELECT * FROM bookings WHERE vendor_id = ? ORDER BY created_at DESC').all(vendor_id)
  res.json(rows.map(b => ({ ...b, when: b.scheduled_at })))
})

app.get('/api/bookings/pending', (req, res) => {
  const rows = db.prepare("SELECT * FROM bookings WHERE status = 'pending' ORDER BY created_at DESC").all()
  res.json(rows.map(b => ({
    id: b.id, service_type: b.service_type, customer_id: b.customer_id,
    intent: 'NEW', when: b.scheduled_at || 'ASAP', location: b.location, created_at: b.created_at,
  })))
})

app.post('/api/bookings/:id/accept', (req, res) => {
  const { vendor_id } = req.body
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id)
  if (!booking || booking.status !== 'pending') return res.status(400).json({ error: 'Booking not available' })
  db.prepare("UPDATE bookings SET status = 'accepted', vendor_id = ? WHERE id = ?").run(vendor_id, req.params.id)
  res.json({ message: 'Booking accepted' })
})

app.post('/api/bookings/:id/deliver', (req, res) => {
  const { vendor_id } = req.body
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id)
  if (!booking || String(booking.vendor_id) !== String(vendor_id) || booking.status !== 'accepted')
    return res.status(400).json({ error: 'Invalid request' })
  db.prepare("UPDATE bookings SET status = 'delivered' WHERE id = ?").run(req.params.id)
  res.json({ message: 'Service marked as delivered' })
})

// ── Vendor ──────────────────────────────────────────────────────
app.get('/api/vendor/stats', (req, res) => {
  const vendor_id = parseInt(req.query.vendor_id)
  const live = vendor_id
    ? db.prepare("SELECT COUNT(*) as c FROM bookings WHERE vendor_id = ? AND status = 'accepted'").get(vendor_id).c
    : db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'pending'").get().c
  const delivered = vendor_id
    ? db.prepare("SELECT COUNT(*) as c FROM bookings WHERE vendor_id = ? AND status = 'delivered'").get(vendor_id).c
    : db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'delivered'").get().c
  const reputation = Math.min(5.0, Math.round((4.6 + delivered * 0.1) * 10) / 10)
  res.json({ live, reputation, earnings: `₹${(live + delivered) * 120}` })
})

app.get('/api/vendor/services', (req, res) => {
  res.json(db.prepare('SELECT * FROM services ORDER BY id ASC').all())
})

app.post('/api/vendor/services', (req, res) => {
  const { name, category = 'General', price_hint = 'From ₹299' } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Service name required' })
  if (db.prepare('SELECT id FROM services WHERE name = ?').get(name.trim()))
    return res.status(409).json({ error: 'Service already exists' })
  const info = db.prepare('INSERT INTO services (name, category, price_hint) VALUES (?, ?, ?)').run(name.trim(), category, price_hint)
  res.status(201).json({ message: 'Service added', service: db.prepare('SELECT * FROM services WHERE id = ?').get(info.lastInsertRowid) })
})

app.put('/api/vendor/services/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id)
  if (!s) return res.status(404).json({ error: 'Service not found' })
  const { name = s.name, category = s.category, price_hint = s.price_hint, active = s.active } = req.body
  db.prepare('UPDATE services SET name=?, category=?, price_hint=?, active=? WHERE id=?').run(name, category, price_hint, active ? 1 : 0, req.params.id)
  res.json({ message: 'Service updated' })
})

app.delete('/api/vendor/services/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM services WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Service not found' })
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id)
  res.json({ message: 'Service deleted' })
})

app.listen(PORT, () => console.log(`✅ Serve Ease backend running on http://localhost:${PORT}`))
