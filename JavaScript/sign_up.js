// Signup form validation and submission
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const signupBtn = document.querySelector('.signup-btn');

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Password strength requirements
    const passwordRequirements = {
        minLength: 8,
        hasUpperCase: /[A-Z]/,
        hasLowerCase: /[a-z]/,
        hasNumber: /\d/,
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/
    };

    // Form validation
    function validateForm() {
        let isValid = true;
        
        // Clear previous error states
        clearErrors();
        
        // Validate name
        if (!nameInput.value.trim()) {
            showError(nameInput, 'Name is required');
            isValid = false;
        } else if (nameInput.value.trim().length < 2) {
            showError(nameInput, 'Name must be at least 2 characters');
            isValid = false;
        } else if (!/^[a-zA-Z\s]+$/.test(nameInput.value.trim())) {
            showError(nameInput, 'Name can only contain letters and spaces');
            isValid = false;
        } else {
            showSuccess(nameInput);
        }
        
        // Validate email
        if (!emailInput.value.trim()) {
            showError(emailInput, 'Email is required');
            isValid = false;
        } else if (!emailRegex.test(emailInput.value)) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
        } else {
            showSuccess(emailInput);
        }
        
        // Validate password
        const passwordValidation = validatePassword(passwordInput.value);
        if (!passwordValidation.isValid) {
            showError(passwordInput, passwordValidation.message);
            isValid = false;
        } else {
            showSuccess(passwordInput);
            showPasswordStrength(passwordInput.value);
        }
        
        // Validate confirm password
        if (!confirmPasswordInput.value.trim()) {
            showError(confirmPasswordInput, 'Please confirm your password');
            isValid = false;
        } else if (passwordInput.value !== confirmPasswordInput.value) {
            showError(confirmPasswordInput, 'Passwords do not match');
            isValid = false;
        } else {
            showSuccess(confirmPasswordInput);
        }
        
        return isValid;
    }

    // Validate password strength
    function validatePassword(password) {
        if (!password) {
            return { isValid: false, message: 'Password is required' };
        }
        
        if (password.length < passwordRequirements.minLength) {
            return { isValid: false, message: `Password must be at least ${passwordRequirements.minLength} characters` };
        }
        
        if (!passwordRequirements.hasUpperCase.test(password)) {
            return { isValid: false, message: 'Password must contain at least one uppercase letter' };
        }
        
        if (!passwordRequirements.hasLowerCase.test(password)) {
            return { isValid: false, message: 'Password must contain at least one lowercase letter' };
        }
        
        if (!passwordRequirements.hasNumber.test(password)) {
            return { isValid: false, message: 'Password must contain at least one number' };
        }
        
        if (!passwordRequirements.hasSpecialChar.test(password)) {
            return { isValid: false, message: 'Password must contain at least one special character' };
        }
        
        return { isValid: true, message: 'Password is strong' };
    }

    // Show password strength indicator
    function showPasswordStrength(password) {
        const strength = calculatePasswordStrength(password);
        const strengthDiv = document.createElement('div');
        strengthDiv.className = `password-strength strength-${strength.level}`;
        strengthDiv.textContent = `Password strength: ${strength.text}`;
        
        // Remove existing strength indicator
        const existingStrength = passwordInput.parentNode.querySelector('.password-strength');
        if (existingStrength) {
            existingStrength.remove();
        }
        
        passwordInput.parentNode.appendChild(strengthDiv);
    }

    // Calculate password strength
    function calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (passwordRequirements.hasUpperCase.test(password)) score++;
        if (passwordRequirements.hasLowerCase.test(password)) score++;
        if (passwordRequirements.hasNumber.test(password)) score++;
        if (passwordRequirements.hasSpecialChar.test(password)) score++;
        
        if (score < 3) return { level: 'weak', text: 'Weak' };
        if (score < 5) return { level: 'medium', text: 'Medium' };
        return { level: 'strong', text: 'Strong' };
    }

    // Show error for input field
    function showError(input, message) {
        input.classList.add('error');
        input.classList.remove('success');
        
        // Remove existing error message for this input
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
    }

    // Show success for input field
    function showSuccess(input) {
        input.classList.add('success');
        input.classList.remove('error');
        
        // Remove existing error message for this input
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    // Clear all errors
    function clearErrors() {
        const errorInputs = document.querySelectorAll('.error');
        const successInputs = document.querySelectorAll('.success');
        const errorMessages = document.querySelectorAll('.error-message');
        const strengthIndicators = document.querySelectorAll('.password-strength');
        
        errorInputs.forEach(input => input.classList.remove('error'));
        successInputs.forEach(input => input.classList.remove('success'));
        errorMessages.forEach(message => message.remove());
        strengthIndicators.forEach(indicator => indicator.remove());
    }

    // Set loading state
    function setLoadingState(isLoading) {
        if (isLoading) {
            signupBtn.classList.add('loading');
            signupBtn.disabled = true;
            signupBtn.textContent = 'Creating account...';
        } else {
            signupBtn.classList.remove('loading');
            signupBtn.disabled = false;
            signupBtn.textContent = 'Signup';
        }
    }

    // Handle form submission
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setLoadingState(true);
        
        try {
            const formData = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim().toLowerCase(),
                password: passwordInput.value
            };
            
            // Send data to Python backend
            const response = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Success
                showFormMessage('Account created successfully! Redirecting to dashboard...', 'success');
                
                // Store token, name and email for dashboard session
                try {
                    if (result.token) {
                        localStorage.setItem('authToken', result.token);
                    }
                    if (result.user) {
                        localStorage.setItem('userName', result.user.name || nameInput.value.trim());
                        localStorage.setItem('userEmail', result.user.email || emailInput.value.trim());
                    } else {
                        localStorage.setItem('userName', nameInput.value.trim());
                        localStorage.setItem('userEmail', emailInput.value.trim());
                    }
                } catch (e) { /* ignore */ }
                
                // Redirect to dashboard after 1 second
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                // Error from server
                showFormMessage(result.message || 'Registration failed. Please try again.', 'error');
            }
            
        } catch (error) {
            console.error('Error:', error);
            showFormMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            setLoadingState(false);
        }
    });

    // Show form message
    function showFormMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `form-feedback ${type}`;
        messageDiv.textContent = message;
        signupForm.insertBefore(messageDiv, signupForm.firstChild);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    // Real-time validation for name
    nameInput.addEventListener('blur', function() {
        if (this.value.trim() && this.value.trim().length < 2) {
            showError(this, 'Name must be at least 2 characters');
        } else if (this.value.trim() && !/^[a-zA-Z\s]+$/.test(this.value.trim())) {
            showError(this, 'Name can only contain letters and spaces');
        } else if (this.value.trim()) {
            showSuccess(this);
        }
    });

    // Real-time validation
    emailInput.addEventListener('blur', function() {
        if (this.value.trim() && !emailRegex.test(this.value)) {
            showError(this, 'Please enter a valid email address');
        } else if (this.value.trim()) {
            showSuccess(this);
        }
    });

    passwordInput.addEventListener('input', function() {
        if (this.value.length > 0) {
            const validation = validatePassword(this.value);
            if (validation.isValid) {
                showSuccess(this);
                showPasswordStrength(this.value);
            } else {
                showError(this, validation.message);
            }
        } else {
            clearErrors();
        }
    });

    confirmPasswordInput.addEventListener('input', function() {
        if (this.value.length > 0) {
            if (passwordInput.value === this.value) {
                showSuccess(this);
            } else {
                showError(this, 'Passwords do not match');
            }
        } else {
            clearErrors();
        }
    });

    // Clear errors on input
    // Clear errors on input
    nameInput.addEventListener('input', function() {
        if (this.classList.contains('error')) {
            clearErrors();
        }
    });

    emailInput.addEventListener('input', function() {
        if (this.classList.contains('error')) {
            clearErrors();
        }
    });

    // Add some interactive effects
    // Add some interactive effects
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
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
