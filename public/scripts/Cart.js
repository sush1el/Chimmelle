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


static async updateCartButtonCount() {
  try {
    const cart = await this.getCart();
    const cartButton = document.querySelector('.cart-button');
    
    if (!cartButton) return;

    // Calculate total number of items in the cart
    const totalItems = cart && cart.items 
      ? cart.items.reduce((total, item) => total + item.quantity, 0)
      : 0;

    // Create or update cart item count badge
    let badge = cartButton.querySelector('.cart-item-count');
    
    if (totalItems > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.classList.add('cart-item-count');
        cartButton.appendChild(badge);
      }
      badge.textContent = totalItems > 99 ? '99+' : totalItems.toString();
    } else if (badge) {
      // Remove badge if no items
      badge.remove();
    }
  } catch (error) {
    console.error('Error updating cart button count:', error);
  }
}

static async addToCart(productId, quantityOrOptions) {
  try {
    let quantity = 1;
    let version = null;

    // Handle different parameter formats
    if (typeof quantityOrOptions === 'number') {
      quantity = quantityOrOptions;
    } else if (typeof quantityOrOptions === 'object') {
      quantity = quantityOrOptions.quantity || 1;
      version = quantityOrOptions.version;
    }

    const initialPayload = {
      productId,
      quantity: parseInt(quantity)
    };

    if (version) {
      initialPayload.version = version;
    }

    console.log('Initial Payload:', initialPayload);

    const cartResponse = await fetch('/api/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(initialPayload),
      credentials: 'include'
    });

    // Handle 400 error for version selection
    if (cartResponse.status === 400) {
      const errorData = await cartResponse.json();
      if (errorData.message.includes('Version selection is required')) {
        const versions = errorData.versions || [];
        const hasAvailableVersions = versions.some(v => v.quantity >= quantity);

        if (!hasAvailableVersions) {
          await Swal.fire({
            title: 'Out of Stock',
            text: 'Sorry, all versions of this product are currently out of stock',
            icon: 'info',
            confirmButtonText: 'OK'
          });
          return;
        }

        const selectHTML = `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <img id="selected-version-image" 
                 src="${versions[0]?.image || ''}" 
                 alt="Selected Version Image" 
                 style="width: 200px; height: 200px; margin-bottom: 10px; object-fit: cover; border: 1px solid #ccc; border-radius: 5px;">
            <select id="version-select" class="swal2-select">
              ${versions.map(v => `
                <option value="${v.version}" 
                        data-image="${v.image}" 
                        ${v.quantity < quantity ? 'disabled' : ''}>
                  ${v.version}${v.quantity < quantity ? ' (Out of Stock)' : ''}
                </option>
              `).join('')}
            </select>
          </div>
        `;

        const result = await Swal.fire({
          title: 'Select Version',
          html: selectHTML,
          showCancelButton: true,
          confirmButtonText: 'Add to Cart',
          didOpen: () => {
            const versionSelect = document.getElementById('version-select');
            const versionImage = document.getElementById('selected-version-image');

            // Update image on dropdown change
            versionSelect.addEventListener('change', () => {
              const selectedOption = versionSelect.options[versionSelect.selectedIndex];
              const imageUrl = selectedOption.getAttribute('data-image');
              if (imageUrl) {
                versionImage.src = imageUrl;
              } else {
                versionImage.src = ''; // Clear image if no version selected
              }
            });
          },
          preConfirm: () => {
            const select = document.getElementById('version-select');
            const selectedVersion = select.value;
            if (!selectedVersion) {
              Swal.showValidationMessage('Please select a version');
              return false;
            }
            return selectedVersion;
          }
        });

        if (!result.value) {
          // User cancelled
          return;
        }

        version = result.value;

        // Send the updated payload with the selected version
        const versionPayload = {
          productId,
          version,
          quantity: parseInt(quantity)
        };

        console.log('Version Payload:', versionPayload);

        const versionResponse = await fetch('/api/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(versionPayload),
          credentials: 'include'
        });

        const resultData = await this.handleResponse(versionResponse, 'Failed to add item to cart');
        await this.updateCartDisplay();
        await this.updateCartButtonCount(); // Added this line

        await Swal.fire({
          title: 'Success!',
          text: `${quantity} item${quantity > 1 ? 's' : ''} added to cart successfully`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });

        return resultData;
      }
    }

    // Handle success for cases without version selection
    const result = await this.handleResponse(cartResponse, 'Failed to add item to cart');
    await this.updateCartDisplay();
    await this.updateCartButtonCount(); // Added this line

    await Swal.fire({
      title: 'Success!',
      text: `${quantity} item${quantity > 1 ? 's' : ''} added to cart successfully`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });

    return result;

  } catch (error) {
    console.error('Error adding to cart:', error);
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

  static async updateQuantity(cartItemId, quantity) {
    try {
      if (quantity < 1) {
        throw new Error('Quantity cannot be less than 1');
      }

      const response = await fetch('/api/cart/quantity', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cartItemId, quantity }),
        credentials: 'include'
      });
  
      const result = await this.handleResponse(response, 'Error updating quantity');
      await this.updateCartDisplay();
      await this.updateCartButtonCount(); // Added this line
      return result;
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  }

  static async toggleSelection(cartItemId) {
    try {
      const response = await fetch('/api/cart/toggle-selection', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cartItemId }),
        credentials: 'include'
      });
  
      const result = await this.handleResponse(response, 'Failed to toggle selection');
      await this.updateCartDisplay();
      return result;
    } catch (error) {
      console.error('Error toggling selection:', error);
      throw error;
    }
  }

  static async deleteFromCart(cartItemId) {
    try {
      const response = await fetch(`/api/cart/items/${cartItemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      await this.handleResponse(response, 'Failed to delete item from cart');
      await this.updateCartDisplay();
      await this.updateCartButtonCount(); // Added this line
      
      await Swal.fire({
        title: 'Success',
        text: 'Item removed from cart',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error deleting from cart:', error);
      await Swal.fire({
        title: 'Error',
        text: 'Failed to remove item from cart. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
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
        subtotalElement.textContent = `₱ ${subtotal.toFixed(2)}`;
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
      const cartPage = document.querySelector('.cart-page');
      
      if (!cartItems || !cartPage) return;
  
      if (!cart || !cart.items || cart.items.length === 0) {
        this.displayEmptyCartMessage();
        return;
      }
  
      cartItems.innerHTML = '';
      cart.items.forEach(item => {
        const product = item.product;
        const isSelected = item.selected;
        
        // Find the current version details
        const currentVersion = product.versions.find(v => v.version === item.version);
        const currentStock = currentVersion ? currentVersion.quantity : 0;
        
        cartItems.innerHTML += `
          <div class="cart-item ${isSelected ? '' : 'disabled'}" 
            data-cart-item-id="${item.cartItemId}"
            data-product-id="${product._id}">
          <label class="custom-checkbox">
            <input type="checkbox" 
                class="item-checkbox" 
                ${isSelected ? 'checked' : ''} 
                data-cart-item-id="${item.cartItemId}">
                <span class="checkmark"></span>
          </label>
          <div class="product-image-container">
            <img src="${product.imageH}" alt="${product.name}" class="product-image">
          </div>
            
            <div class="item-details">
              <h3>${product.name}</h3>
              <p> <span>Price: ₱ ${product.price.toFixed(2)}</span></p>
              
              <div class="version-container">
                <select class="version-select" 
                        data-cart-item-id="${item.cartItemId}"
                        data-current-version="${item.version}"
                        ${!isSelected ? 'disabled' : ''}>
                  ${product.versions.map(v => `
                    <option value="${v.version}" 
                            data-stock="${v.quantity}"
                            ${v.quantity === 0 && v.version !== item.version ? 'disabled' : ''}
                            ${item.version === v.version ? 'selected' : ''}>
                      ${v.version}${v.quantity === 0 ? ' (Out of stock)' : ''}
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>
  
            <div class="quantity-control">
              <button class="quantity-btn decrease" 
                      data-cart-item-id="${item.cartItemId}" 
                      ${!isSelected || item.quantity <= 1 ? 'disabled' : ''}>-</button>
              <input type="number" 
                     value="${item.quantity}" 
                     min="1" 
                     max="${currentStock}"
                     class="quantity-input" 
                     data-cart-item-id="${item.cartItemId}" 
                     ${!isSelected || currentStock === 0 ? 'disabled' : ''}>
              <button class="quantity-btn increase" 
                      data-cart-item-id="${item.cartItemId}" 
                      ${!isSelected || item.quantity >= currentStock ? 'disabled' : ''}>+</button>
            </div>
                    
            <span class="item-total">
              ₱ ${(product.price * item.quantity).toFixed(2)}
            </span>
  
            <button class="delete-btn" data-cart-item-id="${item.cartItemId}">
              <i class="fa-solid fa-trash-can"> </i>
            </button>
          </div>
        `;
      });

      // Add version change event listener
      const versionSelects = document.querySelectorAll('.version-select');
      versionSelects.forEach(select => {
        select.addEventListener('change', async function() {
          const cartItemId = this.dataset.cartItemId;
          const newVersion = this.value;
          await CartManager.changeVersion(cartItemId, newVersion);
        });
      });

      this.setupDeleteButtons();
      await this.updateCartTotals();
      await this.updateCartButtonCount();
    } catch (error) {
      console.error('Error updating cart display:', error);
    }
  }

  static setupDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        const newButton = button.cloneNode(true); // Clone to remove previous listeners
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const cartItemId = newButton.getAttribute('data-cart-item-id');
            if (!cartItemId) {
                console.error('No cart item ID found');
                return;
            }

            const result = await Swal.fire({
                title: 'Remove Item',
                text: 'Are you sure you want to remove this item from your cart?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, remove it',
                cancelButtonText: 'No, keep it',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6'
            });

            if (result.isConfirmed) {
                newButton.disabled = true;
                newButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                try {
                    await this.deleteFromCart(cartItemId);
                } catch (error) {
                    console.error('Error handling click event:', error);
                } finally {
                    newButton.disabled = false;
                    newButton.innerHTML = '<i class="fas fa-trash"></i>';
                }
            }
        });
    });
}

