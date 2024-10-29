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
          alert("Account created successfully!");
          window.location.href = '/login-page';
      } else {
          alert(`Error: ${data.msg || 'Account creation failed. Please try again.'}`);
      }
  } catch (error) {
      console.error('Registration error:', error);
      alert("There was an issue with account creation. Please try again later.");
  }
});