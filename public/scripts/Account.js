let editingIndex = null;

// View management functions
const views = {
    account: document.getElementById('account-view'),
    addresses: document.getElementById('addresses-view'),
    welcome: document.querySelector('.welcome')
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
    views.welcome.classList.remove('hidden');
}

function showAddresses() {
    showView('addresses');
    views.welcome.classList.add('hidden');
}

async function fetchLocations(type, parentCode = '') {
    try {
        let url = 'https://psgc.gitlab.io/api/';
        switch (type) {
            case 'regions':
                url += 'regions/';
                break;
            case 'provinces':
                url += `regions/${parentCode}/provinces/`;
                break;
            case 'cities':
                // Handle both province and region parent codes
                if (parentCode.startsWith('13')) { // NCR
                    url += `regions/${parentCode}/cities-municipalities/`;
                } else {
                    url += `provinces/${parentCode}/cities-municipalities/`;
                }
                break;
            case 'barangays':
                url += `cities-municipalities/${parentCode}/barangays/`;
                break;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        // If provinces endpoint fails, return empty array to allow flow to continue
        return [];
    }
}

async function populateLocationDropdowns(formPrefix, selectedLocation = {}) {
    try {
        // Initialize all dropdowns
        const dropdowns = {
            region: document.getElementById(`${formPrefix}-region`),
            province: document.getElementById(`${formPrefix}-province`),
            city: document.getElementById(`${formPrefix}-city`),
            barangay: document.getElementById(`${formPrefix}-barangay`)
        };

        // Validate that all dropdowns exist
        Object.entries(dropdowns).forEach(([key, element]) => {
            if (!element) {
                throw new Error(`Dropdown ${formPrefix}-${key} not found`);
            }
        });

        // Reset and disable dependent dropdowns initially
        dropdowns.province.innerHTML = '<option value="">Select Province</option>';
        dropdowns.city.innerHTML = '<option value="">Select City/Municipality</option>';
        dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
        
        dropdowns.province.disabled = true;
        dropdowns.city.disabled = true;
        dropdowns.barangay.disabled = true;

        // Fetch and populate regions
        const regions = await fetchLocations('regions');
        dropdowns.region.innerHTML = '<option value="">Select Region</option>';
        regions.forEach(region => {
            const option = new Option(region.name, JSON.stringify({ code: region.code, name: region.name }));
            if (selectedLocation.region && selectedLocation.region.code === region.code) {
                option.selected = true;
            }
            dropdowns.region.add(option);
        });

        // If editing, populate dependent dropdowns
        if (selectedLocation.region) {
            // Fetch and populate provinces
            const provinces = await fetchLocations('provinces', selectedLocation.region.code);
            provinces.forEach(province => {
                const option = new Option(province.name, JSON.stringify({ code: province.code, name: province.name }));
                if (selectedLocation.province && selectedLocation.province.code === province.code) {
                    option.selected = true;
                }
                dropdowns.province.add(option);
            });
            dropdowns.province.disabled = false;

            if (selectedLocation.province) {
                // Fetch and populate cities
                const cities = await fetchLocations('cities', selectedLocation.province.code);
                cities.forEach(city => {
                    const option = new Option(city.name, JSON.stringify({ code: city.code, name: city.name }));
                    if (selectedLocation.city && selectedLocation.city.code === city.code) {
                        option.selected = true;
                    }
                    dropdowns.city.add(option);
                });
                dropdowns.city.disabled = false;

                if (selectedLocation.city) {
                    // Fetch and populate barangays
                    const barangays = await fetchLocations('barangays', selectedLocation.city.code);
                    barangays.forEach(barangay => {
                        const option = new Option(barangay.name, JSON.stringify({ code: barangay.code, name: barangay.name }));
                        if (selectedLocation.barangay && selectedLocation.barangay.code === barangay.code) {
                            option.selected = true;
                        }
                        dropdowns.barangay.add(option);
                    });
                    dropdowns.barangay.disabled = false;
                }
            }
        }
    } catch (error) {
        console.error('Error in populateLocationDropdowns:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load location data. Please try again.'
        });
    }
}

