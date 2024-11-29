document.addEventListener('DOMContentLoaded', () => {
  async function updateCartButtonCount() {
    try {
      const cart = await fetch('/api/cart', {
        credentials: 'include'
      }).then(response => response.json());
      
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

  // Initial update
  updateCartButtonCount().catch(console.error);

  // Optional: Listen for cart changes in other parts of the site
  document.addEventListener('cartUpdated', updateCartButtonCount);
});