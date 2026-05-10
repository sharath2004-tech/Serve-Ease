from datetime import datetime, timedelta
import os
import random

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'instance', 'service.db')

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app)
db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False)
    otp = db.Column(db.String(6), nullable=True)


class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    service_type = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    scheduled_at = db.Column(db.DateTime, nullable=True)
    location = db.Column(db.String(255), nullable=True)
    contact_phone = db.Column(db.String(40), nullable=True)


class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    category = db.Column(db.String(80), nullable=False)
    price_hint = db.Column(db.String(40), nullable=False, default='From $29')
    active = db.Column(db.Boolean, default=True)


def migrate_schema():
    db.create_all()
    with db.engine.begin() as conn:
        booking_columns = [row[1] for row in conn.execute(text('PRAGMA table_info(booking)')).fetchall()]
        if 'created_at' not in booking_columns:
            conn.execute(text('ALTER TABLE booking ADD COLUMN created_at DATETIME'))
        if 'scheduled_at' not in booking_columns:
            conn.execute(text('ALTER TABLE booking ADD COLUMN scheduled_at DATETIME'))
        if 'location' not in booking_columns:
            conn.execute(text('ALTER TABLE booking ADD COLUMN location TEXT'))
        if 'contact_phone' not in booking_columns:
            conn.execute(text('ALTER TABLE booking ADD COLUMN contact_phone TEXT'))


def seed_demo_data():
    demo_users = [
        ('9000000001', 'customer'),
        ('9000000002', 'customer'),
        ('9876543210', 'vendor'),
        ('8000000002', 'vendor'),
    ]
    changed = False
    for phone, role in demo_users:
        user = User.query.filter_by(phone=phone).first()
        if not user:
            db.session.add(User(phone=phone, role=role))
            changed = True
        elif user.role != role:
            user.role = role
            changed = True
    if changed:
        db.session.commit()

    if not Service.query.first():
        db.session.add_all([
            Service(name='Home Cleaning', category='Cleaning', price_hint='From $49'),
            Service(name='Plumbing Repair', category='Repairs', price_hint='From $39'),
            Service(name='Electrical Fixes', category='Repairs', price_hint='From $59'),
            Service(name='Wall Painting', category='Renovation', price_hint='From $99'),
            Service(name='Carpentry', category='Woodwork', price_hint='From $79'),
            Service(name='AC Maintenence', category='Appliance', price_hint='From $69'),
        ])
        db.session.commit()

    if not Booking.query.first():
        customer_one = User.query.filter_by(phone='9000000001').first()
        customer_two = User.query.filter_by(phone='9000000002').first()
        vendor_one = User.query.filter_by(phone='9876543210').first()
        vendor_two = User.query.filter_by(phone='8000000002').first()
        now = datetime.utcnow()
        db.session.add_all([
            Booking(customer_id=customer_one.id, service_type='Home Cleaning', status='pending', created_at=now - timedelta(hours=1)),
            Booking(customer_id=customer_one.id, vendor_id=vendor_one.id, service_type='Plumbing Repair', status='accepted', created_at=now - timedelta(days=1)),
            Booking(customer_id=customer_two.id, vendor_id=vendor_two.id, service_type='Electrical Fixes', status='delivered', created_at=now - timedelta(days=2)),
            Booking(customer_id=customer_two.id, service_type='Wall Painting', status='pending', created_at=now - timedelta(minutes=30)),
        ])
        db.session.commit()

    demo_services = ['Home Cleaning', 'Plumbing Repair', 'Electrical Fixes', 'Wall Painting']
    customers = User.query.filter_by(role='customer').order_by(User.id.asc()).all()
    vendors = User.query.filter_by(role='vendor').order_by(User.id.asc()).all()
    seeded = False
    for index, customer in enumerate(customers):
        has_booking = Booking.query.filter_by(customer_id=customer.id).first()
        if has_booking:
            continue
        seeded = True
        service_name = demo_services[index % len(demo_services)]
        vendor = vendors[index % len(vendors)] if vendors else None
        booking_status = 'accepted' if index % 3 == 1 else 'pending'
        db.session.add(Booking(
            customer_id=customer.id,
            vendor_id=vendor.id if vendor and booking_status != 'pending' else None,
            service_type=service_name,
            status=booking_status,
            created_at=datetime.utcnow() - timedelta(hours=index + 1)
        ))
    if seeded:
        db.session.commit()


