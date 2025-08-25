# PYTHON INTEGRATION EXAMPLE
# Shows how ANY language can use the SaaS Framework modules

import requests
import json
from datetime import datetime

class SaaSFrameworkAuth:
    """Python client for SaaS Framework Authentication"""
    
    def __init__(self, api_key, base_url):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        }
    
    def login(self, email, password):
        """Login user and get session token"""
        response = requests.post(
            f'{self.base_url}/login',
            headers=self.headers,
            json={'email': email, 'password': password}
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Login failed: {response.json().get('message', 'Unknown error')}")
    
    def verify_token(self, token):
        """Verify if token is valid"""
        headers = {**self.headers, 'Authorization': f'Bearer {token}'}
        response = requests.get(f'{self.base_url}/verify', headers=headers)
        return response.status_code == 200
    
    def get_current_user(self, token):
        """Get user info from token"""
        headers = {**self.headers, 'Authorization': f'Bearer {token}'}
        response = requests.get(f'{self.base_url}/verify', headers=headers)
        
        if response.status_code == 200:
            return response.json()['user']
        else:
            raise Exception("Invalid or expired token")

class SaaSFrameworkRBAC:
    """Python client for SaaS Framework RBAC"""
    
    def __init__(self, api_key, base_url):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        }
    
    def has_permission(self, user_id, permission):
        """Check if user has specific permission"""
        response = requests.post(
            f'{self.base_url}/check-permission',
            headers=self.headers,
            json={'userId': user_id, 'permission': permission}
        )
        
        if response.status_code == 200:
            return response.json().get('hasPermission', False)
        return False
    
    def get_user_roles(self, user_id):
        """Get user's roles"""
        response = requests.get(
            f'{self.base_url}/users/{user_id}/roles',
            headers=self.headers
        )
        
        if response.status_code == 200:
            return response.json()
        return []
    
    def assign_role(self, user_id, role_id):
        """Assign role to user"""
        response = requests.post(
            f'{self.base_url}/user-roles',
            headers=self.headers,
            json={'userId': user_id, 'roleId': role_id}
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to assign role: {response.json().get('message', 'Unknown error')}")

# DEMO USAGE
def demo_python_integration():
    """Complete Python integration demo"""
    
    print("🐍 PYTHON INTEGRATION DEMO")
    print("=" * 50)
    
    # Initialize clients with real API keys
    auth = SaaSFrameworkAuth(
        api_key='auth_10409cf4aad145939786c8e8',
        base_url='https://your-platform.replit.app/api/v2/auth'
    )
    
    rbac = SaaSFrameworkRBAC(
        api_key='rbac_801f97feaf5a4d1a8bbb9b87',
        base_url='https://your-platform.replit.app/api/v2/rbac'
    )
    
    try:
        # Step 1: Authenticate user
        print("1. 🔐 Authenticating user...")
        session = auth.login('admin@testcompany.com', 'temp123!')
        print(f"   ✅ Login successful: {session['user']['email']}")
        print(f"   🎫 Token: {session['token'][:20]}...")
        
        # Step 2: Verify token
        print("\n2. ✅ Verifying token...")
        is_valid = auth.verify_token(session['token'])
        print(f"   Token valid: {is_valid}")
        
        # Step 3: Get user info
        print("\n3. 👤 Getting user info...")
        user = auth.get_current_user(session['token'])
        print(f"   User ID: {user['userId']}")
        print(f"   Tenant: {user['tenantId']}")
        
        # Step 4: Check permissions
        print("\n4. 🔒 Checking permissions...")
        can_admin = rbac.has_permission(user['userId'], 'admin.access')
        can_create_posts = rbac.has_permission(user['userId'], 'posts.create')
        print(f"   Admin access: {can_admin}")
        print(f"   Can create posts: {can_create_posts}")
        
        # Step 5: Get user roles
        print("\n5. 👥 Getting user roles...")
        roles = rbac.get_user_roles(user['userId'])
        print(f"   User roles: {[role['name'] for role in roles]}")
        
        print("\n🎉 PYTHON INTEGRATION SUCCESSFUL!")
        print("   Any language can integrate this easily!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    demo_python_integration()

# FLASK WEB APPLICATION EXAMPLE
from flask import Flask, request, jsonify, g
from functools import wraps

app = Flask(__name__)

# Initialize SaaS Framework clients
auth_client = SaaSFrameworkAuth(
    api_key='auth_10409cf4aad145939786c8e8',
    base_url='https://your-platform.replit.app/api/v2/auth'
)

rbac_client = SaaSFrameworkRBAC(
    api_key='rbac_801f97feaf5a4d1a8bbb9b87',
    base_url='https://your-platform.replit.app/api/v2/rbac'
)

# Authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization token required'}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            if not auth_client.verify_token(token):
                return jsonify({'error': 'Invalid token'}), 401
            
            g.user = auth_client.get_current_user(token)
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': str(e)}), 401
    
    return decorated_function

# Permission decorator
def require_permission(permission):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            if not rbac_client.has_permission(g.user['userId'], permission):
                return jsonify({'error': f'Permission denied: {permission}'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Flask routes
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    try:
        session = auth_client.login(data['email'], data['password'])
        return jsonify(session)
    except Exception as e:
        return jsonify({'error': str(e)}), 401

@app.route('/profile')
@require_auth
def profile():
    return jsonify({'user': g.user, 'message': 'Authenticated profile access'})

@app.route('/admin')
@require_auth
@require_permission('admin.access')
def admin():
    return jsonify({'message': 'Admin area - Python Flask + SaaS Framework!'})

if __name__ == '__main__':
    print("🌐 Flask app with SaaS Framework integration running!")
    app.run(debug=True, port=5001)