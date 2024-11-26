document.addEventListener('DOMContentLoaded', function () {
    // Get all nav links and sections
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.section');

    // Update active section based on hash
    function updateActiveSection() {
        const hash = window.location.hash || '#products';

        // Hide all sections first
        sections.forEach(section => section.style.display = 'none');

        // Remove active class from all links
        navLinks.forEach(link => link.classList.remove('active'));

        // Show the selected section
        const targetSection = document.querySelector(hash);
        if (targetSection) {
            targetSection.style.display = 'block';

            // Update active nav link
            const activeLink = document.querySelector(`a[href="${hash}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    }

    // Add click handlers to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            window.location.hash = href;
            updateActiveSection();
        });
    });

    // Handle initial load and hash changes
    window.addEventListener('hashchange', updateActiveSection);
    updateActiveSection();

    // Create admin account functionality
    const createAdminBtn = document.getElementById('createAdminBtn');
    if (createAdminBtn) {
        createAdminBtn.addEventListener('click', () => {
            const passwordRequirements = [
                { regex: /.{8,}/, text: 'At least 8 characters long' },
                { regex: /[A-Z]/, text: 'Contains uppercase letter' },
                { regex: /[a-z]/, text: 'Contains lowercase letter' },
                { regex: /[0-9]/, text: 'Contains number' },
                { regex: /[!@#$%^&*(),.?":{}|<>]/, text: 'Contains special character' }
            ];

            let passwordValid = false;

            Swal.fire({
                title: 'Create Admin Account',
                html: `
                    <input id="username" class="swal2-input" placeholder="Username">
                    <input id="email" class="swal2-input" placeholder="Email">
                    <div class="password-container">
                        <input id="password" type="password" class="swal2-input" placeholder="Password">
                        <ul id="password-requirements" style="text-align: left; margin: 10px auto; width: 80%; list-style: none; padding: 0;">
                            ${passwordRequirements.map(req => `
                                <li style="color: red; margin: 5px 0; font-size: 0.9em;">
                                    × ${req.text}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `,
                didOpen: () => {
                    const passwordInput = document.getElementById('password');
                    const requirementsList = document.getElementById('password-requirements');

                    passwordInput.addEventListener('input', (e) => {
                        const password = e.target.value;

                        // Update requirements list and check if all requirements are met
                        passwordValid = passwordRequirements.every(req => req.regex.test(password));

                        requirementsList.innerHTML = passwordRequirements
                            .map(req => {
                                const isValid = req.regex.test(password);
                                return `
                                    <li style="color: ${isValid ? '#2ecc71' : '#e74c3c'}; margin: 5px 0; font-size: 0.9em; display: flex; align-items: center;">
                                        <span style="margin-right: 5px;">${isValid ? '✓' : '×'}</span>
                                        ${req.text}
                                    </li>
                                `;
                            })
                            .join('');
                    });
                },
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Create',
                showLoaderOnConfirm: true,
                preConfirm: () => {
                    const username = document.getElementById('username').value;
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;


                    if (!username || !email || !password) {
                        Swal.showValidationMessage('Please fill in all fields');
                        return false;
                    }

                    if (!passwordValid) {
                        Swal.showValidationMessage('Password does not meet all requirements');
                        return false;
                    }

                    // Validate email format
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email)) {
                        Swal.showValidationMessage('Please enter a valid email address');
                        return false;
                    }

                    return fetch('/admin/create-admin', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            username,
                            email,
                            password
        
                        })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (!data.success) {
                                throw new Error(data.msg || 'Failed to create admin account');
                            }
                            return data;
                        })
                        .catch(error => {
                            Swal.showValidationMessage(error.message);
                            throw error;
                        });
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Success!',
                        text: 'Admin account created successfully',
                        icon: 'success',
                        willClose: () => {
                            // Reload page and show manage-admins section
                            window.location.href = '/admin/dashboard#manage-admins';
                            window.location.reload();
                        }
                    });
                }
            });
        });
    }
});

// Global delete functions
window.deleteProduct = async function(productId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/admin/delete-product/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire(
                    'Deleted!',
                    'Product has been deleted successfully.',
                    'success'
                );
                location.reload();
            } else {
                Swal.fire(
                    'Error!',
                    data.message || 'Failed to delete product',
                    'error'
                );
            }
        } catch (error) {
            Swal.fire(
                'Error!',
                'An error occurred while deleting the product',
                'error'
            );
            console.error('Error:', error);
        }
    }
};

window.deleteAdmin = async function(adminId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/admin/delete-admin/${adminId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire(
                    'Deleted!',
                    'Administrator account has been deleted.',
                    'success'
                );
                location.reload();
            } else {
                Swal.fire(
                    'Error!',
                    data.message || 'Failed to delete administrator account',
                    'error'
                );
            }
        } catch (error) {
            Swal.fire(
                'Error!',
                'An error occurred while deleting the administrator account',
                'error'
            );
            console.error('Error:', error);
        }
    }
};

function logout() {
    window.location.href = '/api/auth/logout';
}

function toggleOrderDetails(header) {
    const details = header.nextElementSibling;
    details.style.display = details.style.display === 'none' ? 'block' : 'none';
    header.querySelector('.fa-chevron-down').classList.toggle('rotated');
}

async function updateShippingStatus(orderId, status) {
    try {
        const response = await fetch(`/admin/update-order-status/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ shippingStatus: status })
        });

        const data = await response.json();

        if (data.success) {
            Swal.fire('Updated!', 'Order shipping status updated.', 'success');
            // Optional: Refresh or update UI
        } else {
            Swal.fire('Error!', data.message || 'Could not update status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        Swal.fire('Error!', 'Network error occurred', 'error');
    }
}