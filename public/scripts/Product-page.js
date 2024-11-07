document.addEventListener('DOMContentLoaded', () => {
  // Check if CartManager is available
  if (typeof CartManager === 'undefined') {
    console.error('CartManager not loaded');
    return;
  }

  // Add click event listener to "Add to Cart" buttons
  const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
  addToCartButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      try {
        const productId = e.target.dataset.productId;
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

document.querySelectorAll('.expandable-header').forEach(header => {
  header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const icon = header.querySelector('.expand-icon');
      if (content.style.display === 'block') {
          content.style.display = 'none';
          icon.textContent = '+';
      } else {
          content.style.display = 'block';
          icon.textContent = '-';
      }
  });
});

// Image gallery
const mainImage = document.getElementById('mainImage');
const thumbnails = document.querySelectorAll('.thumbnail');

thumbnails.forEach(thumb => {
  thumb.addEventListener('click', () => {
      mainImage.src = thumb.src.replace('80', '400');
  });
});