class CheckoutHandler {
  static async loadUserAddresses() {
    try {
      const response = await fetch('/api/addresses', { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch addresses');

      const data = await response.json();
      const addressContainer = document.getElementById('address-container');

      if (addressContainer && data.addresses?.length > 0) {
        const sortedAddresses = data.addresses.sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0));
        addressContainer.innerHTML = sortedAddresses.map((address, index) => `
          <label class="radio-option ${address.isDefault ? 'default-address' : ''}">
            <input type="radio" name="address" value="${index}" ${address.isDefault ? 'checked' : ''}>
            <div class="address-details">
              <p class="recipient">${address.firstName} ${address.lastName}</p>
              <p>${address.street}, ${address.city?.name}, ${address.zipCode}</p>
            </div>
          </label>
        `).join('');

        addressContainer.querySelectorAll('input[type="radio"]').forEach(radio =>
          radio.addEventListener('change', () => this.updateShippingCost())
        );
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      document.getElementById('address-container').innerHTML = `<p>Error loading addresses. Retry later.</p>`;
    }
  }

  static updateShippingCost() {
    const selectedDelivery = document.querySelector('input[name="delivery"]:checked');
    const selectedAddress = document.querySelector('input[name="address"]:checked');
    const shippingCostElement = document.getElementById('shipping-cost');
    const totalElement = document.getElementById('total-amount');
    const subtotalElement = document.getElementById('subtotal');

    if (!selectedDelivery || !selectedAddress || !shippingCostElement || !totalElement || !subtotalElement) return;

    const subtotal = parseFloat(subtotalElement.textContent.replace('₱', '').trim());
    const shippingCost = selectedDelivery.value === 'same-day' ? 150 : 100;

    shippingCostElement.textContent = `₱ ${shippingCost.toFixed(2)}`;
    totalElement.textContent = `₱ ${(subtotal + shippingCost).toFixed(2)}`;
  }

  static setupEventListeners() {
    // Handle delivery method change
    document.querySelectorAll('input[name="delivery"]').forEach(radio =>
      radio.addEventListener('change', () => this.updateShippingCost())
    );

    // Handle checkout button click
    const checkoutButton = document.getElementById('checkout-button');
    if (checkoutButton) {
      checkoutButton.addEventListener('click', async () => {
        try {
          const selectedAddress = document.querySelector('input[name="address"]:checked');
          const selectedDelivery = document.querySelector('input[name="delivery"]:checked');
          const selectedPayment = document.querySelector('input[name="payment"]:checked');

          if (!selectedAddress) throw new Error('Please select a delivery address');
          if (!selectedDelivery) throw new Error('Please select a delivery method');
          if (!selectedPayment) throw new Error('Please select a payment method');

          await Swal.fire({
            title: 'Order Placed!',
            text: 'Your order has been successfully placed.',
            icon: 'success',
            confirmButtonText: 'OK',
          });

          sessionStorage.removeItem('checkoutData');
          window.location.href = '/orders';
        } catch (error) {
          await Swal.fire({ title: 'Error!', text: error.message, icon: 'error', confirmButtonText: 'OK' });
        }
      });
    }
  }

  static async init() {
    try {
      const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData'));
      if (!checkoutData) {
        window.location.href = '/cart';
        return;
      }

      const checkoutTimestamp = new Date(checkoutData.timestamp);
      const currentTime = new Date();
      if (currentTime - checkoutTimestamp > 30 * 60 * 1000) throw new Error('Checkout session expired');

      document.getElementById('order-items').innerHTML = checkoutData.items.map(item => `
        <div class="order-item">
          <p>${item.name} - Quantity: ${item.quantity}</p>
          <p>Subtotal: ₱ ${item.subtotal.toFixed(2)}</p>
        </div>
      `).join('');

      document.getElementById('items-count').textContent = checkoutData.summary.totalItems;
      document.getElementById('subtotal').textContent = `₱ ${checkoutData.summary.subtotal.toFixed(2)}`;
      document.getElementById('total-amount').textContent = `₱ ${checkoutData.summary.subtotal.toFixed(2)}`;

      await this.loadUserAddresses();
      this.setupEventListeners();
      this.updateShippingCost();
    } catch (error) {
      console.error('Initialization error:', error);
      await Swal.fire({ title: 'Error!', text: error.message || 'Failed to initialize checkout.', icon: 'error' });
      window.location.href = '/cart';
    }
  }
}

// Initialize the checkout handler
document.addEventListener('DOMContentLoaded', () => CheckoutHandler.init());

window.CheckoutHandler = CheckoutHandler;