// Modified region change handler in setupLocationDropdownListeners
function setupLocationDropdownListeners(formPrefix) {
    const dropdowns = {
        region: document.getElementById(`${formPrefix}-region`),
        province: document.getElementById(`${formPrefix}-province`),
        city: document.getElementById(`${formPrefix}-city`),
        barangay: document.getElementById(`${formPrefix}-barangay`)
    };

    // Region change handler
    dropdowns.region.addEventListener('change', async () => {
        try {
            // Reset and disable dependent dropdowns
            dropdowns.province.innerHTML = '<option value="">Select Province</option>';
            dropdowns.city.innerHTML = '<option value="">Select City/Municipality</option>';
            dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
            
            dropdowns.province.disabled = true;
            dropdowns.city.disabled = true;
            dropdowns.barangay.disabled = true;

            if (dropdowns.region.value) {
                const selectedRegion = JSON.parse(dropdowns.region.value);
                
                // Check if it's a region without provinces (like NCR)
                const provinces = await fetchLocations('provinces', selectedRegion.code);
                
                if (provinces.length === 0) {
                    // If no provinces, set province value same as region
                    dropdowns.province.innerHTML = '<option value="">Select Province</option>';
                    const regionAsProvince = new Option(
                        selectedRegion.name, 
                        JSON.stringify({ code: selectedRegion.code, name: selectedRegion.name })
                    );
                    dropdowns.province.add(regionAsProvince);
                    regionAsProvince.selected = true;
                    
                    // Fetch cities directly using region code
                    const cities = await fetchLocations('cities', selectedRegion.code);
                    dropdowns.city.innerHTML = '<option value="">Select City</option>';
                    cities.forEach(city => {
                        const option = new Option(
                            city.name, 
                            JSON.stringify({ code: city.code, name: city.name })
                        );
                        dropdowns.city.add(option);
                    });
                    
                    // Enable city dropdown but keep province disabled
                    dropdowns.province.disabled = true;
                    dropdowns.city.disabled = false;
                } else {
                    // Normal flow for regions with provinces
                    dropdowns.province.innerHTML = '<option value="">Select Province</option>';
                    provinces.forEach(province => {
                        const option = new Option(
                            province.name, 
                            JSON.stringify({ code: province.code, name: province.name })
                        );
                        dropdowns.province.add(option);
                    });
                    dropdowns.province.disabled = false;
                }
            }
        } catch (error) {
            console.error('Error in region change handler:', error);
        }
    });

    // Province change handler
    dropdowns.province.addEventListener('change', async () => {
        try {
            // Reset and disable dependent dropdowns
            dropdowns.city.innerHTML = '<option value="">Select City/Municipality</option>';
            dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
            
            dropdowns.city.disabled = true;
            dropdowns.barangay.disabled = true;

            if (dropdowns.province.value) {
                const selectedProvince = JSON.parse(dropdowns.province.value);
                const cities = await fetchLocations('cities', selectedProvince.code);
                
                cities.forEach(city => {
                    const option = new Option(
                        city.name, 
                        JSON.stringify({ code: city.code, name: city.name })
                    );
                    dropdowns.city.add(option);
                });
                dropdowns.city.disabled = false;
            }
        } catch (error) {
            console.error('Error in province change handler:', error);
        }
    });

    // City change handler remains the same
    dropdowns.city.addEventListener('change', async () => {
        try {
            dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
            dropdowns.barangay.disabled = true;

            if (dropdowns.city.value) {
                const selectedCity = JSON.parse(dropdowns.city.value);
                const barangays = await fetchLocations('barangays', selectedCity.code);
                
                barangays.forEach(barangay => {
                    const option = new Option(
                        barangay.name, 
                        JSON.stringify({ code: barangay.code, name: barangay.name })
                    );
                    dropdowns.barangay.add(option);
                });
                dropdowns.barangay.disabled = false;
            }
        } catch (error) {
            console.error('Error in city change handler:', error);
        }
    });
}

// Update validateAddressData to handle this case
function validateAddressData(formData) {
    const requiredFields = ['street', 'region', 'province', 'city', 'barangay', 'zipCode', 'phone'];
    
    const missingFields = requiredFields.filter(field => {
        if (!formData[field]) return true;
        if (typeof formData[field] === 'object') {
            // For location fields, check if either code or name is missing
            return !formData[field].code || !formData[field].name;
        }
        return false;
    });
    
    if (missingFields.length > 0) {
        return {
            valid: false,
            error: `Missing required fields: ${missingFields.join(', ')}`
        };
    }

    // Validate zip code format
    if (!/^\d{4}$/.test(formData.zipCode)) {
        return {
            valid: false,
            error: 'Invalid zip code format (must be 4 digits)'
        };
    }

    // Validate phone number format
    if (!/^(\+63|0)[\d]{10}$/.test(formData.phone)) {
        return {
            valid: false,
            error: 'Invalid phone number format (must start with +63 or 0 followed by 10 digits)'
        };
    }

    return { valid: true };
}

async function safeFetchLocations(type, parentCode = '') {
    try {
        const locations = await fetchLocations(type, parentCode);
        return locations;
    } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        await Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: `Failed to load ${type}. Please try again.`
        });
        return [];
    }
}

