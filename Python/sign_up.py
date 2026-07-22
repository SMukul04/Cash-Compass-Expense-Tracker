from flask import Flask, request, jsonify
from flask_cors import CORS
import hashlib
import sqlite3
import os
from datetime import datetime, timedelta   
import jwt
import secrets
import re


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

def validate_email(email):
    """Validate email format"""
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(email_regex, email) is not None

def validate_password_strength(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is strong"

def generate_token(user_id, email):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=30)  # Token expires in 30 days
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

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
        
        # Validate email format
        if not validate_email(email):
            return jsonify({'message': 'Please enter a valid email address'}), 400
        
        # Validate password strength
        is_strong, strength_message = validate_password_strength(password)
        if not is_strong:
            return jsonify({'message': strength_message}), 400
        
        # Connect to database
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'message': 'User already exists with this email'}), 409
        
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

@app.route('/check-email', methods=['POST'])
def check_email():
    """Check if email is already registered"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'message': 'Email is required'}), 400
        
        if not validate_email(email):
            return jsonify({'message': 'Invalid email format'}), 400
        
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        user_exists = cursor.fetchone() is not None
        
        conn.close()
        
        return jsonify({
            'email': email,
            'exists': user_exists,
            'message': 'Email is available' if not user_exists else 'Email is already registered'
        }), 200
        
    except Exception as e:
        print(f"Email check error: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/validate-password', methods=['POST'])
def validate_password():
    """Validate password strength"""
    try:
        data = request.get_json()
        password = data.get('password', '')
        
        if not password:
            return jsonify({'message': 'Password is required'}), 400
        
        is_strong, message = validate_password_strength(password)
        
        return jsonify({
            'is_strong': is_strong,
            'message': message,
            'strength': calculate_password_strength(password)
        }), 200
        
    except Exception as e:
        print(f"Password validation error: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

def calculate_password_strength(password):
    """Calculate password strength score"""
    score = 0
    
    if len(password) >= 8:
        score += 1
    if len(password) >= 12:
        score += 1
    if re.search(r'[A-Z]', password):
        score += 1
    if re.search(r'[a-z]', password):
        score += 1
    if re.search(r'\d', password):
        score += 1
    if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        score += 1
    
    if score < 3:
        return 'weak'
    elif score < 5:
        return 'medium'
    else:
        return 'strong'

@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize database
    init_db()
    
    print("Starting Signup Flask server...")
    print("Server running on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
