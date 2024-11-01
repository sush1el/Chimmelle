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
        // Sort addresses to put default address first
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
              <p class="recipient">${address.firstName} ${address.lastName}</p>
              <p class="address-line">${address.street}</p>
              <p class="address-line">${address.barangay}</p>
              <p class="address-line">${address.city}, ${address.zipCode}</p>
              <p class="address-line">${address.country}</p>
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

        // Add event listeners for address selection
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
    try {
      // Get current address data
      const addressElement = document.querySelectorAll('.radio-option')[index];
      const currentValues = {
        street: addressElement.querySelector('.address-line:nth-child(3)').textContent,
        barangay: addressElement.querySelector('.address-line:nth-child(4)').textContent,
        city: addressElement.querySelector('.address-line:nth-child(5)').textContent.split(',')[0].trim(),
        zipCode: addressElement.querySelector('.address-line:nth-child(5)').textContent.split(',')[1].trim(),
        country: addressElement.querySelector('.address-line:nth-child(6)').textContent,
        phone: addressElement.querySelector('.phone').textContent.replace('Phone: ', '')
      };

      const result = await Swal.fire({
        title: 'Edit Address',
        html: `
          <form id="edit-address-form">
            <div class="swal2-input-group">
              <input type="text" id="swal-street" class="swal2-input" placeholder="Street*" value="${currentValues.street}" required>
              <input type="text" id="swal-barangay" class="swal2-input" placeholder="Barangay" value="${currentValues.barangay}">
              <input type="text" id="swal-city" class="swal2-input" placeholder="City*" value="${currentValues.city}" required>
              <input type="text" id="swal-zipCode" class="swal2-input" placeholder="Zip Code*" value="${currentValues.zipCode}" 
                     pattern="\\d{5}(-\\d{4})?" title="Five digit zip code" required>
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

          // Validate required fields
          const requiredFields = ['street', 'city', 'zipCode', 'country'];
          const missingFields = requiredFields.filter(field => !formData[field]);
          
          if (missingFields.length > 0) {
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
          throw new Error(data.error || 'Failed to update address');
        }
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.message
      });
    }
  }

  static async showAddNewAddress() {
    const result = await Swal.fire({
      title: 'Add New Address',
      html: `
        <form id="add-address-form">
          <div class="swal2-input-group">
            <input type="text" id="swal-new-street" class="swal2-input" placeholder="Street*" required>
            <input type="text" id="swal-new-barangay" class="swal2-input" placeholder="Barangay">
            <input type="text" id="swal-new-city" class="swal2-input" placeholder="City*" required>
            <input type="text" id="swal-new-zipCode" class="swal2-input" placeholder="Zip Code*" 
                   pattern="\\d{5}(-\\d{4})?" title="Five digit zip code" required>
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

        // Validate required fields
        const requiredFields = ['street', 'city', 'zipCode', 'country'];
        const missingFields = requiredFields.filter(field => !formData[field]);
        
        if (missingFields.length > 0) {
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

          if (!selectedPayment) {
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
// Initialize the checkout handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  CheckoutHandler.init();
});

window.CheckoutHandler = CheckoutHandler;