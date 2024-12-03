document.addEventListener('DOMContentLoaded', function () {

    const exportOrdersBtn = document.getElementById('exportOrdersBtn');
    if (exportOrdersBtn) {
        exportOrdersBtn.addEventListener('click', exportCompletedOrders);
    }
    
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

    document.querySelectorAll('.homepage-section-toggle').forEach(button => {
        button.addEventListener('click', async (e) => {
            const productId = e.target.dataset.productId;
            const section = e.target.dataset.section;
            try {
                const response = await fetch(`/admin/update-homepage-section/${productId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ homepageSection: section })
                });
                const data = await response.json();
                if (data.success) {
                    alert('Homepage section updated!');
                }
            } catch (error) {
                console.error('Error updating section:', error);
            }
        });
    });

    // Handle initial load and hash changes
    window.addEventListener('hashchange', updateActiveSection);
    updateActiveSection();

    // Order Status Filtering
    const orderStatusButtons = document.querySelectorAll('.order-status-btn');
    const orderRows = document.querySelectorAll('.orders-table tbody tr');
    const orderDetailsModal = document.getElementById('orderDetailsModal');
    const modalClose = document.querySelector('.modal-close');

    if (orderStatusButtons && orderRows) {
        orderStatusButtons.forEach(button => {
            button.addEventListener('click', () => {
                const status = button.dataset.status;

                // Update active button
                orderStatusButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Filter orders
                orderRows.forEach(row => {
                    const rowStatus = row.dataset.status;
                    row.style.display = status === 'all' || rowStatus === status ? '' : 'none';
                });
            });
        });
    }

    // Open Order Details Modal
    function openOrderDetails(orderId) {
        const orderDetailsContent = document.getElementById(`orderDetails-${orderId}`);
        if (orderDetailsContent && orderDetailsModal) {
            orderDetailsModal.querySelector('.modal-body').innerHTML = orderDetailsContent.innerHTML;
            orderDetailsModal.style.display = 'block';
        }
    }

    // Close Order Details Modal
    function closeOrderDetailsModal() {
        if (orderDetailsModal) {
            orderDetailsModal.style.display = 'none';
        }
    }

    // Attach click events to view details buttons
    document.querySelectorAll('.order-details-btn')?.forEach(button => {
        button.addEventListener('click', () => {
            const orderId = button.dataset.orderid;
            openOrderDetails(orderId);
        });
    });

    // Close modal when clicking on close button
    if (modalClose) {
        modalClose.addEventListener('click', closeOrderDetailsModal);
    }

    // Close modal when clicking outside the modal
    window.addEventListener('click', (event) => {
        if (event.target === orderDetailsModal) {
            closeOrderDetailsModal();
        }
    });

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
                <div class="password-container" style="position: relative;">
                    <input id="password" type="password" class="swal2-input" placeholder="Password">
                    <button id="togglePassword" type="button" class="toggle-password" style="
                        position: absolute !important;
                        right: 10px !important;
                        top: 50% !important;
                        transform: translateY(-50%) !important;
                        background: none !important;
                        border: none !important;
                        cursor: pointer !important;
                        width: 24px;
                        height: 24px;
                        padding: 0;
                    ">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                </div>
                <ul id="password-requirements" style="text-align: left; margin: 10px auto; width: 80%; list-style: none; padding: 0;">
                    ${passwordRequirements.map(req => `
                        <li style="color: red; margin: 5px 0; font-size: 0.9em;">
                            × ${req.text}
                        </li>
                    `).join('')}
                </ul>
            `,
            didOpen: () => {
                const passwordInput = document.getElementById('password');
                const togglePasswordBtn = document.getElementById('togglePassword');
                const eyeIcon = togglePasswordBtn.querySelector('i');
                const requirementsList = document.getElementById('password-requirements');

                // Toggle password visibility
                togglePasswordBtn.addEventListener('click', () => {
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

                // Password requirements validation
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
                        // Show an error alert for specific server-side issues
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: data.msg || 'An error occurred',
                            confirmButtonText: 'OK'
                        });
                        return Promise.reject(new Error('Handled error'));
                    }
            
                    // Show a success alert and reload the page
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: 'Admin account created successfully!',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        // Reload the page or redirect
                        location.reload();
                    });
            
                    return data; // Return the data in case other actions are needed
                })
                .catch(error => {
                    if (error.message !== 'Handled error') {
                        Swal.showValidationMessage('Unexpected error occurred. Please try again later.');
                    }
                    return Promise.reject(error);
                });
            }
        });
    });
}
    function exportCompletedOrders() {
        Swal.fire({
            title: 'Export Completed Orders',
            text: 'Do you want to export all completed orders to an Excel file?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, export!'
        }).then((result) => {
            if (result.isConfirmed) {
                // Trigger the export by redirecting to the export endpoint
                window.location.href = '/admin/export-orders';
            }
        });
    }

     function setupTableSearchPagination(sectionId, itemsPerPage = 10) {
        const section = document.querySelector(`#${sectionId}`);
        const table = section.querySelector('table tbody');
        const searchInput = document.createElement('input');
        const paginationContainer = document.createElement('div');
        
        // Create search input
        searchInput.setAttribute('type', 'text');
        searchInput.setAttribute('placeholder', `Search ${sectionId}...`);
        searchInput.classList.add('search-input');
        section.querySelector('h2').after(searchInput);

        // Create pagination container
        paginationContainer.classList.add('pagination-container');
        table.parentElement.after(paginationContainer);

        // Get all rows except empty message row
        const allRows = Array.from(table.querySelectorAll('tr:not(.empty-message)'));
        let filteredRows = allRows;
        let currentPage = 1;

        function createPaginationControls() {
            const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
            
            paginationContainer.innerHTML = `
                <div class="pagination-info">
                    <button id="${sectionId}PrevPage" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
                    <span>Page ${currentPage} of ${totalPages}</span>
                    <button id="${sectionId}NextPage" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
                </div>
            `;

            // Add event listeners for pagination
            const prevButton = paginationContainer.querySelector(`#${sectionId}PrevPage`);
            const nextButton = paginationContainer.querySelector(`#${sectionId}NextPage`);

            prevButton?.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderTable();
                }
            });

            nextButton?.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderTable();
                }
            });
        }

        function renderTable() {
            // Clear existing rows
            table.innerHTML = '';

            // Calculate start and end indices for current page
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageRows = filteredRows.slice(startIndex, endIndex);

            // Render rows for current page
            if (pageRows.length > 0) {
                pageRows.forEach(row => table.appendChild(row));
                createPaginationControls();
            } else {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `<td colspan="${table.querySelector('tr')?.querySelectorAll('td').length || 7}" class="empty-message">No ${sectionId} found.</td>`;
                table.appendChild(emptyRow);
                paginationContainer.innerHTML = '';
            }
        }
        
        function searchTable() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            
            // Filter rows based on search term
            filteredRows = allRows.filter(row => {
                const cells = row.querySelectorAll('td');
                return Array.from(cells).some(cell => 
                    cell.textContent.toLowerCase().includes(searchTerm)
                );
            });

            // Reset to first page
            currentPage = 1;
            
            // Render filtered results
            renderTable();
        }

        // Initial render
        renderTable();

        // Add search event listener
        searchInput.addEventListener('input', searchTable);

        // If it's the orders table, handle order status filtering together with search
        if (sectionId === 'orders') {
            const orderStatusButtons = document.querySelectorAll('.order-status-btn');
            
            orderStatusButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Trigger status filter
                    const status = button.dataset.status;
                    
                    // Update active button
                    orderStatusButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    // Filter rows based on status and current search
                    const searchTerm = searchInput.value.toLowerCase().trim();
                    
                    filteredRows = allRows.filter(row => {
                        const rowStatus = row.dataset.status;
                        const matchesStatus = status === 'all' || rowStatus === status;
                        
                        // If search term exists, also check text content
                        if (searchTerm) {
                            const cellsMatch = Array.from(row.querySelectorAll('td')).some(cell => 
                                cell.textContent.toLowerCase().includes(searchTerm)
                            );
                            return matchesStatus && cellsMatch;
                        }
                        
                        return matchesStatus;
                    });

                    // Reset to first page
                    currentPage = 1;
                    
                    // Render filtered results
                    renderTable();
                });
            });
        }
    }

    // Setup search and pagination for both products and orders
    setupTableSearchPagination('products');
    setupTableSearchPagination('orders');
    setupTableSearchPagination('homepage-sections');
});


// Global delete functions
window.deleteProduct = async function(productId) {
    const result = await Swal.fire({
        title: 'Blacklist Product?',
        text: "This product will be blacklisted. Are you sure?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes'
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
                    'Product has been blacklisted successfully.',
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

window.cancelOrder = async function(orderId) {
    // First, get the current order details to check its status
    try {
        const orderDetailsElement = document.querySelector(`#orderDetails-${orderId} .order-shipping-details p:first-child`);
        
        if (!orderDetailsElement) {
            Swal.fire('Error!', 'Could not retrieve order details', 'error');
            return;
        }

        const shippingStatus = orderDetailsElement.textContent.split(': ')[1].trim();
        
        // Prevent cancellation for shipped or received orders
        if (['shipped', 'received'].includes(shippingStatus.toLowerCase())) {
            Swal.fire({
                icon: 'error',
                title: 'Cannot Cancel Order',
                text: 'This order cannot be canceled as it has already been shipped or completed.',
                confirmButtonText: 'OK'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Emergency Order Cancellation',
            text: 'This is a restricted action. Enter the emergency password to cancel the order.',
            input: 'password',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off'
            },
            showCancelButton: true,
            confirmButtonText: 'Cancel Order',
            showLoaderOnConfirm: true,
            preConfirm: async (emergencyPassword) => {
                if (!emergencyPassword) {
                    Swal.showValidationMessage('Please enter the emergency password');
                    return false;
                }

                try {
                    const response = await fetch(`/admin/cancel-order/${orderId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ emergencyPassword })
                    });

                    const data = await response.json();

                    if (!data.success) {
                        throw new Error(data.message || 'Failed to cancel order');
                    }

                    return data;
                } catch (error) {
                    Swal.showValidationMessage(error.message);
                    return false;
                }
            },
            allowOutsideClick: () => !Swal.isLoading()
        });

        if (result.value) {
            await Swal.fire(
                'Order Canceled',
                'The order has been successfully deleted.',
                'success'
            );
            location.reload();
        }
    } catch (error) {
        console.error('Error checking order status:', error);
        Swal.fire('Error!', 'Could not check order status', 'error');
    }
};

window.restoreProduct = async function(productId) {
    try {
      const response = await fetch(`/admin/restore-product/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
  
      const data = await response.json();
      if (data.success) {
        alert('Product restored successfully!');
        location.reload();
      } else {
        alert(data.message || 'Failed to restore product.');
      }
    } catch (error) {
      console.error('Error restoring product:', error);
      alert('An error occurred while restoring the product.');
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
    // Clear local storage and session storage
    localStorage.clear();
    sessionStorage.clear();

    // Make a fetch request to logout endpoint
    fetch('/api/auth/logout', {
        method: 'GET',
        credentials: 'same-origin'
    }).then(() => {
        // Redirect to login page and replace the current history entry
        window.location.replace('/login-page');
    }).catch(error => {
        console.error('Logout error:', error);
    });
}

function configureAnnouncement(productId, backgroundImage, productName, currentMessage, currentButtonText) {
    // Escape quotation marks in productName to prevent breaking the JavaScript
    const escapedProductName = productName.replace(/"/g, '&quot;');
    
    Swal.fire({
        title: 'Create Announcement',
        html: `
            <div class="announcement-config">
                <img src="${backgroundImage}" style="max-width: 200px; max-height: 200px; margin-bottom: 15px;">
                <p>Creating announcement for: <strong>${escapedProductName}</strong></p>
                <input type="text" id="announcementMessage" class="swal2-input" placeholder="Announcement Message" value="${currentMessage || ''}">
                <input type="text" id="announcementButtonText" class="swal2-input" placeholder="Button Text" value="${currentButtonText || ''}">
            </div>
        `,
        focusConfirm: false,
        preConfirm: () => {
            const message = document.getElementById('announcementMessage').value;
            const buttonText = document.getElementById('announcementButtonText').value;

            // Validate
            if (!message) {
                Swal.showValidationMessage('Please enter an announcement message');
                return false;
            }

            return {
                productId,
                message,
                buttonText
            };
        },
        showCancelButton: true,
        confirmButtonText: 'Create Announcement',
    }).then((result) => {
        if (result.isConfirmed) {
            const { productId, message, buttonText } = result.value;
            
            // AJAX call to update announcement configuration
            fetch('/admin/update-announcement', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId,
                    isEnabled: true,
                    message,
                    buttonText
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire('Created!', 'Announcement configuration added.', 'success')
                    .then(() => location.reload());
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            })
            .catch(error => {
                Swal.fire('Error', 'Failed to create announcement', 'error');
            });
        }
    });
}

function removeAnnouncement(productId) {
    Swal.fire({
        title: 'Remove Announcement',
        text: 'Are you sure you want to remove this announcement?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('/admin/remove-announcement', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire('Removed!', 'Announcement has been removed.', 'success')
                    .then(() => location.reload());
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            })
            .catch(error => {
                Swal.fire('Error', 'Failed to remove announcement', 'error');
            });
        }
    });
}

async function updateShippingStatus(orderId, status) {
    try {
        // Prevent changing status of a completed order
        const existingStatus = document.querySelector(`#orderDetails-${orderId} .order-shipping-details p:first-child`).textContent.split(': ')[1].trim();
        
        if (existingStatus === 'received') {
            Swal.fire('Error!', 'Cannot modify a completed order', 'error');
            return;
        }

        // Only allow 'preparing' or 'shipped'
        if (!['preparing', 'shipped'].includes(status)) {
            Swal.fire('Error!', 'Invalid shipping status', 'error');
            return;
        }

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
            // Reload the page to reflect the updated status
            location.reload();
        } else {
            Swal.fire('Error!', data.message || 'Could not update status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        Swal.fire('Error!', 'Network error occurred', 'error');
    }
}

async function updateHomepageSection(productId, section) {
    try {
        const response = await fetch(`/admin/update-homepage-section/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ homepageSection: section }),
        });

        const data = await response.json();
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Homepage Section Updated',
                text: `Product moved to ${section || 'None'} section`,
                confirmButtonText: 'OK'
            }).then(() => {
                // Reload the page to reflect changes
                location.reload();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: data.message || 'Failed to update homepage section',
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        console.error('Error updating homepage section:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An unexpected error occurred',
            confirmButtonText: 'OK'
        });
    }
}



