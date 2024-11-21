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
            <input type="radio" name="address" value="${index}" ${address.isDefault ? 'checked' : ''}>
            <div class="address-details">
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
    try {
      const addresses = document.querySelectorAll('.radio-option');
      const addressElement = addresses[index];
      
      if (!addressElement) {
        throw new Error('Address element not found');
      }

      // Extract address data from the DOM
      const recipientName = addressElement.querySelector('.recipient')?.textContent?.trim() || '';
      const [firstName = '', lastName = ''] = recipientName.split(' ');
      
      const addressLines = addressElement.querySelectorAll('.address-line');
      const street = addressLines[0]?.textContent?.trim() || '';
      const barangayName = addressLines[1]?.textContent?.trim() || '';
      const cityLine = addressLines[2]?.textContent?.trim() || '';
      const [cityName, zipCode] = cityLine.split(',').map(s => s.trim());
      const regionLine = addressLines[3]?.textContent?.trim() || '';
      const [provinceName, regionName] = regionLine.split(',').map(s => s.trim());
      const phone = addressElement.querySelector('.phone')?.textContent?.replace('Phone:', '').trim() || '';

      const result = await Swal.fire({
        title: 'Edit Address',
        html: `
          <form id="edit-address-swal-form">
            <div class="swal2-input-group">
              <input type="text" id="swal-edit-street" class="swal2-input" 
                     placeholder="Street*" required value="${street}">
              
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
                     placeholder="Zip Code*" pattern="\\d{4}" required value="${zipCode || ''}">
                     
              <input type="tel" id="swal-edit-phone" class="swal2-input" 
                     placeholder="Phone Number*" required value="${phone}">
            </div>
          </form>
        `,
        didOpen: async () => {
          // Initialize dropdowns with current values
          const currentLocation = {
            region: { name: regionName },
            province: { name: provinceName },
            city: { name: cityName },
            barangay: { name: barangayName }
          };
          
          // First populate regions and set up listeners
          await this.populateLocationDropdowns('swal-edit', currentLocation);
          this.setupLocationDropdownListeners('swal-edit');
          
          // Set initial values for dropdowns based on current address
          const regionSelect = document.getElementById('swal-edit-region');
          const provinceSelect = document.getElementById('swal-edit-province');
          const citySelect = document.getElementById('swal-edit-city');
          const barangaySelect = document.getElementById('swal-edit-barangay');
          
          // Select the matching options
          Array.from(regionSelect.options).forEach(option => {
            const data = this.safeParseJSON(option.value);
            if (data && data.name === regionName) {
              option.selected = true;
              regionSelect.dispatchEvent(new Event('change'));
            }
          });

          // Wait for province dropdown to be populated
          setTimeout(() => {
            Array.from(provinceSelect.options).forEach(option => {
              const data = this.safeParseJSON(option.value);
              if (data && data.name === provinceName) {
                option.selected = true;
                provinceSelect.dispatchEvent(new Event('change'));
              }
            });

            // Wait for city dropdown to be populated
            setTimeout(() => {
              Array.from(citySelect.options).forEach(option => {
                const data = this.safeParseJSON(option.value);
                if (data && data.name === cityName) {
                  option.selected = true;
                  citySelect.dispatchEvent(new Event('change'));
                }
              });

              // Wait for barangay dropdown to be populated
              setTimeout(() => {
                Array.from(barangaySelect.options).forEach(option => {
                  const data = this.safeParseJSON(option.value);
                  if (data && data.name === barangayName) {
                    option.selected = true;
                  }
                });
              }, 500);
            }, 500);
          }, 500);
        },
        showCancelButton: true,
        confirmButtonText: 'Save Changes',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
          try {
            const formData = {
              street: document.getElementById('swal-edit-street').value.trim(),
              region: this.safeParseJSON(document.getElementById('swal-edit-region').value),
              province: this.safeParseJSON(document.getElementById('swal-edit-province').value),
              city: this.safeParseJSON(document.getElementById('swal-edit-city').value),
              barangay: this.safeParseJSON(document.getElementById('swal-edit-barangay').value),
              zipCode: document.getElementById('swal-edit-zipCode').value.trim(),
              phone: document.getElementById('swal-edit-phone').value.trim()
            };

            const validation = this.validateAddressData(formData);
            if (!validation.valid) {
              Swal.showValidationMessage(validation.error);
              return false;
            }

            return this.formatAddressDataForApi(formData);
          } catch (error) {
            Swal.showValidationMessage(error.message);
            return false;
          }
        }
      });

      if (result.isConfirmed && result.value) {
        const response = await fetch(`/account/addresses/${index}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(result.value)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to update address: ${response.status}`);
        }

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
      console.error('Error in showEditAddress:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Failed to update address'
      });
    }
  }
  static async showAddNewAddress() {
    try {
      const result = await Swal.fire({
        title: 'Add New Address',
        html: `
          <form id="new-address-swal-form">
            <div class="swal2-input-group">
              <input type="text" id="swal-new-street" class="swal2-input" 
                     placeholder="Street*" required>
              
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
          CheckoutHandler.populateLocationDropdowns('swal-new');
          CheckoutHandler.setupLocationDropdownListeners('swal-new');
        },
        showCancelButton: true,
        confirmButtonText: 'Add',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
          try {
            const formData = {
              street: document.getElementById('swal-new-street').value.trim(),
              region: this.safeParseJSON(document.getElementById('swal-new-region').value),
              province: this.safeParseJSON(document.getElementById('swal-new-province').value),
              city: this.safeParseJSON(document.getElementById('swal-new-city').value),
              barangay: this.safeParseJSON(document.getElementById('swal-new-barangay').value),
              zipCode: document.getElementById('swal-new-zipCode').value.trim(),
              phone: document.getElementById('swal-new-phone').value.trim()
            };

            const validation = this.validateAddressData(formData);
            if (!validation.valid) {
              Swal.showValidationMessage(validation.error);
              return false;
            }

            // Format data for API
            return this.formatAddressDataForApi(formData);
          } catch (error) {
            Swal.showValidationMessage(error.message);
            return false;
          }
        }
      });

      if (result.isConfirmed && result.value) {
        const response = await fetch('/account/addresses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(result.value)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to add address: ${response.status}`);
        }

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
      }
    } catch (error) {
      console.error('Error in showAddNewAddress:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Failed to add address'
      });
    }
  }
  static safeParseJSON(value) {
    try {
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('JSON parse error:', error);
      return null;
    }
  }

  static formatAddressDataForApi(formData) {
    const isNCR = formData.region?.code === '130000000';
    
    return {
      street: formData.street,
      region: {
        code: formData.region?.code,
        name: formData.region?.name
      },
      province: isNCR ? {
        code: "130000000",
        name: "NCR"
      } : {
        code: formData.province?.code,
        name: formData.province?.name
      },
      city: {
        code: formData.city?.code,
        name: formData.city?.name
      },
      barangay: {
        code: formData.barangay?.code,
        name: formData.barangay?.name
      },
      zipCode: formData.zipCode,
      phone: formData.phone
    };
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
      const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData'));
      if (!checkoutData) {
        window.location.href = '/cart';
        return;
      }

      // Validate checkout data timestamp (prevent stale data)
      const checkoutTimestamp = new Date(checkoutData.timestamp);
      const currentTime = new Date();
      if (currentTime - checkoutTimestamp > 30 * 60 * 1000) { // 30 minutes
        throw new Error('Checkout session expired');
      }
  
      const orderItemsContainer = document.getElementById('order-items');
      if (orderItemsContainer) {
        orderItemsContainer.innerHTML = checkoutData.items.map(item => `
          <div class="order-item" data-product-id="${item.productId}">
            <img src="${item.imageUrl || 'https://via.placeholder.com/80'}" 
                 alt="${item.name}"
                 class="order-item-image">
            <div class="item-details">
              <p class="product-name">${item.name}</p>
              <div class="order-item-meta">
                <p>Quantity: ${item.quantity}</p>
                <p>Version: ${item.version.version}</p>
                <p>Unit Price: ₱ ${item.price.toFixed(2)}</p>
              </div>
            </div>
            <span class="item-subtotal">₱ ${item.subtotal.toFixed(2)}</span>
          </div>
        `).join('');
      }
  
      // Update summary information
      document.getElementById('items-count').textContent = checkoutData.summary.totalItems;
      document.getElementById('subtotal').textContent = 
        `₱ ${checkoutData.summary.subtotal.toFixed(2)}`;
      document.getElementById('total-amount').textContent = 
        `₱ ${checkoutData.summary.subtotal.toFixed(2)}`;
  
      await this.loadUserAddresses();
      this.setupEventListeners();
      this.updateShippingCost();

      // Add data attributes for order processing
      document.querySelector('form#checkout-form')?.setAttribute(
        'data-order-summary', 
        JSON.stringify(checkoutData.summary)
      );
    } catch (error) {
      console.error('Initialization error:', error);
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to initialize checkout. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.href = '/cart';
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
  static async fetchLocations(type, parentCode = '') {
    let url = 'https://psgc.gitlab.io/api/';
    switch (type) {
      case 'regions':
        url += 'regions/';
        break;
      case 'provinces':
        // Special handling for NCR
        if (parentCode === '130000000') { // NCR region code
          return []; // NCR has no provinces
        }
        url += `regions/${parentCode}/provinces/`;
        break;
      case 'cities':
        // For NCR, fetch cities directly from region
        if (parentCode.startsWith('13')) { // NCR codes start with 13
          url += `regions/130000000/cities-municipalities/`;
        } else {
          url += `provinces/${parentCode}/cities-municipalities/`;
        }
        break;
      case 'barangays':
        url += `cities-municipalities/${parentCode}/barangays/`;
        break;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      return [];
    }
  }

  static async populateLocationDropdowns(formPrefix, selectedLocation = {}) {
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
  
    try {
      // Populate regions
      const regions = await this.fetchLocations('regions');
      dropdowns.region.innerHTML = '<option value="">Select Region</option>';
      regions.forEach(region => {
        const option = new Option(region.name, JSON.stringify({ code: region.code, name: region.name }));
        if (selectedLocation.region && selectedLocation.region.code === region.code) {
          option.selected = true;
        }
        dropdowns.region.add(option);
      });
  
      // Populate additional dropdowns if editing
      if (selectedLocation.region) {
        const isNCR = selectedLocation.region.code === '130000000';
        
        if (!isNCR) {
          const provinces = await this.fetchLocations('provinces', selectedLocation.region.code);
          provinces.forEach(province => {
            const option = new Option(province.name, JSON.stringify({ code: province.code, name: province.name }));
            if (selectedLocation.province && selectedLocation.province.code === province.code) {
              option.selected = true;
            }
            dropdowns.province.add(option);
          });
          dropdowns.province.disabled = false;
        }
  
        if (selectedLocation.province || isNCR) {
          const cities = await this.fetchLocations('cities', 
            isNCR ? selectedLocation.region.code : selectedLocation.province.code);
          cities.forEach(city => {
            const option = new Option(city.name, JSON.stringify({ code: city.code, name: city.name }));
            if (selectedLocation.city && selectedLocation.city.code === city.code) {
              option.selected = true;
            }
            dropdowns.city.add(option);
          });
          dropdowns.city.disabled = false;
        }
  
        if (selectedLocation.city) {
          const barangays = await this.fetchLocations('barangays', selectedLocation.city.code);
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
    } catch (error) {
      console.error('Error populating dropdowns:', error);
    }
  }
  static setupLocationDropdownListeners(formPrefix) {
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
        const isNCR = selectedRegion.code === '130000000';
        
        if (!isNCR) {
          const provinces = await CheckoutHandler.fetchLocations('provinces', selectedRegion.code);
          provinces.forEach(province => {
            dropdowns.province.add(new Option(province.name, JSON.stringify({ code: province.code, name: province.name })));
          });
          dropdowns.province.disabled = false;
        } else {
          // For NCR, set province value to NCR automatically
          dropdowns.province.innerHTML = `<option value='${JSON.stringify({ code: "130000000", name: "NCR" })}'>NCR</option>`;
          dropdowns.province.disabled = true;
          
          // Populate cities directly
          const cities = await CheckoutHandler.fetchLocations('cities', selectedRegion.code);
          cities.forEach(city => {
            dropdowns.city.add(new Option(city.name, JSON.stringify({ code: city.code, name: city.name })));
          });
          dropdowns.city.disabled = false;
        }
      }
    });
  
    dropdowns.province.addEventListener('change', async () => {
      const selectedProvince = JSON.parse(dropdowns.province.value || '{}');
      dropdowns.city.innerHTML = '<option value="">Select City/Municipality</option>';
      dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
      dropdowns.city.disabled = dropdowns.barangay.disabled = true;
  
      if (selectedProvince.code) {
        const cities = await CheckoutHandler.fetchLocations('cities', selectedProvince.code);
        cities.forEach(city => {
          dropdowns.city.add(new Option(city.name, JSON.stringify({ code: city.code, name: city.name })));
        });
        dropdowns.city.disabled = false;
      }
    });
  
    dropdowns.city.addEventListener('change', async () => {
      const selectedCity = JSON.parse(dropdowns.city.value || '{}');
      dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
      dropdowns.barangay.disabled = true;
  
      if (selectedCity.code) {
        const barangays = await CheckoutHandler.fetchLocations('barangays', selectedCity.code);
        barangays.forEach(barangay => {
          dropdowns.barangay.add(new Option(barangay.name, JSON.stringify({ code: barangay.code, name: barangay.name })));
        });
        dropdowns.barangay.disabled = false;
      }
    });
  }

  static validateAddressData(formData) {
    const requiredFields = ['street', 'region', 'zipCode', 'phone', 'city', 'barangay'];
    
    // Check for missing or empty required fields
    for (const field of requiredFields) {
      if (!formData[field] || 
          (typeof formData[field] === 'object' && !formData[field].code) || 
          (typeof formData[field] === 'string' && !formData[field].trim())) {
        return {
          valid: false,
          error: `Please provide a valid ${field.charAt(0).toUpperCase() + field.slice(1)}`
        };
      }
    }
  
    // Validate phone number format (must be 11 digits starting with 09)
    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      return {
        valid: false,
        error: 'Phone number must be 11 digits starting with 09'
      };
    }
  
    // Validate zip code (must be 4 digits)
    const zipCodeRegex = /^\d{4}$/;
    if (!zipCodeRegex.test(formData.zipCode)) {
      return {
        valid: false,
        error: 'Zip code must be 4 digits'
      };
    }
  
    // Validate street address (minimum length)
    if (formData.street.trim().length < 5) {
      return {
        valid: false,
        error: 'Street address must be at least 5 characters long'
      };
    }
  
    // All validations passed
    return {
      valid: true
    };
  }
}

// Initialize the checkout handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  CheckoutHandler.init();
});

window.CheckoutHandler = CheckoutHandler;