with app.app_context():
    migrate_schema()
    seed_demo_data()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json(force=True)
    phone = data.get('phone')
    role = data.get('role', 'customer')
    if not phone:
        return jsonify({'error': 'Phone number required'}), 400

    user = User.query.filter_by(phone=phone).first()
    if not user:
        user = User(phone=phone, role=role)
        db.session.add(user)
    else:
        user.role = role

    otp = str(random.randint(100000, 999999))
    user.otp = otp
    db.session.commit()
    return jsonify({'message': f'OTP sent successfully (Mock OTP is {otp})'}), 200


@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json(force=True)
    phone = data.get('phone')
    otp = data.get('otp')
    user = User.query.filter_by(phone=phone, otp=otp).first()
    if not user:
        return jsonify({'error': 'Invalid OTP'}), 401

    user.otp = None
    db.session.commit()
    return jsonify({'message': 'Login successful', 'user_id': user.id, 'role': user.role}), 200


@app.route('/api/book', methods=['POST'])
def book_service():
    data = request.get_json(force=True)
    customer_id = data.get('customer_id')
    service_type = data.get('service_type')
    when = data.get('when')
    location = data.get('location')
    contact_phone = data.get('contact_phone')

    if not customer_id or not service_type:
        return jsonify({'error': 'Missing booking data'}), 400

    booking = Booking(customer_id=customer_id, service_type=service_type, status='pending')
    # parse scheduled time if provided
    if when:
        try:
            booking.scheduled_at = datetime.fromisoformat(when)
        except Exception:
            booking.scheduled_at = None
    booking.location = location
    booking.contact_phone = contact_phone
    db.session.add(booking)
    db.session.commit()
    return jsonify({'message': 'Service booked successfully', 'booking_id': booking.id}), 201


@app.route('/api/bookings/pending', methods=['GET'])
def get_pending_bookings():
    bookings = Booking.query.filter_by(status='pending').order_by(Booking.created_at.desc()).all()
    return jsonify([
        {
            'id': booking.id,
            'service_type': booking.service_type,
            'customer_id': booking.customer_id,
            'intent': 'NEW',
            'when': booking.scheduled_at.isoformat() if booking.scheduled_at else 'ASAP',
            'location': booking.location,
            'created_at': booking.created_at.isoformat() if booking.created_at else None,
        }
        for booking in bookings
    ]), 200


@app.route('/api/bookings/user', methods=['GET'])
def get_user_bookings():
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify([]), 200

    bookings = Booking.query.filter_by(customer_id=user_id).order_by(Booking.created_at.desc()).all()
    return jsonify([
        {
            'id': booking.id,
            'service_type': booking.service_type,
            'status': booking.status,
            'created_at': booking.created_at.isoformat() if booking.created_at else None,
            'vendor_id': booking.vendor_id,
            'when': booking.scheduled_at.isoformat() if booking.scheduled_at else None,
            'location': booking.location,
            'contact_phone': booking.contact_phone,
        }
        for booking in bookings
    ]), 200


@app.route('/api/vendor/stats', methods=['GET'])
def vendor_stats():
    vendor_id = request.args.get('vendor_id', type=int)
    if vendor_id:
        live = Booking.query.filter_by(vendor_id=vendor_id, status='accepted').count()
        delivered = Booking.query.filter_by(vendor_id=vendor_id, status='delivered').count()
    else:
        live = Booking.query.filter_by(status='pending').count()
        delivered = Booking.query.filter_by(status='delivered').count()

    reputation = min(5.0, round(4.6 + delivered * 0.1, 1))
    earnings = f'${(live + delivered) * 120:.2f}'
    return jsonify({'live': live, 'reputation': reputation, 'earnings': earnings}), 200


