from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import hashlib
import sqlite3
import os
from datetime import datetime, timedelta
import jwt
import secrets

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Secret key for JWT tokens (in production, use environment variables)
app.config['SECRET_KEY'] = secrets.token_hex(32)

# Database setup
DATABASE = 'users.db'

def init_db():
    """Initialize the database with users table"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    ''')
    
    conn.commit()
    conn.close()

def hash_password(password):
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, password_hash):
    """Verify password against hash"""
    return hash_password(password) == password_hash

def generate_token(user_id, email):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=30)  # Token expires in 30 days
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@app.route('/')
def index():
    """Serve the login page"""
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    """Handle login requests"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate input
        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400
        
        if len(password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters'}), 400
        
        # Connect to database
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute('SELECT id, name, password_hash, is_active FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'message': 'Invalid email or password'}), 401
        
        user_id, name, password_hash, is_active = user
        
        if not is_active:
            conn.close()
            return jsonify({'message': 'Account is deactivated'}), 401
        
        # Verify password
        if not verify_password(password, password_hash):
            conn.close()
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Update last login
        cursor.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', (user_id,))
        conn.commit()
        conn.close()
        
        # Generate token
        token = generate_token(user_id, email)
        
        # Prepare response
        response_data = {
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user_id,
                'name': name,
                'email': email
            }
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/register', methods=['POST'])
def register():
    """Handle user registration"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate input
        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400
        
        if len(password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters'}), 400
        
        # Connect to database
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'message': 'User already exists'}), 409
        
        # Create new user
        password_hash = hash_password(password)
        cursor.execute('''
            INSERT INTO users (email, password_hash) 
            VALUES (?, ?)
        ''', (email, password_hash))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Generate token
        token = generate_token(user_id, email)
        
        response_data = {
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': user_id,
                'email': email
            }
        }
        
        return jsonify(response_data), 201
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/verify-token', methods=['POST'])
def verify_token_endpoint():
    """Verify JWT token"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'message': 'Token is required'}), 400
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'message': 'Invalid or expired token'}), 401
        
        return jsonify({'valid': True, 'user': payload}), 200
        
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/dashboard')
def dashboard():
    """Protected dashboard route"""
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': 'Token required'}), 401
    
    # Remove 'Bearer ' prefix if present
    if token.startswith('Bearer '):
        token = token[7:]
    
    payload = verify_token(token)
    if not payload:
        return jsonify({'message': 'Invalid or expired token'}), 401
    
    return jsonify({'message': f'Welcome to dashboard, {payload["email"]}'}), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize database
    init_db()
    
    # Create some sample users for testing
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Check if we have any users, if not create a test user
    cursor.execute('SELECT COUNT(*) FROM users')
    user_count = cursor.fetchone()[0]
    
    if user_count == 0:
        test_email = 'test@example.com'
        test_password = 'password123'
        password_hash = hash_password(test_password)
        
        cursor.execute('''
            INSERT INTO users (email, password_hash) 
            VALUES (?, ?)
        ''', (test_email, password_hash))
        
        print(f"Created test user: {test_email} / {test_password}")
    
    conn.commit()
    conn.close()
    
    # Run the Flask app
    print("Starting Flask server...")
    print("Test user: test@example.com / password123")
    app.run(debug=True, host='0.0.0.0', port=5000)