static async proceedToCheckout() {
  try {
    // 1. Get latest cart data
    const cart = await this.getCart();
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Your cart is empty');
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

    // 2. Validate stock availability and versions
    const stockValidationErrors = [];
    for (const item of selectedItems) {
      // Get the current version from the DOM to ensure we're using the latest
      const cartItem = document.querySelector(`[data-cart-item-id="${item.cartItemId}"]`);
      const versionSelect = cartItem?.querySelector('.version-select');
      const currentVersion = versionSelect?.value || item.version;

      const version = item.product.versions.find(v => v.version === currentVersion);
      if (!version) {
        stockValidationErrors.push(`Invalid version selected for ${item.product.name}`);
        continue;
      }
      if (version.quantity < item.quantity) {
        stockValidationErrors.push(
          `Only ${version.quantity} units available for ${item.product.name} (${currentVersion}). You requested ${item.quantity}.`
        );
      }
      // Update the item's version to match the current selection
      item.version = currentVersion;
    }

    if (stockValidationErrors.length > 0) {
      throw new Error('Stock availability issues:\n' + stockValidationErrors.join('\n'));
    }

    // 3. Prepare checkout data with updated versions
    const checkoutData = {
      items: selectedItems.map(item => ({
        cartItemId: item.cartItemId,
        productId: item.product._id,
        name: item.product.name,
        artist: item.product.artist || 'Artist',
        price: item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.imageH || 'https://via.placeholder.com/80',
        version: {
          version: item.version, // Using the updated version
          quantity: item.product.versions.find(v => v.version === item.version).quantity,
          sku: item.product.versions.find(v => v.version === item.version).sku || null
        },
        subtotal: item.product.price * item.quantity
      })),
      summary: {
        subtotal: selectedItems.reduce((total, item) => 
          total + (item.product.price * item.quantity), 0),
        itemCount: selectedItems.length,
        totalItems: selectedItems.reduce((total, item) => 
          total + item.quantity, 0)
      },
      timestamp: new Date().toISOString()
    };

    // 4. Store checkout data and redirect
    try {
      sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
      window.location.href = '/checkout';
    } catch (storageError) {
      console.error('Storage error:', storageError);
      throw new Error('Unable to initialize checkout session. Please try again.');
    }

  } catch (error) {
    console.error('Checkout error:', error);
    
    // Clean up any partial checkout data
    sessionStorage.removeItem('checkoutData');
    
    await Swal.fire({
      title: 'Error!',
      text: error.message || 'Failed to proceed to checkout',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
}

static async changeVersion(cartItemId, newVersion) {
  try {
    console.log('Starting version change...', { cartItemId, newVersion });
    
    const cartItem = document.querySelector(`[data-cart-item-id="${cartItemId}"]`);
    if (!cartItem) throw new Error('Cart item not found');

    const productId = cartItem.dataset.productId;
    const versionSelect = cartItem.querySelector('.version-select');
    const currentVersion = versionSelect.dataset.currentVersion;

    const response = await fetch('/api/cart/change-version', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        productId,
        cartItemId,
        currentVersion,
        newVersion
      }),
      credentials: 'include'
    });

    const result = await this.handleResponse(response, 'Failed to change version');
    
    // Instead of manually updating DOM elements, refresh the entire cart display
    await this.updateCartDisplay();
    
    // Clear any existing checkout data
    sessionStorage.removeItem('checkoutData');
    
    return result;
  } catch (error) {
    console.error('Error changing version:', error);
    throw error;
  }
}

