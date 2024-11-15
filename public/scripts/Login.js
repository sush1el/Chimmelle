document.querySelector('.login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.querySelector('[placeholder="Email"]').value;
    const password = document.querySelector('[placeholder="Password"]').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            if (data.isAdmin) {
                // Admin login successful
                window.location.href = '/admin/dashboard';
            } else {
                // Regular user login successful
                window.location.href = '/';
            }
        } else if (response.status === 401 && data.needsVerification) {
            // Handle unverified user case
            alert('Please verify your email before logging in.');
        } else {
            // Handle other error cases
            alert(data.msg || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred while logging in');
    }
});