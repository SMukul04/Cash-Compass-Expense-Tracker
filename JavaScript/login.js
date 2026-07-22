// Login form validation and submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const signupBtn = document.querySelector('.signup-btn');

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Form validation
    function validateForm() {
        let isValid = true;
        
        // Clear previous error states
        clearErrors();
        
        // Validate email
        if (!emailInput.value.trim()) {
            showError(emailInput, 'Email is required');
            isValid = false;
        } else if (!emailRegex.test(emailInput.value)) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }
        
        // Validate password
        if (!passwordInput.value.trim()) {
            showError(passwordInput, 'Password is required');
            isValid = false;
        } else if (passwordInput.value.length < 6) {
            showError(passwordInput, 'Password must be at least 6 characters');
            isValid = false;
        }
        
        return isValid;
    }

    // Show error for input field
    function showError(input, message) {
        input.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
    }

    // Clear all errors
    function clearErrors() {
        const errorInputs = document.querySelectorAll('.error');
        const errorMessages = document.querySelectorAll('.error-message');
        
        errorInputs.forEach(input => input.classList.remove('error'));
        errorMessages.forEach(message => message.remove());
    }

    // Set loading state
    function setLoadingState(isLoading) {
        if (isLoading) {
            signupBtn.classList.add('loading');
            signupBtn.disabled = true;
            signupBtn.textContent = 'Signing up...';
        } else {
            signupBtn.classList.remove('loading');
            signupBtn.disabled = false;
            signupBtn.textContent = 'Sign up';
        }
    }

    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setLoadingState(true);
        
        try {
            const formData = {
                email: emailInput.value.trim(),
                password: passwordInput.value
            };
            
            // Send data to Python backend
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Success
                showSuccessMessage('Login successful!');
                
                // Persist user info for dashboard
                try {
                    localStorage.setItem('authToken', result.token || '');
                    if (result.user) {
                        localStorage.setItem('userName', result.user.name || '');
                        localStorage.setItem('userEmail', result.user.email || '');
                    }
                } catch (e) {
                    console.warn('LocalStorage not available', e);
                }
                
                // Redirect to dashboard page
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 800);
            } else {
                // Error from server
                showErrorMessage(result.message || 'Login failed. Please try again.');
            }
            
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Network error. Please check your connection and try again.');
        } finally {
            setLoadingState(false);
        }
    });

    // Show success message
    function showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            background: #d4edda;
            color: #155724;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            border: 1px solid #c3e6cb;
            text-align: center;
        `;
        successDiv.textContent = message;
        loginForm.insertBefore(successDiv, loginForm.firstChild);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    // Show error message
    function showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            border: 1px solid #f5c6cb;
            text-align: center;
        `;
        errorDiv.textContent = message;
        loginForm.insertBefore(errorDiv, loginForm.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Real-time validation
    emailInput.addEventListener('blur', function() {
        if (this.value.trim() && !emailRegex.test(this.value)) {
            showError(this, 'Please enter a valid email address');
        } else {
            clearErrors();
        }
    });

    passwordInput.addEventListener('blur', function() {
        if (this.value.trim() && this.value.length < 6) {
            showError(this, 'Password must be at least 6 characters');
        } else {
            clearErrors();
        }
    });

    // Clear errors on input
    emailInput.addEventListener('input', clearErrors);
    passwordInput.addEventListener('input', clearErrors);


    // Add some interactive effects
    const inputs = document.querySelectorAll('input[type="email"], input[type="password"]');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentNode.style.transform = 'translateY(-2px)';
            this.parentNode.style.transition = 'transform 0.2s ease';
        });
        
        input.addEventListener('blur', function() {
            this.parentNode.style.transform = 'translateY(0)';
        });
    });
});