@app.route('/api/vendor/services', methods=['GET', 'POST'])
def vendor_services():
    if request.method == 'POST':
        data = request.get_json(force=True)
        name = (data.get('name') or '').strip()
        category = (data.get('category') or 'General').strip()
        price_hint = (data.get('price_hint') or 'From $29').strip()
        if not name:
            return jsonify({'error': 'Service name required'}), 400
        if Service.query.filter_by(name=name).first():
            return jsonify({'error': 'Service already exists'}), 409
        service = Service(name=name, category=category, price_hint=price_hint)
        db.session.add(service)
        db.session.commit()
        return jsonify({'message': 'Service added', 'service': {
            'id': service.id,
            'name': service.name,
            'category': service.category,
            'price_hint': service.price_hint,
            'active': service.active,
        }}), 201

    services = Service.query.order_by(Service.id.asc()).all()
    return jsonify([
        {
            'id': service.id,
            'name': service.name,
            'category': service.category,
            'price_hint': service.price_hint,
            'active': service.active,
        }
        for service in services
    ]), 200


@app.route('/api/vendor/services/<int:service_id>', methods=['PUT', 'DELETE'])
def vendor_service_detail(service_id):
    service = db.session.get(Service, service_id)
    if not service:
        return jsonify({'error': 'Service not found'}), 404

    if request.method == 'DELETE':
        db.session.delete(service)
        db.session.commit()
        return jsonify({'message': 'Service deleted'}), 200

    data = request.get_json(force=True)
    service.name = (data.get('name') or service.name).strip()
    service.category = (data.get('category') or service.category).strip()
    service.price_hint = (data.get('price_hint') or service.price_hint).strip()
    service.active = bool(data.get('active', service.active))
    db.session.commit()
    return jsonify({'message': 'Service updated'}), 200


@app.route('/api/bookings/<int:booking_id>/accept', methods=['POST'])
def accept_booking(booking_id):
    data = request.get_json(force=True)
    vendor_id = data.get('vendor_id')
    booking = db.session.get(Booking, booking_id)
    if not booking or booking.status != 'pending':
        return jsonify({'error': 'Booking not available'}), 400

    booking.status = 'accepted'
    booking.vendor_id = vendor_id
    db.session.commit()
    return jsonify({'message': 'Booking accepted'}), 200


@app.route('/api/bookings/<int:booking_id>/deliver', methods=['POST'])
def deliver_booking(booking_id):
    data = request.get_json(force=True)
    vendor_id = data.get('vendor_id')
    booking = db.session.get(Booking, booking_id)
    if not booking or booking.vendor_id != vendor_id or booking.status != 'accepted':
        return jsonify({'error': 'Invalid request'}), 400

    booking.status = 'delivered'
    db.session.commit()
    return jsonify({'message': 'Service marked as delivered'}), 200


@app.route('/api/auth/firebase', methods=['POST'])
def auth_firebase():
    data = request.get_json(force=True)
    phone = (data.get('phone') or '').strip()
    role = data.get('role', 'customer')

    if not phone:
        return jsonify({'error': 'Phone required'}), 400

    # Normalize: strip +91 or 91 country prefix
    if phone.startswith('+91') and len(phone) > 3:
        phone = phone[3:]
    elif phone.startswith('91') and len(phone) == 12:
        phone = phone[2:]

    user = User.query.filter_by(phone=phone).first()
    if not user:
        user = User(phone=phone, role=role)
        db.session.add(user)
        db.session.commit()
    elif user.role != role:
        user.role = role
        db.session.commit()

    return jsonify({'user_id': user.id, 'role': user.role, 'message': 'Auth successful'}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)
