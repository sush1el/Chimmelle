document.querySelector('.login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.querySelector('[placeholder="Email"]').value;
    const password = document.querySelector('[placeholder="Password"]').value;

    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        // Don't parse JSON if it's a redirect
        if (response.redirected) {
            window.location.href = response.url;
            return;
        }

        const data = await response.json();

        if (response.ok) {
            window.location.href = '/';
        } else {
            alert(data.msg || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred while logging in');
    }
});