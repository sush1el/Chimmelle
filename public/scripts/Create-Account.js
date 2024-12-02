document.getElementById('createAccountForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
  const nameRegex = /^[A-Za-z\s'-]+$/; // Allow letters, spaces, hyphens, and apostrophes

  
  if (!nameRegex.test(firstName)) {
    await Swal.fire({
      icon: 'error',
      title: 'Invalid First Name',
      text: 'First name can only contain letters, spaces, hyphens, and apostrophes.',
      confirmButtonText: 'OK'
    });
    return;
  }

  if (!nameRegex.test(lastName)) {
    await Swal.fire({
      icon: 'error',
      title: 'Invalid Last Name',
      text: 'Last name can only contain letters, spaces, hyphens, and apostrophes.',
      confirmButtonText: 'OK'
    });
    return;
  }

  const formData = {
    firstName: firstName,
    lastName: lastName,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  };

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (response.ok) {
      // Show loading alert while waiting for verification
      const loadingAlert = Swal.fire({
        title: 'Account Created!',
        html: `
          Please check your email (${formData.email}) and click the verification link.<br><br>
          <div class="swal2-timer-progress-bar-container">
            <div class="verification-spinner"></div>
          </div>
          Waiting for email verification...
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Start polling for verification status
      const pollInterval = 2000; // Poll every 2 seconds
      const maxAttempts = 300; // Maximum 10 minutes of polling (300 * 2 seconds)
      let attempts = 0;

      const pollVerificationStatus = async () => {
        if (attempts >= maxAttempts) {
          await Swal.fire({
            icon: 'error',
            title: 'Verification Timeout',
            text: 'Please try verifying your email again or contact support.',
            confirmButtonText: 'OK'
          });
          window.location.href = '/login-page';
          return;
        }

        try {
          const verifyResponse = await fetch(`http://localhost:5000/api/auth/check-verification/${data.userId}`);
          const verifyData = await verifyResponse.json();

          if (verifyResponse.ok && verifyData.verified) {
            await Swal.fire({
              icon: 'success',
              title: 'Email Verified!',
              text: 'Your account has been successfully verified. You can now log in.',
              confirmButtonText: 'Proceed to Login'
            });
            window.location.href = '/login-page';
            return;
          }
        } catch (error) {
          console.error('Verification check error:', error);
        }

        attempts++;
        setTimeout(pollVerificationStatus, pollInterval);
      };

      // Start polling
      pollVerificationStatus();

    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: data.msg || 'Account creation failed. Please try again.',
        confirmButtonText: 'OK'
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'There was an issue with account creation. Please try again later.',
      confirmButtonText: 'OK'
    });
  }
});

['firstName', 'lastName'].forEach(fieldId => {
  document.getElementById(fieldId).addEventListener('input', (e) => {
    const input = e.target;
    const nameRegex = /^[A-Za-z\s'-]+$/;
    
    if (!nameRegex.test(input.value)) {
      input.setCustomValidity('Name can only contain letters, spaces, hyphens, and apostrophes');
    } else {
      input.setCustomValidity('');
    }
  });
});

// Password validation code
document.getElementById('password').addEventListener('input', (e) => {
    const password = e.target.value;
    const requirements = [
        { regex: /.{8,}/, text: 'At least 8 characters long' },
        { regex: /[A-Z]/, text: 'Contains uppercase letter' },
        { regex: /[a-z]/, text: 'Contains lowercase letter' },
        { regex: /[0-9]/, text: 'Contains number' },
        { regex: /[!@#$%^&*(),.?":{}|<>]/, text: 'Contains special character' }
    ];

    // Update requirements list in real-time
    let requirementsList = document.getElementById('password-requirements');
    if (!requirementsList) {
        requirementsList = document.createElement('ul');
        requirementsList.id = 'password-requirements';
        e.target.parentNode.insertBefore(requirementsList, e.target.nextSibling);
    }

    requirementsList.innerHTML = requirements
        .map(req => `
            <li style="color: ${req.regex.test(password) ? 'green' : 'red'}">
                ${req.regex.test(password) ? '✓' : '×'} ${req.text}
            </li>
        `)
        .join('');
});
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];
  if (password.length < minLength) errors.push(`Password must be at least ${minLength} characters long`);
  if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter');
  if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter');
  if (!hasNumbers) errors.push('Password must contain at least one number');
  if (!hasSpecialChar) errors.push('Password must contain at least one special character');

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Password Toggle Functionality
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', (e) => {
        const passwordInput = e.target.closest('.password-container').querySelector('input');
        const eyeIcon = e.target.closest('button').querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.classList.remove('fa-regular', 'fa-eye');
            eyeIcon.classList.add('fa-solid', 'fa-eye');
        } else {
            passwordInput.type = 'password';
            eyeIcon.classList.remove('fa-solid', 'fa-eye');
            eyeIcon.classList.add('fa-regular', 'fa-eye');
        }
    });
});

// Re-enter password validation
document.getElementById('confirmPassword').addEventListener('input', (e) => {
    const password = document.getElementById('password').value;
    const confirmPassword = e.target.value;
    const passwordMatchElement = document.getElementById('password-match');

    if (password === confirmPassword) {
        passwordMatchElement.innerHTML = '<p style="color: green;">✓ Passwords match</p>';
    } else {
        passwordMatchElement.innerHTML = '<p style="color: red;">× Passwords do not match</p>';
    }
});

// Form submission validation
document.getElementById('createAccountForm').addEventListener('submit', (e) => {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const { isValid, errors } = validatePassword(password);

    if (!isValid || password !== confirmPassword) {
        e.preventDefault();
        let errorMessage = '';
        if (!isValid) {
            errorMessage += 'Please ensure your password meets the following requirements:<br>';
            errors.forEach(error => {
                errorMessage += `- ${error}<br>`;
            });
        }
        if (password !== confirmPassword) {
            errorMessage += 'Passwords do not match.';
        }
        Swal.fire({
            icon: 'error',
            title: 'Password Requirements Not Met',
            html: errorMessage,
            confirmButtonText: 'OK'
        });
    }
});