async function showEditAddress(index) {
    editingIndex = index;
    const address = document.querySelectorAll('.address-card')[index];
    
    // Get current values from the address card
    const currentValues = {
        street: address.querySelector('p[data-field="street"]').textContent.split(': ')[1] || '',
        region: JSON.parse(address.getAttribute('data-region') || '{}'),
        province: JSON.parse(address.getAttribute('data-province') || '{}'),
        city: JSON.parse(address.getAttribute('data-city') || '{}'),
        barangay: JSON.parse(address.getAttribute('data-barangay') || '{}'),
        zipCode: address.querySelector('p[data-field="zipCode"]').textContent.split(': ')[1] || '',
        phone: address.querySelector('p[data-field="phone"]').textContent.split(': ')[1] || ''
    };

    const result = await Swal.fire({
        title: 'Edit Address',
        html: `
            <form id="edit-address-swal-form">
                <div class="swal2-input-group">
                    <input type="text" id="swal-edit-street" class="swal2-input" 
                           placeholder="Street*" value="${currentValues.street}" required>
                    
                    <select id="swal-edit-region" class="swal2-input" required>
                        <option value="">Select Region</option>
                    </select>
                    
                    <select id="swal-edit-province" class="swal2-input" required disabled>
                        <option value="">Select Province</option>
                    </select>
                    
                    <select id="swal-edit-city" class="swal2-input" required disabled>
                        <option value="">Select City/Municipality</option>
                    </select>
                    
                    <select id="swal-edit-barangay" class="swal2-input" required disabled>
                        <option value="">Select Barangay</option>
                    </select>
                    
                    <input type="text" id="swal-edit-zipCode" class="swal2-input" 
                           placeholder="Zip Code*" pattern="\\d{4}" 
                           value="${currentValues.zipCode}" required>
                           
                    <input type="tel" id="swal-edit-phone" class="swal2-input" 
                           placeholder="Phone Number*" value="${currentValues.phone}" required>
                </div>
            </form>
        `,
        didOpen: async () => {
            // Initialize location dropdowns with current values
            await populateLocationDropdowns('swal-edit', {
                region: currentValues.region,
                province: currentValues.province,
                city: currentValues.city,
                barangay: currentValues.barangay
            });
            
            // Setup cascade listeners
            setupLocationDropdownListeners('swal-edit');
        },
        showCancelButton: true,
        confirmButtonText: 'Update',
        cancelButtonText: 'Cancel',
        // In your showAddNewAddress and showEditAddress functions
        preConfirm: () => {
            const prefix = 'edit'; // Add this line to define prefix
            const formData = {
                street: document.getElementById(`swal-${prefix}-street`).value,
                region: JSON.parse(document.getElementById(`swal-${prefix}-region`).value || '{}'),
                province: JSON.parse(document.getElementById(`swal-${prefix}-province`).value || '{}'),
                city: JSON.parse(document.getElementById(`swal-${prefix}-city`).value || '{}'),
                barangay: JSON.parse(document.getElementById(`swal-${prefix}-barangay`).value || '{}'),
                zipCode: document.getElementById(`swal-${prefix}-zipCode`).value,
                phone: document.getElementById(`swal-${prefix}-phone`).value
            };
        
            const validation = validateAddressData(formData);
            if (!validation.valid) {
                Swal.showValidationMessage(validation.error);
                return false;
            }
        
            return formData;
        }
    });

    if (result.isConfirmed) {
        try {
            console.log('Sending edit request with data:', result.value);
            const response = await fetch(`/account/addresses/${editingIndex}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(result.value)
            });

            const data = await response.json();
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
            console.error('Edit error:', error);
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
                    
                    <select id="swal-new-region" class="swal2-input" required>
                        <option value="">Select Region</option>
                    </select>
                    
                    <select id="swal-new-province" class="swal2-input" required disabled>
                        <option value="">Select Province</option>
                    </select>
                    
                    <select id="swal-new-city" class="swal2-input" required disabled>
                        <option value="">Select City/Municipality</option>
                    </select>
                    
                    <select id="swal-new-barangay" class="swal2-input" required disabled>
                        <option value="">Select Barangay</option>
                    </select>
                    
                    <input type="text" id="swal-new-zipCode" class="swal2-input" 
                           placeholder="Zip Code*" pattern="\\d{4}" required>
                    <input type="tel" id="swal-new-phone" class="swal2-input" 
                           placeholder="Phone Number*" required>
                </div>
            </form>
        `,
        didOpen: () => {
            populateLocationDropdowns('swal-new');
            // Add change event listeners for cascading dropdowns
            setupLocationDropdownListeners('swal-new');
        },
        showCancelButton: true,
        confirmButtonText: 'Add',
        cancelButtonText: 'Cancel',
        // In your showAddNewAddress and showEditAddress functions
        // In showAddNewAddress function, update the preConfirm section:
        preConfirm: () => {
            const prefix = 'new'; // Add this line to define prefix
            const formData = {
                street: document.getElementById(`swal-${prefix}-street`).value,
                region: JSON.parse(document.getElementById(`swal-${prefix}-region`).value || '{}'),
                province: JSON.parse(document.getElementById(`swal-${prefix}-province`).value || '{}'),
                city: JSON.parse(document.getElementById(`swal-${prefix}-city`).value || '{}'),
                barangay: JSON.parse(document.getElementById(`swal-${prefix}-barangay`).value || '{}'),
                zipCode: document.getElementById(`swal-${prefix}-zipCode`).value,
                phone: document.getElementById(`swal-${prefix}-phone`).value
            };

            const validation = validateAddressData(formData);
            if (!validation.valid) {
                Swal.showValidationMessage(validation.error);
                return false;
            }

            return formData;
        }
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch('/account/addresses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(result.value)
            });

            const data = await response.json();
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
window.setupLocationDropdowns = setupLocationDropdownListeners;