static displayEmptyCartMessage() {
  const cartItems = document.querySelector('.cart-items');
  const cartSummary = document.querySelector('.cart-summary');
  const yourCart = document.querySelector('.your-cart');
  const cartPage = document.querySelector('.cart-page');
  
  if (!cartItems || !cartPage) return;
  
  // Hide cart summary and your-cart section when cart is empty
  if (cartSummary) {
    cartSummary.style.display = 'none';
  }
  if (yourCart) {
    yourCart.style.display = 'none';
  }

  // Clear any existing content and add empty cart message
  cartPage.innerHTML = `
    <div class="empty-cart-container">
      <h1 class="empty-cart-title">Oops! Your cart is<br>currently empty.</h1>
      <img src="/resources/bt21-chimmy.png" alt="Empty Cart Mascot" class="empty-cart-mascot">
      <button onclick="window.location.href='/shop'" class="empty-cart-btn">
        Continue Shopping
      </button>
    </div>
  `;
}

static initializeEventListeners() {
  const cartItems = document.querySelector('.cart-items');
  const checkoutButton = document.querySelector('.checkout-btn');
  
  console.log('Initializing cart event listeners');
  
  if (checkoutButton) {
    checkoutButton.addEventListener('click', async () => {
      try {
        await this.proceedToCheckout();
      } catch (error) {
        console.error('Error during checkout:', error);
        await Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to proceed to checkout',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  if (!cartItems) {
    console.warn('Cart items container not found');
    return;
  }

  // Handle version changes and checkbox toggles
  cartItems.addEventListener('change', async (e) => {
    const target = e.target;
    
    try {
      if (target.classList.contains('item-checkbox')) {
        const cartItemId = target.dataset.cartItemId;
        if (!cartItemId) return;
        
        console.log('Toggling item selection:', cartItemId);
        await this.toggleSelection(cartItemId);
      }
      else if (target.classList.contains('version-select')) {
        const cartItemId = target.dataset.cartItemId;
        if (!cartItemId) return;
        
        console.log('Changing version:', {
          cartItemId,
          newVersion: target.value
        });
        await this.changeVersion(cartItemId, target.value);
        
        // After version change, force refresh the stock display
        const stockDisplay = document.querySelector(`.stock-status[data-cart-item-id="${cartItemId}"]`);
        if (stockDisplay) {
          const selectedOption = target.options[target.selectedIndex];
          const newStock = selectedOption.dataset.stock;
          stockDisplay.textContent = `Stock: ${newStock}`;
        }
      }
    } catch (error) {
      console.error('Error handling change event:', error);
      await Swal.fire({
        title: 'Error!',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  });

  // Handle quantity changes and delete button clicks
  cartItems.addEventListener('click', async (e) => {
    const target = e.target;
    const cartItem = target.closest('.cart-item');
    const cartItemId = cartItem?.dataset.cartItemId;
    if (!cartItemId) return;

    try {
      // Delete item
      if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
        await this.deleteFromCart(cartItemId);
        return;
      }

      // Handle quantity buttons for selected items
      if (!cartItem.classList.contains('disabled') && target.classList.contains('quantity-btn')) {
        const quantityInput = cartItem.querySelector('.quantity-input');
        let quantity = parseInt(quantityInput.value);

        if (target.classList.contains('decrease')) {
          quantity = Math.max(1, quantity - 1);
        } else if (target.classList.contains('increase')) {
          quantity += 1;
        }

        await this.updateQuantity(cartItemId, quantity);
        await this.updateCartButtonCount();
      }
    } catch (error) {
      console.error('Error handling click event:', error);
      await Swal.fire({
        title: 'Error!',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  });
  }

}

document.addEventListener('DOMContentLoaded', () => {
  this.updateCartButtonCount().catch(error => {
    console.error('Failed to update cart button count:', error);
  });
});



// Add CSS for cart item count badge
const style = document.createElement('style');
style.textContent = `
.cart-button {
    position: relative;
  }
  .cart-item-count {
      position: absolute;
      top: -5px;
      right: -5px;
      background-color: #da9e9f;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      text-decoration: none !important;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 2px solid #fff;
  }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
CartManager.updateCartDisplay().catch(error => {
console.error('Failed to initialize cart:', error);
});
CartManager.initializeEventListeners();
});

window.CartManager = CartManager;