# Login Page Project

## Overview
A clean, modern login page with the following features:
- Removed InsideBox branding
- Removed "Forgot password" link
- Removed "Sign in with Google" option
- Clean, responsive design
- Form validation
- Python Flask backend

## Project Structure
```
├── html/
│   └── login.html          # Main HTML file
├── CSS/
│   └── login.css           # External CSS styles
├── JavaScript/
│   └── login.js            # Frontend JavaScript
├── Python/
│   └── login.py            # Flask backend server
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Features
- **Clean Design**: Modern, minimalist login form
- **Form Validation**: Client-side and server-side validation
- **Remember Me**: 30-day remember functionality
- **Responsive**: Works on desktop and mobile
- **Security**: Password hashing, JWT tokens
- **Database**: SQLite database for user storage

## Setup Instructions

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Flask Server
```bash
cd Python
python login.py
```

The server will start on `http://localhost:5000`

### 3. Open the Login Page
Open `html/login.html` in your web browser or serve it through a web server.

## Test Credentials
- Email: `test@example.com`
- Password: `password123`

## API Endpoints

### POST /login
Login with email and password
```json
{
    "email": "user@example.com",
    "password": "password123",
    "remember": true
}
```

### POST /register
Register a new user
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

### POST /verify-token
Verify JWT token
```json
{
    "token": "your_jwt_token"
}
```

## Security Features
- Password hashing with SHA-256
- JWT token authentication
- CORS enabled for frontend communication
- Input validation and sanitization
- SQL injection protection

## Customization
- Modify `CSS/login.css` for styling changes
- Update `JavaScript/login.js` for frontend behavior
- Edit `Python/login.py` for backend logic
- Change database settings in the Python file

## Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge
