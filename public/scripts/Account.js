// State management
let editingIndex = null;

// View management functions
const views = {
    account: document.getElementById('account-view'),
    addresses: document.getElementById('addresses-view')
};

function showView(viewName) {
    Object.keys(views).forEach(key => {
        views[key].classList.add('hidden');
    });
    views[viewName].classList.remove('hidden');
}

// Navigation functions
function showAccount() {
    showView('account');
}

function showAddresses() {
    showView('addresses');
}

async function showEditAddress(index) {
    editingIndex = index;
    const address = document.querySelectorAll('.address-card')[index];
    
    // Get current values
    const fields = ['street', 'barangay', 'city', 'zipCode', 'country', 'phone'];
    const currentValues = {};
    fields.forEach(field => {
        // Use data-field attribute instead of :contains selector
        const element = address.querySelector(`p[data-field="${field}"]`);
        currentValues[field] = element ? element.textContent.split(': ')[1] || '' : '';
        console.log(`Retrieved ${field} value:`, currentValues[field]); // Debug log
    });

    const result = await Swal.fire({
        title: 'Edit Address',
        html: `
            <form id="edit-address-swal-form">
                <div class="swal2-input-group">
                    <input type="text" id="swal-street" class="swal2-input" placeholder="Street*" value="${currentValues.street}" required>
                    <input type="text" id="swal-barangay" class="swal2-input" placeholder="Barangay" value="${currentValues.barangay}">
                    <input type="text" id="swal-city" class="swal2-input" placeholder="City*" value="${currentValues.city}" required>
                    <input type="text" id="swal-zipCode" class="swal2-input" placeholder="Zip Code*" value="${currentValues.zipCode}" 
                           pattern="\\d{5}(-\\d{4})?" title="Five digit zip code, optionally followed by dash and four digits" required>
                    <input type="text" id="swal-country" class="swal2-input" placeholder="Country*" value="${currentValues.country}" required>
                    <input type="tel" id="swal-phone" class="swal2-input" placeholder="Phone" value="${currentValues.phone}">
                </div>
            </form>
        `,
        showCancelButton: true,
        confirmButtonText: 'Update',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
            const formData = {
                street: document.getElementById('swal-street').value,
                barangay: document.getElementById('swal-barangay').value,
                city: document.getElementById('swal-city').value,
                zipCode: document.getElementById('swal-zipCode').value,
                country: document.getElementById('swal-country').value,
                phone: document.getElementById('swal-phone').value
            };
            
            console.log('Edit form data before submission:', formData); // Debug log

            // Validate required fields
            const requiredFields = ['street', 'city', 'zipCode', 'country'];
            const missingFields = requiredFields.filter(field => !formData[field]);
            
            if (missingFields.length > 0) {
                console.log('Missing required fields:', missingFields); // Debug log
                Swal.showValidationMessage(`Please fill in required fields: ${missingFields.join(', ')}`);
                return false;
            }

            // Validate zip code format
            if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
                Swal.showValidationMessage('Invalid zip code format');
                return false;
            }

            return formData;
        }
    });

    if (result.isConfirmed) {
        try {
            console.log('Sending edit request with data:', result.value); // Debug log
            const response = await fetch(`/account/addresses/${editingIndex}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(result.value)
            });

            const data = await response.json();
            console.log('Edit response:', data); // Debug log
            if (data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Address updated successfully'
                });
                location.reload();
            } else {
                throw new Error(data.error || 'Failed to update address');
            }
        } catch (error) {
            console.error('Edit error:', error); // Debug log
            await Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: error.message
            });
        }
    }
}

async function showAddNewAddress() {
    const result = await Swal.fire({
        title: 'Add New Address',
        html: `
            <form id="add-address-swal-form">
                <div class="swal2-input-group">
                    <input type="text" id="swal-new-street" class="swal2-input" placeholder="Street*" required>
                    <input type="text" id="swal-new-barangay" class="swal2-input" placeholder="Barangay">
                    <input type="text" id="swal-new-city" class="swal2-input" placeholder="City*" required>
                    <input type="text" id="swal-new-zipCode" class="swal2-input" placeholder="Zip Code*" 
                           pattern="\\d{5}(-\\d{4})?" title="Five digit zip code, optionally followed by dash and four digits" required>
                    <input type="text" id="swal-new-country" class="swal2-input" placeholder="Country*" required>
                    <input type="tel" id="swal-new-phone" class="swal2-input" placeholder="Phone">
                </div>
            </form>
        `,
        showCancelButton: true,
        confirmButtonText: 'Add',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
            const formData = {
                street: document.getElementById('swal-new-street').value,
                barangay: document.getElementById('swal-new-barangay').value,
                city: document.getElementById('swal-new-city').value,
                zipCode: document.getElementById('swal-new-zipCode').value,
                country: document.getElementById('swal-new-country').value,
                phone: document.getElementById('swal-new-phone').value
            };

            console.log('Add new address form data:', formData); // Debug log

            // Validate required fields
            const requiredFields = ['street', 'city', 'zipCode', 'country'];
            const missingFields = requiredFields.filter(field => !formData[field]);
            
            if (missingFields.length > 0) {
                console.log('Missing required fields:', missingFields); // Debug log
                Swal.showValidationMessage(`Please fill in required fields: ${missingFields.join(', ')}`);
                return false;
            }

            // Validate zip code format
            if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
                Swal.showValidationMessage('Invalid zip code format');
                return false;
            }

            return formData;
        }
    });

    if (result.isConfirmed) {
        try {
            console.log('Sending add request with data:', result.value); // Debug log
            const response = await fetch('/account/addresses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(result.value)
            });

            const data = await response.json();
            console.log('Add response:', data); // Debug log
            if (data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Address added successfully'
                });
                location.reload();
            } else {
                throw new Error(data.error || 'Failed to add address');
            }
        } catch (error) {
            console.error('Add error:', error); // Debug log
            await Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: error.message
            });
        }
    }
}

async function deleteAddress(index) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/account/addresses/${index}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Your address has been deleted.'
                });
                location.reload();
            } else {
                throw new Error(data.error || 'Failed to delete address');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: error.message
            });
        }
    }
}

async function setDefaultAddress(index) {
    try {
        const response = await fetch(`/account/addresses/${index}/default`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Default address updated successfully'
            });
            location.reload();
        } else {
            throw new Error(data.error || 'Failed to set default address');
        }
    } catch (error) {
        await Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: error.message
        });
    }
}

// Export functions to window
window.showAccount = showAccount;
window.showAddresses = showAddresses;
window.showEditAddress = showEditAddress;
window.showAddNewAddress = showAddNewAddress;
window.deleteAddress = deleteAddress;
window.setDefaultAddress = setDefaultAddress;