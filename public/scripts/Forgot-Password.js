document.getElementById('forgotPasswordForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const messageDiv = document.createElement('div');
  messageDiv.style.marginTop = '10px';
  messageDiv.style.padding = '10px';
  messageDiv.style.borderRadius = '5px';
  
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.style.backgroundColor = '#d4edda';
      messageDiv.style.color = '#155724';
      messageDiv.textContent = 'Password reset email sent. Please check your inbox.';
    } else {
      messageDiv.style.backgroundColor = '#f8d7da';
      messageDiv.style.color = '#721c24';
      messageDiv.textContent = data.msg || 'Error sending reset email';
    }
  } catch (error) {
    messageDiv.style.backgroundColor = '#f8d7da';
    messageDiv.style.color = '#721c24';
    messageDiv.textContent = 'Error connecting to server';
  }

  // Add message to the form
  const form = document.getElementById('forgotPasswordForm');
  form.appendChild(messageDiv);
});