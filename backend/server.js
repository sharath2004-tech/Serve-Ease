import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// ── MongoDB Connection ──────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB connection error:', err.message); process.exit(1) })

// ── Schemas ─────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  phone:        { type: String, unique: true, required: true },
  role:         { type: String, enum: ['customer', 'vendor'], default: 'customer' },
  otp:          { type: String, default: null },
  firebase_uid: { type: String, default: null },
}, { timestamps: true })

const ServiceSchema = new mongoose.Schema({
  name:       { type: String, unique: true, required: true },
  category:   { type: String, default: 'General' },
  price_hint: { type: String, default: 'From ₹299' },
  active:     { type: Boolean, default: true },
}, { timestamps: true })

const BookingSchema = new mongoose.Schema({
  customer_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  service_type:  { type: String, required: true },
  status:        { type: String, enum: ['pending', 'accepted', 'delivered'], default: 'pending' },
  location:      { type: String, default: null },
  contact_phone: { type: String, default: null },
  scheduled_at:  { type: String, default: null },
}, { timestamps: true })

const User    = mongoose.model('User',    UserSchema)
const Service = mongoose.model('Service', ServiceSchema)
const Booking = mongoose.model('Booking', BookingSchema)

// ── Seed demo data on first run ──────────────────────────────────
const seed = async () => {
  const count = await User.countDocuments()
  if (count === 0) {
    await User.insertMany([
      { phone: '9000000001', role: 'customer' },
      { phone: '9876543210', role: 'vendor'   },
    ])
    console.log('✅ Demo users seeded')
  }
  const svcCount = await Service.countDocuments()
  if (svcCount === 0) {
    await Service.insertMany([
      { name: 'Plumbing',         category: 'Home',      price_hint: 'From ₹299' },
      { name: 'Electrical',       category: 'Home',      price_hint: 'From ₹399' },
      { name: 'Deep Cleaning',    category: 'Cleaning',  price_hint: 'From ₹499' },
      { name: 'AC Repair',        category: 'Appliance', price_hint: 'From ₹599' },
      { name: 'Locksmith',        category: 'Emergency', price_hint: 'From ₹199' },
      { name: 'Painting',         category: 'Home',      price_hint: 'From ₹799' },
      { name: 'Gardening',        category: 'Outdoor',   price_hint: 'From ₹299' },
      { name: 'Appliance Repair', category: 'Appliance', price_hint: 'From ₹399' },
      { name: 'Bathroom Fixing',  category: 'Home',      price_hint: 'From ₹349' },
    ])
    console.log('✅ Demo services seeded')
  }
}
mongoose.connection.once('open', seed)

