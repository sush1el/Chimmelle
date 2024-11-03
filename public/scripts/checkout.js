class CheckoutHandler {
  static async loadUserAddresses() {
    try {
      const response = await fetch('/api/addresses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch addresses');
      }
  
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch addresses');
      }
  
      const addressContainer = document.getElementById('address-container');
      
      if (addressContainer && data.addresses && data.addresses.length > 0) {
        const sortedAddresses = [...data.addresses].sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return 0;
        });
  
        addressContainer.innerHTML = sortedAddresses.map((address, index) => `
          <label class="radio-option ${address.isDefault ? 'default-address' : ''}">
            <input type="radio" 
                   name="address" 
                   value="${index}" 
                   ${address.isDefault ? 'checked' : ''}>
            <div class="address-details">
              ${address.isDefault ? '<span class="default-badge">Default</span>' : ''}
              <p class="recipient">${address.firstName || ''} ${address.lastName || ''}</p>
              <p class="address-line">${address.street}</p>
              <p class="address-line">${address.barangay?.name || ''}</p>
              <p class="address-line">${address.city?.name || ''}, ${address.zipCode}</p>
              <p class="address-line">${address.province?.name || ''}, ${address.region?.name || ''}</p>
              <p class="phone">Phone: ${address.phone}</p>
              <div class="address-actions">
                <button type="button" class="edit-btn" onclick="CheckoutHandler.showEditAddress(${index})">
                  Edit
                </button>
                <button type="button" class="delete-btn" onclick="CheckoutHandler.deleteAddress(${index})">
                  Delete
                </button>
                ${!address.isDefault ? `
                  <button type="button" class="default-btn" onclick="CheckoutHandler.setDefaultAddress(${index})">
                    Set as Default
                  </button>
                ` : ''}
              </div>
            </div>
          </label>
        `).join('');
  
        const addressRadios = addressContainer.querySelectorAll('input[type="radio"]');
        addressRadios.forEach(radio => {
          radio.addEventListener('change', () => {
            this.updateShippingCost();
          });
        });
      } else if (addressContainer) {
        addressContainer.innerHTML = `
          <div class="no-address-container">
            <p class="no-address-message">No delivery addresses found.</p>
            <button class="add-address-btn" onclick="CheckoutHandler.showAddNewAddress()">
              Add New Address
            </button>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      const addressContainer = document.getElementById('address-container');
      if (addressContainer) {
        addressContainer.innerHTML = `
          <div class="error-container">
            <p class="error-message">Error loading addresses.</p>
            <button class="retry-btn" onclick="CheckoutHandler.loadUserAddresses()">
              Retry
            </button>
          </div>
        `;
      }
      
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to load delivery addresses',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }

  static async showEditAddress(index) {
    // Similar structure as showAddNewAddress with 'edit' prefixes for IDs
    const addressElement = document.querySelectorAll('.radio-option')[index];
    const currentValues = {
      street: addressElement.querySelector('.address-line:nth-child(3)').textContent,
      region: JSON.parse(addressElement.getAttribute('data-region') || '{}'),
      province: JSON.parse(addressElement.getAttribute('data-province') || '{}'),
      city: JSON.parse(addressElement.getAttribute('data-city') || '{}'),
      barangay: JSON.parse(addressElement.getAttribute('data-barangay') || '{}'),
      zipCode: addressElement.querySelector('.address-line:nth-child(5)').textContent.split(',')[1].trim(),
      phone: addressElement.querySelector('.phone').textContent.replace('Phone: ', '')
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
        await populateLocationDropdowns('swal-edit', currentValues);
        setupLocationDropdownListeners('swal-edit');
      },
      showCancelButton: true,
      confirmButtonText: 'Update',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const formData = {
          street: document.getElementById('swal-edit-street').value,
          region: JSON.parse(document.getElementById('swal-edit-region').value || '{}'),
          province: JSON.parse(document.getElementById('swal-edit-province').value || '{}'),
          city: JSON.parse(document.getElementById('swal-edit-city').value || '{}'),
          barangay: JSON.parse(document.getElementById('swal-edit-barangay').value || '{}'),
          zipCode: document.getElementById('swal-edit-zipCode').value,
          phone: document.getElementById('swal-edit-phone').value
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
      const response = await fetch(`/account/addresses/${index}`, {
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
        await this.loadUserAddresses();
        this.updateShippingCost();
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: data.error || 'Failed to update address'
        });
      }
    }
  }

  static async showAddNewAddress() {
    const result = await Swal.fire({
      title: 'Add New Address',
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
      didOpen: () => {
        populateLocationDropdowns('swal-new');
        setupLocationDropdownListeners('swal-new');
      },
      showCancelButton: true,
      confirmButtonText: 'Add',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const formData = {
          street: document.getElementById('swal-new-street').value,
          region: JSON.parse(document.getElementById('swal-new-region').value || '{}'),
          province: JSON.parse(document.getElementById('swal-new-province').value || '{}'),
          city: JSON.parse(document.getElementById('swal-new-city').value || '{}'),
          barangay: JSON.parse(document.getElementById('swal-new-barangay').value || '{}'),
          zipCode: document.getElementById('swal-new-zipCode').value,
          phone: document.getElementById('swal-new-phone').value
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
          await this.loadUserAddresses();
          this.updateShippingCost();
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

  static async deleteAddress(index) {
    const result = await Swal.fire({
      title: 'Delete Address',
      text: 'Are you sure you want to delete this address?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
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
            title: 'Success!',
            text: 'Address deleted successfully'
          });
          await this.loadUserAddresses();
          this.updateShippingCost();
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
  static async setDefaultAddress(index) {
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
        await this.loadUserAddresses();
        this.updateShippingCost();
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

  static updateShippingCost() {
    const selectedDelivery = document.querySelector('input[name="delivery"]:checked');
    const selectedAddress = document.querySelector('input[name="address"]:checked');
    const shippingCostElement = document.getElementById('shipping-cost');
    const totalElement = document.getElementById('total-amount');
    const subtotalElement = document.getElementById('subtotal');
    
    if (!selectedDelivery || !selectedAddress || !shippingCostElement || !totalElement || !subtotalElement) {
      return;
    }

    const subtotal = parseFloat(subtotalElement.textContent.replace('₱', '').trim());
    let shippingCost = 0;

    // Calculate shipping cost based on delivery method
    if (selectedDelivery.value === 'same-day') {
      shippingCost = 150;
    } else {
      shippingCost = 100;
    }

    shippingCostElement.textContent = `₱ ${shippingCost.toFixed(2)}`;
    totalElement.textContent = `₱ ${(subtotal + shippingCost).toFixed(2)}`;
  }

  static async init() {
    try {
      // Initialize checkout data from sessionStorage
      const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData'));
      if (!checkoutData) {
        window.location.href = '/cart';
        return;
      }

      // Update order items
      const orderItemsContainer = document.getElementById('order-items');
      if (orderItemsContainer) {
        orderItemsContainer.innerHTML = checkoutData.items.map(item => `
          <div class="order-item">
            <img src="${item.product.image || 'https://via.placeholder.com/80'}" 
                 alt="${item.product.name}">
            <div class="item-details">
              <p><small>${item.product.artist || 'Artist'}</small></p>
              <p>${item.product.name}</p>
              <p>Quantity: ${item.quantity}</p>
            </div>
            <span class="item-price">₱ ${(item.product.price * item.quantity).toFixed(2)}</span>
          </div>
        `).join('');
      }

      // Update totals
      document.getElementById('items-count').textContent = checkoutData.itemCount;
      document.getElementById('subtotal').textContent = `₱ ${checkoutData.subtotal.toFixed(2)}`;
      document.getElementById('total-amount').textContent = `₱ ${checkoutData.subtotal.toFixed(2)}`;

      // Load addresses
      await this.loadUserAddresses();

      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize shipping cost
      this.updateShippingCost();
    } catch (error) {
      console.error('Initialization error:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to initialize checkout. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }

  static setupEventListeners() {
    // Handle delivery method change
    document.querySelectorAll('input[name="delivery"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.updateShippingCost();
      });
    });

    // Handle checkout button
    const checkoutButton = document.getElementById('checkout-button');
    if (checkoutButton) {
      checkoutButton.addEventListener('click', async () => {
        try {
          const selectedAddress = document.querySelector('input[name="address"]:checked');
          const selectedDelivery = document.querySelector('input[name="delivery"]:checked');
          const selectedPayment = document.querySelector('input[name="payment"]:checked');

          if (!selectedAddress) {
            throw new Error('Please select a delivery address');
          }

          if (!selectedDelivery) {
            throw new Error('Please select a delivery method');
          }

          if (!selectedPayment) {``
            throw new Error('Please select a payment method');
          }

          // Here you would typically send the order to your backend
          // For now, show a success message
          await Swal.fire({
            title: 'Order Placed!',
            text: 'Your order has been successfully placed.',
            icon: 'success',
            confirmButtonText: 'OK'
          });

          // Clear checkout data and redirect to order confirmation
          sessionStorage.removeItem('checkoutData');
          window.location.href = '/orders';
        } catch (error) {
          await Swal.fire({
            title: 'Error!',
            text: error.message || 'Failed to place order',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      });
    }
  }
}

async function fetchLocations(type, parentCode = '') {
  // This function fetches location data by type (region, province, city, barangay)
  let url = 'https://psgc.gitlab.io/api/';
  switch (type) {
    case 'regions':
      url += 'regions/';
      break;
    case 'provinces':
      url += `regions/${parentCode}/provinces/`;
      break;
    case 'cities':
      url += `provinces/${parentCode}/cities-municipalities/`;
      break;
    case 'barangays':
      url += `cities-municipalities/${parentCode}/barangays/`;
      break;
  }
  const response = await fetch(url);
  return await response.json();
}

async function populateLocationDropdowns(formPrefix, selectedLocation = {}) {
  const dropdowns = {
    region: document.getElementById(`${formPrefix}-region`),
    province: document.getElementById(`${formPrefix}-province`),
    city: document.getElementById(`${formPrefix}-city`),
    barangay: document.getElementById(`${formPrefix}-barangay`)
  };

  // Reset and disable dropdowns
  dropdowns.province.innerHTML = '<option value="">Select Province</option>';
  dropdowns.city.innerHTML = '<option value="">Select City/Municipality</option>';
  dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
  dropdowns.province.disabled = true;
  dropdowns.city.disabled = true;
  dropdowns.barangay.disabled = true;

  // Populate regions
  const regions = await fetchLocations('regions');
  dropdowns.region.innerHTML = '<option value="">Select Region</option>';
  regions.forEach(region => {
    const option = new Option(region.name, JSON.stringify({ code: region.code, name: region.name }));
    if (selectedLocation.region && selectedLocation.region.code === region.code) option.selected = true;
    dropdowns.region.add(option);
  });

  // Populate additional dropdowns if editing
  if (selectedLocation.region) {
    const provinces = await fetchLocations('provinces', selectedLocation.region.code);
    provinces.forEach(province => {
      const option = new Option(province.name, JSON.stringify({ code: province.code, name: province.name }));
      if (selectedLocation.province && selectedLocation.province.code === province.code) option.selected = true;
      dropdowns.province.add(option);
    });
    dropdowns.province.disabled = false;

    if (selectedLocation.province) {
      const cities = await fetchLocations('cities', selectedLocation.province.code);
      cities.forEach(city => {
        const option = new Option(city.name, JSON.stringify({ code: city.code, name: city.name }));
        if (selectedLocation.city && selectedLocation.city.code === city.code) option.selected = true;
        dropdowns.city.add(option);
      });
      dropdowns.city.disabled = false;

      if (selectedLocation.city) {
        const barangays = await fetchLocations('barangays', selectedLocation.city.code);
        barangays.forEach(barangay => {
          const option = new Option(barangay.name, JSON.stringify({ code: barangay.code, name: barangay.name }));
          if (selectedLocation.barangay && selectedLocation.barangay.code === barangay.code) option.selected = true;
          dropdowns.barangay.add(option);
        });
        dropdowns.barangay.disabled = false;
      }
    }
  }
}

function setupLocationDropdownListeners(formPrefix) {
  const dropdowns = {
    region: document.getElementById(`${formPrefix}-region`),
    province: document.getElementById(`${formPrefix}-province`),
    city: document.getElementById(`${formPrefix}-city`),
    barangay: document.getElementById(`${formPrefix}-barangay`)
  };

  dropdowns.region.addEventListener('change', async () => {
    const selectedRegion = JSON.parse(dropdowns.region.value || '{}');
    dropdowns.province.innerHTML = '<option value="">Select Province</option>';
    dropdowns.city.innerHTML = '<option value="">Select City/Municipality</option>';
    dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
    dropdowns.province.disabled = dropdowns.city.disabled = dropdowns.barangay.disabled = true;

    if (selectedRegion.code) {
      const provinces = await fetchLocations('provinces', selectedRegion.code);
      provinces.forEach(province => dropdowns.province.add(new Option(province.name, JSON.stringify(province))));
      dropdowns.province.disabled = false;
    }
  });

  dropdowns.province.addEventListener('change', async () => {
    const selectedProvince = JSON.parse(dropdowns.province.value || '{}');
    dropdowns.city.innerHTML = '<option value="">Select City/Municipality</option>';
    dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
    dropdowns.city.disabled = dropdowns.barangay.disabled = true;

    if (selectedProvince.code) {
      const cities = await fetchLocations('cities', selectedProvince.code);
      cities.forEach(city => dropdowns.city.add(new Option(city.name, JSON.stringify(city))));
      dropdowns.city.disabled = false;
    }
  });

  dropdowns.city.addEventListener('change', async () => {
    const selectedCity = JSON.parse(dropdowns.city.value || '{}');
    dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
    dropdowns.barangay.disabled = true;

    if (selectedCity.code) {
      const barangays = await fetchLocations('barangays', selectedCity.code);
      barangays.forEach(barangay => dropdowns.barangay.add(new Option(barangay.name, JSON.stringify(barangay))));
      dropdowns.barangay.disabled = false;
    }
  });
}
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

  // Validate zip code format (Philippines has 4-digit ZIP codes)
  if (!/^\d{4}$/.test(formData.zipCode)) {
    return {
      valid: false,
      error: 'Invalid zip code format (must be 4 digits)'
    };
  }

  // Validate phone number format (Philippines format: +63 or 0 followed by 10 digits)
  if (!/^(\+63|0)[\d]{10}$/.test(formData.phone)) {
    return {
      valid: false,
      error: 'Invalid phone number format (must start with +63 or 0 followed by 10 digits)'
    };
  }

  return { valid: true };
}

// Initialize the checkout handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  CheckoutHandler.init();
});

window.CheckoutHandler = CheckoutHandler;