// State management
let editingIndex = null;

// View management functions
const views = {
    account: document.getElementById('account-view'),
    addresses: document.getElementById('addresses-view'),
    editAddress: document.getElementById('edit-address-view'),
    addAddress: document.getElementById('add-address-view')
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

function showEditAddress(index) {
    editingIndex = index;
    const address = document.querySelectorAll('.address-card')[index];
    
    // Populate form fields
    const fields = ['street', 'barangay', 'city', 'state', 'zipCode', 'country', 'phone'];
    fields.forEach(field => {
        const element = document.querySelector(`#${field}`);
        if (element) {
            const value = address.querySelector(`[data-field="${field}"]`)?.textContent.split(': ')[1] || '';
            element.value = value;
        }
    });
    
    showView('editAddress');
}

function showAddNewAddress() {
    document.getElementById('add-address-form').reset();
    showView('addAddress');
}

// API interaction functions
async function deleteAddress(index) {
    if (!confirm('Are you sure you want to delete this address?')) {
        return;
    }

    try {
        const response = await fetch(`/account/addresses/${index}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        if (data.success) {
            location.reload();
        } else {
            alert(data.error || 'Failed to delete address');
        }
    } catch (error) {
        console.error('Error deleting address:', error);
        alert('Failed to delete address');
    }
}

async function saveAddress(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`/account/addresses/${editingIndex}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            location.reload();
        } else {
            alert(result.error || 'Failed to update address');
        }
    } catch (error) {
        console.error('Error updating address:', error);
        alert('Failed to update address');
    }
    return false;
}

async function saveNewAddress(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/account/addresses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            location.reload();
        } else {
            alert(result.error || 'Failed to add address');
        }
    } catch (error) {
        console.error('Error adding address:', error);
        alert('Failed to add address');
    }
    return false;
}

async function setDefaultAddress(index) {
    try {
        const response = await fetch(`/account/addresses/${index}/default`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        if (result.success) {
            // Reload the page to show the updated default address
            location.reload();
        } else {
            alert(result.error || 'Failed to set default address');
        }
    } catch (error) {
        console.error('Error setting default address:', error);
        alert('Failed to set default address');
    }
}

window.showAccount = showAccount;
window.showAddresses = showAddresses;
window.showEditAddress = showEditAddress;
window.showAddNewAddress = showAddNewAddress;
window.deleteAddress = deleteAddress;
window.saveAddress = saveAddress;
window.saveNewAddress = saveNewAddress;
window.setDefaultAddress = setDefaultAddress;