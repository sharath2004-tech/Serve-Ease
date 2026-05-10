"""
Run AFTER deploying the backend to Render.
Usage: py build_frontend.py https://your-app.onrender.com

Reads templates/index.html, substitutes Jinja2 Firebase vars from .env,
sets the API URL to the Render backend, writes public/index.html for Vercel.
"""
import os
import sys

# Load .env manually (no external dependency needed here)
env = {}
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip()

RENDER_URL = (sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'https://YOUR_APP.onrender.com')

src = os.path.join(os.path.dirname(__file__), 'templates', 'index.html')
dst_dir = os.path.join(os.path.dirname(__file__), 'public')
os.makedirs(dst_dir, exist_ok=True)

with open(src, 'r', encoding='utf-8') as f:
    content = f.read()

# Swap API URL for Render backend
content = content.replace("const apiUrl = '/api';", f"const apiUrl = '{RENDER_URL}/api';")

# Substitute Jinja2 Firebase placeholders with real values from .env
substitutions = {
    '{{ firebase.api_key }}':           env.get('FIREBASE_API_KEY', ''),
    '{{ firebase.auth_domain }}':       env.get('FIREBASE_AUTH_DOMAIN', ''),
    '{{ firebase.project_id }}':        env.get('FIREBASE_PROJECT_ID', ''),
    '{{ firebase.storage_bucket }}':    env.get('FIREBASE_STORAGE_BUCKET', ''),
    '{{ firebase.messaging_sender_id }}': env.get('FIREBASE_MESSAGING_SENDER_ID', ''),
    '{{ firebase.app_id }}':            env.get('FIREBASE_APP_ID', ''),
    '{{ firebase.measurement_id }}':    env.get('FIREBASE_MEASUREMENT_ID', ''),
}
for placeholder, value in substitutions.items():
    content = content.replace(placeholder, value)

with open(os.path.join(dst_dir, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(content)

print(f'[OK] public/index.html built — API → {RENDER_URL}/api')
print('Next: deploy the public/ folder to Vercel.')