// ── Auth ─────────────────────────────────────────────────────────
app.post('/api/auth/firebase', async (req, res) => {
  try {
    let { phone = '', role = 'customer', uid } = req.body
    if (!phone) return res.status(400).json({ error: 'Phone required' })
    if (phone.startsWith('+91')) phone = phone.slice(3)
    else if (/^91\d{10}$/.test(phone)) phone = phone.slice(2)

    let user = await User.findOne({ phone })
    if (!user) {
      user = await User.create({ phone, role, firebase_uid: uid || null })
    } else if (user.role !== role) {
      user.role = role; await user.save()
    }
    res.json({ user_id: user._id, role: user.role, message: 'Auth successful' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/send-otp', async (req, res) => {
  try {
    const { phone, role = 'customer' } = req.body
    if (!phone) return res.status(400).json({ error: 'Phone required' })
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    await User.findOneAndUpdate({ phone }, { role, otp }, { upsert: true, new: true })
    res.json({ message: `OTP sent successfully (Mock OTP is ${otp})` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body
    const user = await User.findOne({ phone, otp })
    if (!user) return res.status(401).json({ error: 'Invalid OTP' })
    user.otp = null; await user.save()
    res.json({ message: 'Login successful', user_id: user._id, role: user.role })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Bookings ─────────────────────────────────────────────────────
app.post('/api/book', async (req, res) => {
  try {
    const { customer_id, service_type, when: scheduled_at, location, contact_phone } = req.body
    if (!customer_id || !service_type) return res.status(400).json({ error: 'Missing booking data' })
    const booking = await Booking.create({ customer_id, service_type, scheduled_at, location, contact_phone })
    res.status(201).json({ message: 'Service booked successfully', booking_id: booking._id })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/bookings/user', async (req, res) => {
  try {
    const { user_id } = req.query
    if (!user_id) return res.json([])
    const rows = await Booking.find({ customer_id: user_id }).sort({ createdAt: -1 })
    res.json(rows.map(b => ({ id: b._id, service_type: b.service_type, status: b.status, location: b.location, when: b.scheduled_at, created_at: b.createdAt })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/bookings/vendor', async (req, res) => {
  try {
    const { vendor_id } = req.query
    if (!vendor_id) return res.json([])
    const rows = await Booking.find({ vendor_id }).sort({ createdAt: -1 })
    res.json(rows.map(b => ({ id: b._id, service_type: b.service_type, status: b.status, location: b.location, when: b.scheduled_at, created_at: b.createdAt })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/bookings/pending', async (req, res) => {
  try {
    const rows = await Booking.find({ status: 'pending' }).sort({ createdAt: -1 })
    res.json(rows.map(b => ({ id: b._id, service_type: b.service_type, customer_id: b.customer_id, intent: 'NEW', when: b.scheduled_at || 'ASAP', location: b.location, created_at: b.createdAt })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/bookings/:id/accept', async (req, res) => {
  try {
    const { vendor_id } = req.body
    const booking = await Booking.findById(req.params.id)
    if (!booking || booking.status !== 'pending') return res.status(400).json({ error: 'Booking not available' })
    booking.status = 'accepted'; booking.vendor_id = vendor_id; await booking.save()
    res.json({ message: 'Booking accepted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/bookings/:id/deliver', async (req, res) => {
  try {
    const { vendor_id } = req.body
    const booking = await Booking.findById(req.params.id)
    if (!booking || String(booking.vendor_id) !== String(vendor_id) || booking.status !== 'accepted')
      return res.status(400).json({ error: 'Invalid request' })
    booking.status = 'delivered'; await booking.save()
    res.json({ message: 'Service marked as delivered' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Vendor ───────────────────────────────────────────────────────
app.get('/api/vendor/stats', async (req, res) => {
  try {
    const { vendor_id } = req.query
    const live = vendor_id
      ? await Booking.countDocuments({ vendor_id, status: 'accepted' })
      : await Booking.countDocuments({ status: 'pending' })
    const delivered = vendor_id
      ? await Booking.countDocuments({ vendor_id, status: 'delivered' })
      : await Booking.countDocuments({ status: 'delivered' })
    const reputation = Math.min(5.0, Math.round((4.6 + delivered * 0.1) * 10) / 10)
    res.json({ live, reputation, earnings: `₹${(live + delivered) * 120}` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/vendor/services', async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: 1 })
    res.json(services.map(s => ({ id: s._id, name: s.name, category: s.category, price_hint: s.price_hint, active: s.active })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/vendor/services', async (req, res) => {
  try {
    const { name, category = 'General', price_hint = 'From ₹299' } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Service name required' })
    const service = await Service.create({ name: name.trim(), category, price_hint })
    res.status(201).json({ message: 'Service added', service: { id: service._id, name: service.name, category: service.category, price_hint: service.price_hint, active: service.active } })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Service already exists' })
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/vendor/services/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!service) return res.status(404).json({ error: 'Service not found' })
    res.json({ message: 'Service updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/vendor/services/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id)
    if (!service) return res.status(404).json({ error: 'Service not found' })
    res.json({ message: 'Service deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.listen(PORT, () => console.log(`✅ Serve Ease backend running on http://localhost:${PORT}`))
