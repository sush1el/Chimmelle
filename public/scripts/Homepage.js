
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
        } catch (error) {
          console.error('Failed to add to cart:', error);
          
          // Reset button to original state immediately
          button.disabled = false;
          button.innerHTML = originalText;
          
          // If error is not a user dismissal, you might want to show an error
          if (error.message !== 'cancel') {
            await Swal.fire({
              title: 'Error!',
              text: 'Failed to add item to cart',
              icon: 'error',
              confirmButtonText: 'OK'
            });
          }
          
          return;
        }

        // Reset button to original state without "Added!" state
        button.disabled = false;
        button.innerHTML = originalText;

      } catch (error) {
        console.error('Error in click handler:', error);
        button.disabled = false;
        button.innerHTML = 'Add to Cart';
      }
    });
  });
});

const welcomeMessage = document.querySelector('.welcome-message');
const navbar = document.querySelector('.navbar');
let lastScrollTop = 0;

// Show the welcome message by default
welcomeMessage.classList.add('visible');
navbar.style.top = '40px'; // Adjust navbar position

window.addEventListener('scroll', () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  if (scrollTop === 0) {
    welcomeMessage.classList.remove('hidden');
    welcomeMessage.classList.add('visible');
    navbar.style.top = '40px'; // Adjust the navbar position when the welcome message is visible
  } else if (scrollTop > lastScrollTop) {
    // Scrolling down
    welcomeMessage.classList.remove('visible');
    welcomeMessage.classList.add('hidden');
    navbar.style.top = '0'; // Reset the navbar position when the welcome message is hidden
  }

  lastScrollTop = scrollTop;
});