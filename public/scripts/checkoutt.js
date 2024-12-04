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

    if (selectedDelivery.value === 'same-day') {
      shippingCost = 150;
    } else {
      shippingCost = 100;
    }

    shippingCostElement.textContent = `₱ ${shippingCost.toFixed(2)}`;
    totalElement.textContent = `₱ ${(subtotal + shippingCost).toFixed(2)}`;
  }

  static async init() {

    if (window.location.pathname === '/checkout') {
      try {
      
      const selectedDelivery = document.querySelector('input[name="delivery"]:checked');
      const deliveryMethod = selectedDelivery ? selectedDelivery.value : 'standard';

      const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData'));
      checkoutData.deliveryMethod = deliveryMethod;
      sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
        if (!checkoutData) {
          window.location.href = '/cart';
          return;
        }
          
        const checkoutTimestamp = new Date(checkoutData.timestamp);
        const currentTime = new Date();
        if (currentTime - checkoutTimestamp > 30 * 60 * 1000) {
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
    
        document.getElementById('items-count').textContent = checkoutData.summary.totalItems;
        document.getElementById('subtotal').textContent = 
          `₱ ${checkoutData.summary.subtotal.toFixed(2)}`;
        document.getElementById('total-amount').textContent = 
          `₱ ${checkoutData.summary.subtotal.toFixed(2)}`;
    
        await this.loadUserAddresses();
        this.setupEventListeners();
        this.updateShippingCost();
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
  }


  static async handlePayment() {
    try {
      const totalAmountElement = document.getElementById('total-amount');
      const totalAmount = parseFloat(totalAmountElement.textContent.replace('₱', '').trim());
      
      // Validate payment amount and checkout data
      const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData'));
      if (!checkoutData || !checkoutData.items || checkoutData.items.length === 0) {
        throw new Error('Invalid checkout data');
      }
  
      // Show loading alert
      Swal.fire({
        title: 'Processing Payment',
        text: 'Please wait while we redirect you to the payment gateway...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        }
      });
  
      const description = `Order payment for ${checkoutData.summary.totalItems} items`;
  
      // Process payment and get checkout URL
      const checkoutUrl = await PaymongoHandler.processPayment(totalAmount, description);
      
      // Close loading alert
      await Swal.close();
  
      // Redirect to PayMongo checkout page
      window.location.href = checkoutUrl;
  
    } catch (error) {
      console.error('Payment error:', error);
      await Swal.fire({
        title: 'Payment Error',
        text: 'Failed to process payment. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }

  static async handlePaymentSuccess(orderId) {
    try {
      if (!orderId) {
        throw new Error('No order ID provided');
      }
  
      const processedPayments = sessionStorage.getItem('processedPayments') ? 
        JSON.parse(sessionStorage.getItem('processedPayments')) : [];
      
      if (processedPayments.includes(orderId)) {
        await Swal.close();
        return;
      }
  
      const paymentData = JSON.parse(sessionStorage.getItem('paymentData'));
      const paymentIntentId = sessionStorage.getItem('currentSourceId');
      const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData'));
  
      if (!paymentData || !paymentIntentId || !checkoutData) {
        throw new Error('Payment data not found');
      }
  
      // Get both product IDs and their versions for purchased items
      const purchasedItems = checkoutData.items.map(item => ({
        productId: item.productId,
        version: item.version.version,
        quantity: item.quantity,
        price: item.price
      }));
  
      const response = await fetch(`/api/payment-success/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId,
          selectedAddressIndex: paymentData.selectedAddressIndex,
          gcashNumber: paymentData.gcashNumber,
          purchasedItems: purchasedItems,
          deliveryMethod: checkoutData.deliveryMethod,
          amount: checkoutData.summary.subtotal // Pass the total amount
        }),
        credentials: 'include'
      });
  
      const result = await response.json();
      if (result.success) {
        
        processedPayments.push(orderId);
        sessionStorage.setItem('processedPayments', JSON.stringify(processedPayments));
  
        await Swal.close();
  
        // Clear only checkout-related data but keep cart data
        sessionStorage.removeItem('paymentData');
        sessionStorage.removeItem('checkoutData');
        sessionStorage.removeItem('currentSourceId');
        sessionStorage.removeItem('currentOrderId');
  
        const loadingElement = document.getElementById('loading');
        const successContent = document.getElementById('success-content');
        
        if (loadingElement) loadingElement.style.display = 'none';
        if (successContent) successContent.style.display = 'block';
  
        // Removed the SweetAlert for success message
      } else {
        throw new Error('Payment confirmation failed');
      }
  
    } catch (error) {
      console.error('Payment success handling error:', error);
      
      // Existing error handling SweetAlert remains the same
      await Swal.fire({
        title: 'Error',
        text: error.message || 'Failed to complete order. Please contact support.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
  
      if (error.message === 'Payment data not found' || 
          error.message === 'Payment session expired') {
        window.location.href = '/cart';
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;
  
  if (currentPath === '/checkout') {
      CheckoutHandler.init();
  } else if (currentPath === '/payment-success') {
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('orderId');
      
      if (orderId) {
          CheckoutHandler.handlePaymentSuccess(orderId);
      } else {
          window.location.href = '/cart';
      }
  }
});

window.PaymongoHandler = PaymongoHandler;
window.CheckoutHandler = CheckoutHandler; 