document.addEventListener('DOMContentLoaded', function() {
  const passwordInput = document.getElementById('newPassword');
  const confirmInput = document.getElementById('confirmPassword');
  const form = document.getElementById('resetPasswordForm');
  const passwordRequirements = document.getElementById('password-requirements');
  const submitButton = document.querySelector('.reset-password-btn');
  const passwordMatchIndicator = document.getElementById('password-match-indicator');

  // Toggle password visibility
  const toggleButtons = document.querySelectorAll('.toggle-password');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetInput = this.previousElementSibling;
      const icon = this.querySelector('i');
      
      if (targetInput.type === 'password') {
        targetInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        targetInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });

  // Password validation and match checking
  function validatePasswordRequirements(password) {
    const requirements = [
      { 
        regex: /.{8,}/, 
        text: 'At least 8 characters long',
        key: 'length'
      },
      { 
        regex: /[A-Z]/, 
        text: 'Contains uppercase letter',
        key: 'uppercase'
      },
      { 
        regex: /[a-z]/, 
        text: 'Contains lowercase letter',
        key: 'lowercase'
      },
      { 
        regex: /[0-9]/, 
        text: 'Contains number',
        key: 'number'
      },
      { 
        regex: /[!@#$%^&*(),.?":{}|<>]/, 
        text: 'Contains special character',
        key: 'special'
      }
    ];

    const validationResults = requirements.map(req => ({
      ...req,
      passed: req.regex.test(password)
    }));

    passwordRequirements.innerHTML = validationResults
      .map(req => `
        <li data-requirement="${req.key}" style="color: ${req.passed ? 'green' : 'red'}">
          ${req.passed ? '✓' : '×'} ${req.text}
        </li>
      `)
      .join('');

    return validationResults.every(req => req.passed);
  }

  function checkPasswordMatch() {
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    if (confirmPassword) {
      if (password === confirmPassword) {
        passwordMatchIndicator.textContent = 'Passwords match ✓';
        passwordMatchIndicator.className = 'password-match-success';
        return true;
      } else {
        passwordMatchIndicator.textContent = 'Passwords do not match ✗';
        passwordMatchIndicator.className = 'password-match-error';
        return false;
      }
    } else {
      passwordMatchIndicator.textContent = '';
      passwordMatchIndicator.className = '';
      return false;
    }
  }

  // Event listeners for input
  passwordInput.addEventListener('input', (e) => {
    const password = e.target.value;
    validatePasswordRequirements(password);
    
    if (confirmInput.value) {
      checkPasswordMatch();
    }
  });

  confirmInput.addEventListener('input', checkPasswordMatch);

  // Submit event listener
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;
    const token = window.location.pathname.split('/').pop();
    
    // Disable submit button to prevent spam
    submitButton.disabled = true;
    submitButton.classList.add('disabled');

    // Validate password requirements and match
    const isValid = validatePasswordRequirements(password);
    const passwordsMatch = checkPasswordMatch();
    
    if (!isValid) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Password',
        text: 'Password does not meet all requirements',
        confirmButtonColor: '#d33'
      });
      
      submitButton.disabled = false;
      submitButton.classList.remove('disabled');
      return;
    }

    if (!passwordsMatch) {
      Swal.fire({
        icon: 'error',
        title: 'Password Mismatch',
        text: 'Passwords do not match',
        confirmButtonColor: '#d33'
      });
      
      submitButton.disabled = false;
      submitButton.classList.remove('disabled');
      return;
    }

    try {
      const response = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Password Reset',
          text: 'Your password has been successfully reset.',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Go to Login'
        }).then(() => {
          window.location.href = '/login-page';
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Reset Failed',
          text: data.msg || 'Error resetting password',
          confirmButtonColor: '#d33'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Error connecting to server. Please try again.',
        confirmButtonColor: '#d33'
      });
    } finally {
      // Re-enable submit button after a delay to prevent rapid successive requests
      setTimeout(() => {
        submitButton.disabled = false;
        submitButton.classList.remove('disabled');
      }, 5000); // 5 seconds cooldown
    }
  });
});