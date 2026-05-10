"""
Run this script AFTER deploying the backend to Render.
Usage: py build_frontend.py https://your-app.onrender.com

It reads templates/index.html, rewrites the API URL to point to Render,
then writes the standalone frontend to public/index.html (for Vercel).
"""
import os
import sys

RENDER_URL = (sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'https://YOUR_APP.onrender.com')

src = os.path.join(os.path.dirname(__file__), 'templates', 'index.html')
dst_dir = os.path.join(os.path.dirname(__file__), 'public')
dst = os.path.join(dst_dir, 'index.html')

os.makedirs(dst_dir, exist_ok=True)

with open(src, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const apiUrl = '/api';", f"const apiUrl = '{RENDER_URL}/api';")

with open(dst, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'[OK] public/index.html built — API → {RENDER_URL}/api')
print('Next: deploy the public/ folder to Vercel.')
