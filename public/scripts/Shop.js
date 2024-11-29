// public/scripts/shop.js
document.addEventListener('DOMContentLoaded', () => {
  const filterForm = document.querySelector('.filters');
  const productsGrid = document.querySelector('.products-grid');
  const sortSelect = document.querySelector('.sort-select');

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

  // Function to build query string from form data
  function getFilterQueryString() {
      const params = new URLSearchParams();
      
       document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            const filterSection = checkbox.closest('.filter-section').querySelector('h3').textContent;
            switch(filterSection) {
                case 'Availability':
                    params.append('availability', checkbox.id === 'onhand' ? 'on-hand' : 'pre-order');
                    break;
                case 'Category': // Match the h3 text in the HTML
                    params.append('type', checkbox.value || checkbox.id);
                    break;
                case 'Artists':
                    params.append('artist', checkbox.value || checkbox.id);
                    break;
            }
        });

       // Add price range
       const minPrice = document.querySelector('.price-range input[name="minPrice"]').value;
       const maxPrice = document.querySelector('.price-range input[name="maxPrice"]').value;
       if (minPrice) params.append('minPrice', minPrice);
       if (maxPrice) params.append('maxPrice', maxPrice);

       // Add sort
       const sortValue = sortSelect.value;
       if (sortValue) {
           params.append('sort', sortValue.toLowerCase().replace(/, /g, '_'));
       }

       return params.toString();
   }

  // Function to update product grid
  async function updateProducts() {
      try {
          const queryString = getFilterQueryString();
          const response = await fetch(`/shop?${queryString}`, {
              headers: {
                  'X-Requested-With': 'XMLHttpRequest'
              }
          });
          
          if (response.headers.get('Content-Type').includes('application/json')) {
              const data = await response.json();
              productsGrid.innerHTML = data.productsHtml;
              updateFilterCounts(data.counts);
          } else {
              const html = await response.text();
              const temp = document.createElement('div');
              temp.innerHTML = html;
              
              const newProductsGrid = temp.querySelector('.products-grid');
              if (newProductsGrid) {
                  productsGrid.innerHTML = newProductsGrid.innerHTML;
              }
              
              updateFilterCounts(temp);
          }

          history.pushState({}, '', `/shop?${queryString}`);
      } catch (error) {
          console.error('Error updating products:', error);
      }
  }

  // Function to update filter counts
  function updateFilterCounts(counts) {
    // Check if counts is undefined or null
    if (!counts) {
        console.warn('No filter counts provided');
        return;
    }

    // Check if specific count properties exist before processing
    try {
        // Update availability counts
        if (counts.availability) {
            Object.entries(counts.availability).forEach(([key, count]) => {
                const label = document.querySelector(`label[for="${key === 'on-hand' ? 'onhand' : 'preorder'}"]`);
                if (label) {
                    label.textContent = `${key === 'on-hand' ? 'On Hand' : 'Pre-Order'} (${count})`;
                }
            });
        }

        // Update type counts
        if (counts.types && Array.isArray(counts.types)) {
            counts.types.forEach(({ _id, count }) => {
                const label = document.querySelector(`label[for="${_id.toLowerCase()}"]`);
                if (label) {
                    label.textContent = `${_id.charAt(0).toUpperCase() + _id.slice(1)} (${count})`;
                }
            });
        }

        // Update artist counts
        if (counts.artists && Array.isArray(counts.artists)) {
            counts.artists.forEach(({ _id, count }) => {
                const label = document.querySelector(`label[for="${_id.toLowerCase().replace(/ /g, '-')}"]`);
                if (label) {
                    label.textContent = `${_id} (${count})`;
                }
            });
        }
    } catch (error) {
        console.error('Error updating filter counts:', error);
    }
}

  // Add event listeners
  filterForm.addEventListener('change', updateProducts);
  sortSelect.addEventListener('change', updateProducts);

  // Handle price range inputs
  const priceInputs = document.querySelectorAll('.price-range input');
  priceInputs.forEach(input => {
      input.addEventListener('input', debounce(updateProducts, 500));
  });

  // Initialize the page with any existing URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.toString()) {
      urlParams.forEach((value, key) => {
          switch(key) {
              case 'availability':
                  document.getElementById(value === 'on-hand' ? 'onhand' : 'preorder').checked = true;
                  break;
              case 'category':
                  document.getElementById(value.toLowerCase()).checked = true;
                  break;
              case 'artist':
                  const artistId = value.toLowerCase().replace(/ /g, '-');
                  const artistCheckbox = document.getElementById(artistId);
                  if (artistCheckbox) artistCheckbox.checked = true;
                  break;
              case 'minPrice':
                  document.querySelector('.price-range input[name="minPrice"]').value = value;
                  break;
              case 'maxPrice':
                  document.querySelector('.price-range input[name="maxPrice"]').value = value;
                  break;
              case 'sort':
                  const sortOption = value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  document.querySelector('.sort-select').value = sortOption;
                  break;
          }
      });
  }
});

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
      const later = () => {
          clearTimeout(timeout);
          func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
  };
}