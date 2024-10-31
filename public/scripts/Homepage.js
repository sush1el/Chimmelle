// public/js/homepage.js
document.addEventListener('DOMContentLoaded', () => {
  // Check if CartManager is available
  if (typeof CartManager === 'undefined') {
    console.error('CartManager not loaded');
    return;
  }

  // Add click event listeners to all "Add to Cart" buttons
  document.querySelectorAll('.choose-options-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      try {
        const productCard = e.target.closest('.product-card');
        if (!productCard) return;
        
        const productId = productCard.dataset.productId;
        if (!productId) {
          console.error('Product ID not found');
          return;
        }

        // Disable button to prevent double clicks
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

        // Try to add to cart
        try {
          await CartManager.addToCart(productId);
          
          // Visual feedback on success
          button.innerHTML = '<i class="fas fa-check"></i> Added!';
          setTimeout(() => {
            button.disabled = false;
            button.innerHTML = originalText;
          }, 2000);
          
        } catch (error) {
          console.error('Failed to add to cart:', error);
          button.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed';
          setTimeout(() => {
            button.disabled = false;
            button.innerHTML = originalText;
          }, 2000);
        }

      } catch (error) {
        console.error('Error in click handler:', error);
        button.disabled = false;
        button.innerHTML = 'Add to Cart';
      }
    });
  });
});