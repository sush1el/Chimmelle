class CartManager {
  static async handleResponse(response, errorMessage) {
    if (response.redirected) {
      window.location.href = response.url;
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        if (errorData.redirect) {
          window.location.href = errorData.redirect;
        }
        throw new Error(errorData.message || errorMessage);
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (data.redirect) {
        window.location.href = data.redirect;
        throw new Error('Redirect required');
      }
      return data;
    }
    
    throw new Error('Invalid response format');
  }

  static async addToCart(productId) {
    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId }),
        credentials: 'include'
      });

      const result = await this.handleResponse(response, 'Failed to add item to cart');
      
      // Show success message using SweetAlert2
      await Swal.fire({
        title: 'Success!',
        text: 'Item added to cart successfully',
        icon: 'success',
        confirmButtonText: 'OK'
      });

      return result;

    } catch (error) {
      console.error('Error adding to cart:', error);
      // Show error message using SweetAlert2
      await Swal.fire({
        title: 'Error!',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
      throw error;
    }
  }

  static async getCart() {
    try {
      const response = await fetch('/api/cart', {
        credentials: 'include'
      });
      
      return await this.handleResponse(response, 'Failed to fetch cart');
    } catch (error) {
      console.error('Error getting cart:', error);
      throw error;
    }
  }

  static async updateQuantity(productId, quantity) {
    try {
      const response = await fetch('/api/cart/quantity', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId, quantity }),
        credentials: 'include'
      });

      return await this.handleResponse(response, 'Failed to update quantity');
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  }

  static async toggleSelection(productId) {
    try {
      const response = await fetch('/api/cart/toggle-selection', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId }),
        credentials: 'include'
      });

      const result = await this.handleResponse(response, 'Failed to toggle selection');
      
      // Update UI elements immediately after successful toggle
      const cartItem = document.querySelector(`.cart-item[data-product-id="${productId}"]`);
      if (cartItem) {
        const checkbox = cartItem.querySelector('.item-checkbox');
        const quantityButtons = cartItem.querySelectorAll('.quantity-btn');
        const quantityInput = cartItem.querySelector('.quantity-input');
        
        // Update disabled state based on checkbox
        const isSelected = checkbox.checked;
        quantityButtons.forEach(btn => btn.disabled = !isSelected);
        quantityInput.disabled = !isSelected;
      }

      // Update cart totals
      await this.updateCartTotals();
      
      return result;
    } catch (error) {
      console.error('Error toggling selection:', error);
      throw error;
    }
  }

  static async deleteFromCart(productId) {
    try {
      // First show confirmation dialog
      const confirmation = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      });

      // If user confirms deletion
      if (confirmation.isConfirmed) {
        const response = await fetch('/api/cart/delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ productId }),
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete item from cart');
        }

        const result = await response.json();
        
        // Show success message
        await Swal.fire({
          title: 'Deleted!',
          text: 'Item has been removed from your cart.',
          icon: 'success',
          confirmButtonText: 'OK'
        });

        await this.updateCartDisplay();
        return result;
      }
    } catch (error) {
      console.error('Error deleting from cart:', error);
      if (error.message === 'Authentication required') {
        window.location.href = '/login-page';
        return;
      }
      
      // Show error message
      await Swal.fire({
        title: 'Error!',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
      
      throw error;
    }
  }

  static async updateCartTotals() {
    try {
      const cart = await this.getCart();
      const subtotalElement = document.querySelector('.total-price');
      const itemCountElement = document.querySelector('.number-of-items');
      
      let subtotal = 0;
      const selectedItems = cart.items.filter(item => item.selected);
      const selectedItemCount = selectedItems.length;
      
      selectedItems.forEach(item => {
        subtotal += item.product.price * item.quantity;
      });
      
      if (subtotalElement) {
        subtotalElement.textContent = `Total Price: P ${subtotal.toFixed(2)}`;
      }
      if (itemCountElement) {
        itemCountElement.textContent = `Selected Products: ${selectedItemCount}`;
      }
    } catch (error) {
      console.error('Error updating cart totals:', error);
    }
  }

  static async updateCartDisplay() {
    try {
      const cart = await this.getCart();
      
      const cartItems = document.querySelector('.cart-items');
      if (!cartItems) return;
      
      cartItems.innerHTML = '';
      
      cart.items.forEach(item => {
        const product = item.product;
        
        cartItems.innerHTML += `
          <div class="cart-item" data-product-id="${product._id}">
            <input type="checkbox" class="item-checkbox" 
              ${item.selected ? 'checked' : ''}>
            <img src="${product.image}" alt="${product.name}">
            <div class="item-details">
              <h3>${product.name}</h3>
              <p>Price: P ${product.price.toFixed(2)}</p>
            </div>
            <div class="item-quantity">
              <button class="quantity-btn decrease" ${!item.selected ? 'disabled' : ''}>-</button>
              <input type="number" value="${item.quantity}" min="1" 
                class="quantity-input" ${!item.selected ? 'disabled' : ''}>
              <button class="quantity-btn increase" ${!item.selected ? 'disabled' : ''}>+</button>
            </div>
            <span class="item-total">
              P ${(product.price * item.quantity).toFixed(2)}
            </span>
            <button class="delete-btn" aria-label="Delete item">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
      });
      
      await this.updateCartTotals();
    } catch (error) {
      console.error('Error updating cart display:', error);
      if (error.message === 'Authentication required') {
        return;
      }
    }
  }
   static async proceedToCheckout() {
    try {
      // First check if user is authenticated by trying to get cart
      const cart = await this.getCart();
      if (!cart) {
        throw new Error('Unable to access cart');
      }

      const selectedItems = cart.items.filter(item => item.selected);
      
      if (selectedItems.length === 0) {
        await Swal.fire({
          title: 'No items selected',
          text: 'Please select at least one item to checkout',
          icon: 'warning',
          confirmButtonText: 'OK'
        });
        return;
      }

      // Calculate total price and items count
      const subtotal = selectedItems.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
      }, 0);

      // Store checkout data in sessionStorage
      const checkoutData = {
        items: selectedItems,
        subtotal: subtotal,
        itemCount: selectedItems.length
      };
      
      sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
      
      // Redirect to checkout page
      window.location.href = '/checkout';
    } catch (error) {
      console.error('Error proceeding to checkout:', error);
      
      if (error.message === 'Authentication required') {
        window.location.href = '/login-page';
        return;
      }
      
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to proceed to checkout',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  CartManager.updateCartDisplay().catch(error => {
    console.error('Failed to initialize cart:', error);
  });
  
  const cartItems = document.querySelector('.cart-items');
  if (cartItems) {
    // Handle quantity changes and delete button clicks
    cartItems.addEventListener('click', async (e) => {
      try {
        const cartItem = e.target.closest('.cart-item');
        if (!cartItem) return;
        
        const productId = cartItem.dataset.productId;
        
        // Handle delete button click
        if (e.target.closest('.delete-btn')) {
          await CartManager.deleteFromCart(productId);
          return;
        }
        
        // Handle quantity buttons
        if (e.target.classList.contains('quantity-btn')) {
          const quantityInput = cartItem.querySelector('.quantity-input');
          let quantity = parseInt(quantityInput.value);
          
          if (e.target.classList.contains('decrease')) {
            quantity = Math.max(1, quantity - 1);
          } else if (e.target.classList.contains('increase')) {
            quantity += 1;
          }
          
          await CartManager.updateQuantity(productId, quantity);
          await CartManager.updateCartDisplay();
        }
      } catch (error) {
        if (error.message === 'Authentication required') {
          return;
        }
        console.error('Failed to update cart:', error);
      }
    });
    
    // Handle checkbox changes
    cartItems.addEventListener('change', async (e) => {
      try {
        if (e.target.classList.contains('item-checkbox')) {
          const cartItem = e.target.closest('.cart-item');
          const productId = cartItem.dataset.productId;
          await CartManager.toggleSelection(productId);
        }
      } catch (error) {
        if (error.message === 'Authentication required') {
          return;
        }
        alert('Failed to update selection: ' + error.message);
      }
    });
  }
  const checkoutBtn = document.querySelector('.checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      CartManager.proceedToCheckout();
    });
  }
});

window.CartManager = CartManager;