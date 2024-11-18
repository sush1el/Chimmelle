class CheckoutHandler {
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
    try {
      const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData'));
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
  
        await AddressHandler.loadUserAddresses();
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
  static setupEventListeners() {
    document.querySelectorAll('input[name="delivery"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.updateShippingCost();
      });
    });

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

          await Swal.fire({
            title: 'Order Placed!',
            text: 'Your order has been successfully placed.',
            icon: 'success',
            confirmButtonText: 'OK'
          });

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

// Make handlers globally available
window.LocationHandler = LocationHandler;
window.AddressHandler = AddressHandler;
window.CheckoutHandler = CheckoutHandler;