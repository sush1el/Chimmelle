document.getElementById('createAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const formData = {
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    };
  
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
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
  
  // Keep the existing password validation code
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