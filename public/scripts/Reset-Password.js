document.addEventListener('DOMContentLoaded', function() {
  const passwordInput = document.getElementById('newPassword');
  const confirmInput = document.getElementById('confirmPassword');
  const form = document.getElementById('resetPasswordForm');

  // Password validation using same approach as Create-Account.js
  passwordInput.addEventListener('input', (e) => {
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

  form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const password = passwordInput.value;
      const confirmPassword = confirmInput.value;
      const token = window.location.pathname.split('/').pop();
      
      // Remove any existing message
      const existingMessage = document.querySelector('.message');
      if (existingMessage) {
          existingMessage.remove();
      }

      // Create new message div
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message');

      // Check if password meets all requirements
      const requirements = [
          { regex: /.{8,}/, text: 'At least 8 characters long' },
          { regex: /[A-Z]/, text: 'Contains uppercase letter' },
          { regex: /[a-z]/, text: 'Contains lowercase letter' },
          { regex: /[0-9]/, text: 'Contains number' },
          { regex: /[!@#$%^&*(),.?":{}|<>]/, text: 'Contains special character' }
      ];

      const isValid = requirements.every(req => req.regex.test(password));
      
      if (!isValid) {
          messageDiv.classList.add('error-message');
          messageDiv.textContent = 'Password does not meet all requirements';
          form.insertBefore(messageDiv, form.firstChild);
          return;
      }

      if (password !== confirmPassword) {
          messageDiv.classList.add('error-message');
          messageDiv.textContent = 'Passwords do not match';
          form.insertBefore(messageDiv, form.firstChild);
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
              messageDiv.classList.add('success-message');
              messageDiv.textContent = 'Password successfully reset. Redirecting to login...';
              form.insertBefore(messageDiv, form.firstChild);
              
              setTimeout(() => {
                  window.location.href = '/login-page';
              }, 2000);
          } else {
              messageDiv.classList.add('error-message');
              messageDiv.textContent = data.msg || 'Error resetting password';
              form.insertBefore(messageDiv, form.firstChild);
          }
      } catch (error) {
          messageDiv.classList.add('error-message');
          messageDiv.textContent = 'Error connecting to server';
          form.insertBefore(messageDiv, form.firstChild);
      }
  });
});