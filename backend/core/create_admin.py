import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core.database import create_user, get_user_by_email, get_db

admin_email = "admin@krishisync.com"
admin_pass = "Admin@123"

# Update existing if needed
conn = get_db()
c = conn.cursor()
c.execute("UPDATE users SET is_admin=1 WHERE email=?", (admin_email,))
conn.commit()
conn.close()

existing = get_user_by_email(admin_email)
if not existing:
    create_user(admin_email, admin_pass, "Admin User", is_admin=True)
    print(f"Admin created: {admin_email} / {admin_pass}")
else:
    print(f"Admin already exists: {admin_email} / {admin_pass}")
