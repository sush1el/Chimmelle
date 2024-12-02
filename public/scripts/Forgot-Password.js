document.getElementById('forgotPasswordForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const submitButton = document.querySelector('.reset-password-btn');
  
  // Disable submit button to prevent spam
  submitButton.disabled = true;
  submitButton.classList.add('disabled');

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
      Swal.fire({
        icon: 'success',
        title: 'Password Reset Email Sent',
        text: 'Please check your inbox for the reset link.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK'
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: data.msg || 'Error sending reset email',
        confirmButtonColor: '#d33',
        confirmButtonText: 'Try Again'
      });
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Server Error',
      text: 'Error connecting to server. Please try again later.',
      confirmButtonColor: '#d33',
      confirmButtonText: 'Close'
    });
  } finally {
    // Re-enable submit button after a delay to prevent rapid successive requests
    setTimeout(() => {
      submitButton.disabled = false;
      submitButton.classList.remove('disabled');
    }, 5000); // 5 seconds cooldown
  }
});