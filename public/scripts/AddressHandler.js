class AddressHandler {
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
              <p class="recipient">${address.firstName || ''} ${address.lastName || ''}</p>
              <p class="address-line">${address.street}</p>
              <p class="address-line">${address.barangay?.name || ''}</p>
              <p class="address-line">${address.city?.name || ''}, ${address.zipCode}</p>
              <p class="address-line">${address.province?.name || ''}, ${address.region?.name || ''}</p>
              <p class="phone">Phone: ${address.phone}</p>
              <div class="address-actions">
                <button type="button" class="edit-btn" onclick="AddressHandler.showEditAddress(${index})">
                  Edit
                </button>
                <button type="button" class="delete-btn" onclick="AddressHandler.deleteAddress(${index})">
                  Delete
                </button>
              </div>
            </div>
          </label>
        `).join('');
  
        const addressRadios = addressContainer.querySelectorAll('input[type="radio"]');
        addressRadios.forEach(radio => {
          radio.addEventListener('change', () => {
            if (typeof CheckoutHandler !== 'undefined' && CheckoutHandler.updateShippingCost) {
              CheckoutHandler.updateShippingCost();
            }
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
          const currentLocation = {
            region: { name: regionName },
            province: { name: provinceName },
            city: { name: cityName },
            barangay: { name: barangayName }
          };
          
          // First populate regions and set up listeners
          await LocationHandler.populateLocationDropdowns('swal-edit', currentLocation);
          LocationHandler.setupLocationDropdownListeners('swal-edit');
          
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
          LocationHandler.populateLocationDropdowns('swal-new');
          LocationHandler.setupLocationDropdownListeners('swal-new');
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

window.AddressHandler = AddressHandler;