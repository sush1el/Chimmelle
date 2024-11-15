document.addEventListener('DOMContentLoaded', () => {
    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    const versionSelect = document.getElementById('versionSelect');
    const stockInfo = document.getElementById('stockInfo');
    const mainImage = document.getElementById('mainImage');
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    const product = JSON.parse(document.getElementById('productData').textContent);
  
    if (!addToCartBtn || !CartManager) {
        console.error('Required elements or CartManager not found');
        return;
    }
  
    const BUTTON_STATES = {
      NORMAL: {
        text: 'Add to Cart',
        disabled: false
      },
      LOADING: {
        text: '<i class="fas fa-spinner fa-spin"></i> Adding...',
        disabled: true
      },
      SUCCESS: {
        text: '<i class="fas fa-check"></i> Added!',
        disabled: true
      },
      OUT_OF_STOCK: {
        text: 'Out of Stock',
        disabled: true
      }
    };
  
    let buttonResetTimeout;
  
    function setButtonState(state) {
      if (buttonResetTimeout) {
        clearTimeout(buttonResetTimeout);
        buttonResetTimeout = null;
      }
  
      if (!addToCartBtn) return;
      
      const newState = BUTTON_STATES[state];
      if (newState) {
        addToCartBtn.innerHTML = newState.text;
        addToCartBtn.disabled = newState.disabled;
      }
    }
  
    function updateThumbnails(selectedVersionIndex = null) {
      if (!thumbnailContainer) return;
  
      // Clear existing thumbnails
      thumbnailContainer.innerHTML = '';
  
      // Add header image as first thumbnail
      const headerThumb = document.createElement('img');
      headerThumb.src = product.imageH;
      headerThumb.alt = 'Header Thumbnail';
      headerThumb.classList.add('thumbnail');
      headerThumb.addEventListener('click', () => updateMainImage(product.imageH));
      thumbnailContainer.appendChild(headerThumb);
  
      // Show all version images but mark the selected version's images
      product.versions.forEach((version, versionIndex) => {
        if (version.image && version.image.length > 0) {
          version.image.forEach((imgSrc, index) => {
            const thumbContainer = document.createElement('div');
            thumbContainer.classList.add('thumbnail-wrapper');
            
            const thumb = document.createElement('img');
            thumb.src = imgSrc;
            thumb.alt = `${version.version} Image ${index + 1}`;
            thumb.classList.add('thumbnail');
            
            // Add version indicator
            const versionIndicator = document.createElement('span');
            versionIndicator.classList.add('version-indicator');
            versionIndicator.textContent = version.version;
            
            // Highlight current version's images
            if (selectedVersionIndex === versionIndex) {
              thumbContainer.classList.add('current-version');
            }
            
            thumb.addEventListener('click', () => updateMainImage(imgSrc));
            
            thumbContainer.appendChild(thumb);
            thumbContainer.appendChild(versionIndicator);
            thumbnailContainer.appendChild(thumbContainer);
          });
        }
      });
    }
  
    function updateMainImage(src) {
      if (mainImage) {
        mainImage.style.opacity = '0';
        setTimeout(() => {
          mainImage.src = src;
          mainImage.style.opacity = '1';
        }, 50);
      }
    }
  
    function updateStockDisplay(selectedVersion) {
      const hasStock = selectedVersion && selectedVersion.quantity > 0;
      
      if (hasStock) {
        stockInfo.textContent = `${selectedVersion.quantity} items left in stock`;
        stockInfo.classList.remove('out-of-stock');
        setButtonState('NORMAL');
      } else {
        stockInfo.textContent = "OUT OF STOCK";
        stockInfo.classList.add('out-of-stock');
        setButtonState('OUT_OF_STOCK');
      }
  
      return hasStock;
    }
  
    async function handleAddToCart(e) {
      try {
        const productId = e.target.dataset.productId;
        if (!productId) {
          throw new Error('Product ID not found');
        }
  
        let version = null;
        if (product.versions && product.versions.length > 0) {
          const selectedVersion = product.versions[versionSelect.value];
          
          if (!selectedVersion) {
            throw new Error('Please select a version');
          }
  
          if (selectedVersion.quantity <= 0) {
            await Swal.fire({
              title: 'Out of Stock',
              text: 'Sorry, this version is currently out of stock',
              icon: 'warning',
              confirmButtonText: 'OK'
            });
            updateStockDisplay(selectedVersion);
            return;
          }
          
          version = selectedVersion.version;
        }
  
        setButtonState('LOADING');
  
        const response = await fetch('/api/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            productId,
            version 
          }),
          credentials: 'include'
        });
  
        if (response.redirected) {
          window.location.href = response.url;
          return;
        }
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to add item to cart');
        }
  
        setButtonState('SUCCESS');
  
        await Swal.fire({
          title: 'Success!',
          text: 'Item added to cart successfully',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
  
        buttonResetTimeout = setTimeout(() => {
          setButtonState('NORMAL');
        }, 2000);
  
      } catch (error) {
        console.error('Error adding to cart:', error);
        
        await Swal.fire({
          title: 'Error!',
          text: error.message,
          icon: 'error',
          confirmButtonText: 'OK'
        });
  
        const selectedVersion = product.versions[versionSelect.value];
        updateStockDisplay(selectedVersion);
      }
    }
  
    // Event Listeners
    versionSelect.addEventListener('change', (e) => {
        const selectedIndex = parseInt(e.target.value);
        const selectedVersion = product.versions[selectedIndex];
        
        // Update thumbnails but keep all versions visible
        updateThumbnails(selectedIndex);
        
        // Update main image to first image of selected version
        if (selectedVersion.image && selectedVersion.image.length > 0) {
          updateMainImage(selectedVersion.image[0]);
        }
        
        updateStockDisplay(selectedVersion);
      });
    
      addToCartBtn.addEventListener('click', handleAddToCart);
    
      // Initial setup
      if (product.versions && product.versions.length > 0) {
        const initialVersion = product.versions[versionSelect.value];
        updateStockDisplay(initialVersion);
        updateThumbnails(parseInt(versionSelect.value)); // Show all images initially
      }
    });
  
    addToCartBtn.addEventListener('click', handleAddToCart);
  
    // Initial setup
    if (product.versions && product.versions.length > 0) {
      const initialVersion = product.versions[versionSelect.value];
      updateStockDisplay(initialVersion);
      updateThumbnails(); // Show all images initially
    }
 