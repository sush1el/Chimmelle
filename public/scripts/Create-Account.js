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
          alert("Account created, Please check your email for verification link.");
          window.location.href = '/login-page';
      } else {
          alert(`Error: ${data.msg || 'Account creation failed. Please try again.'}`);
      }
  } catch (error) {
      console.error('Registration error:', error);
      alert("There was an issue with account creation. Please try again later.");
  }
});

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