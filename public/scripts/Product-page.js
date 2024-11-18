document.addEventListener('DOMContentLoaded', () => {
    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    const versionSelect = document.getElementById('versionSelect');
    const stockInfo = document.getElementById('stockInfo');
    const mainImage = document.getElementById('mainImage');
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const thumbnails = document.querySelectorAll('.thumbnail');
    const product = JSON.parse(document.getElementById('productData').textContent);
    
    // Quantity-related elements
    const decrementBtn = document.getElementById('decrementBtn');
    const incrementBtn = document.getElementById('incrementBtn');
    const quantityInput = document.getElementById('quantity-input');
    
    // Check if quantity controls are present
    const hasQuantityControls = decrementBtn && incrementBtn && quantityInput;

    
    function updateQuantityControls(maxStock) {
        if (!hasQuantityControls) return;
        
        const currentQuantity = parseInt(quantityInput.value) || 1;
        
        // Update increment button state
        incrementBtn.disabled = currentQuantity >= maxStock;
        
        // Update decrement button state
        decrementBtn.disabled = currentQuantity <= 1;
        
        // Ensure quantity doesn't exceed stock
        if (currentQuantity > maxStock) {
            quantityInput.value = maxStock;
        }
    }

    function handleQuantityChange(change) {
        if (!hasQuantityControls) return;
        
        const currentVersion = product.versions[versionSelect.value];
        const maxStock = currentVersion.quantity;
        const currentQuantity = parseInt(quantityInput.value) || 1;
        const newQuantity = currentQuantity + change;

        if (newQuantity >= 1 && newQuantity <= maxStock) {
            quantityInput.value = newQuantity;
            updateQuantityControls(maxStock);
        }
    }

    // Quantity input validation
    function validateQuantityInput() {
        if (!hasQuantityControls) return 1;

        const currentVersion = product.versions[versionSelect.value];
        const maxStock = currentVersion.quantity;
        let quantity = parseInt(quantityInput.value) || 1;

        // Ensure quantity is within valid range
        if (quantity < 1) quantity = 1;
        if (quantity > maxStock) quantity = maxStock;

        // Update input value to reflect validated quantity
        quantityInput.value = quantity;
        updateQuantityControls(maxStock);

        return quantity;
    }

    // Only set up quantity-related event listeners if elements exist
    if (hasQuantityControls) {
        decrementBtn.addEventListener('click', () => handleQuantityChange(-1));
        incrementBtn.addEventListener('click', () => handleQuantityChange(1));
        
        // Initialize quantity controls
        const initialVersion = product.versions[versionSelect.value];
        quantityInput.value = 1; // Set initial value
        updateQuantityControls(initialVersion.quantity);

        // Add input event listener for direct quantity input
        quantityInput.addEventListener('input', validateQuantityInput);
        
        // Update controls when version changes
        versionSelect.addEventListener('change', () => {
            const selectedVersion = product.versions[versionSelect.value];
            quantityInput.value = 1; // Reset quantity when version changes
            updateQuantityControls(selectedVersion.quantity);
        });
    }

    let currentImageIndex = 0;
    let isTransitioning = false;

    if (!addToCartBtn || !CartManager) {
        console.error('Required elements or CartManager not found');
        return;
    }

    const BUTTON_STATES = {
        NORMAL: {
            text: addToCartBtn.textContent, // This will now be either "Pre-order" or "Add to Cart"
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

    // Image Navigation Functions
    function updateMainImage(index, src = null) {
        if (!isTransitioning) {
            isTransitioning = true;
            mainImage.style.opacity = '0';
            
            setTimeout(() => {
                mainImage.src = src || thumbnails[index].src;
                mainImage.style.opacity = '1';
                currentImageIndex = index;
                isTransitioning = false;
                
                // Update active thumbnail
                thumbnails.forEach(thumb => thumb.classList.remove('active'));
                thumbnails[index].classList.add('active');
            }, 300);
        }
    }

    function showNextImage() {
        const nextIndex = (currentImageIndex + 1) % thumbnails.length;
        updateMainImage(nextIndex);
    }

    function showPrevImage() {
        const prevIndex = (currentImageIndex - 1 + thumbnails.length) % thumbnails.length;
        updateMainImage(prevIndex);
    }

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
        if (currentImageIndex === 0) headerThumb.classList.add('active');
        headerThumb.addEventListener('click', () => updateMainImage(0, product.imageH));
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
                    
                    const versionIndicator = document.createElement('span');
                    versionIndicator.classList.add('version-indicator');
                    versionIndicator.textContent = version.version;
                    
                    if (selectedVersionIndex === versionIndex) {
                        thumbContainer.classList.add('current-version');
                    }
                    
                    const thisIndex = index + 1; // +1 because of header image
                    thumb.addEventListener('click', () => updateMainImage(thisIndex, imgSrc));
                    
                    thumbContainer.appendChild(thumb);
                    thumbContainer.appendChild(versionIndicator);
                    thumbnailContainer.appendChild(thumbContainer);
                });
            }
        });
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

            // Get the current quantity from the input
            const quantity = validateQuantityInput();
            console.log('Adding to cart with quantity:', quantity); // Debug log
            
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

                if (quantity > selectedVersion.quantity) {
                    throw new Error(`Only ${selectedVersion.quantity} items available in stock`);
                }
                
                version = selectedVersion.version;
            }

            setButtonState('LOADING');

            // Use CartManager to add to cart
            if (version) {
                // If we have a version, pass both version and quantity
                await CartManager.addToCart(productId, {
                    version: version,
                    quantity: quantity
                });
            } else {
                // If no version, just pass quantity
                await CartManager.addToCart(productId, quantity);
            }

            setButtonState('SUCCESS');

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

    function validateQuantityInput() {
        if (!hasQuantityControls) return 1;

        const currentVersion = product.versions[versionSelect.value];
        const maxStock = currentVersion.quantity;
        let quantity = parseInt(quantityInput.value) || 1;

        // Ensure quantity is within valid range
        if (quantity < 1) quantity = 1;
        if (quantity > maxStock) quantity = maxStock;

        // Update input value to reflect validated quantity
        quantityInput.value = quantity;
        updateQuantityControls(maxStock);

        return parseInt(quantity); // Ensure we return an integer
    }
    
    // Event Listeners
    if (prevButton) {
        prevButton.addEventListener('click', showPrevImage);
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', showNextImage);
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            showPrevImage();
        } else if (e.key === 'ArrowRight') {
            showNextImage();
        }
    });

    versionSelect.addEventListener('change', (e) => {
        const selectedIndex = parseInt(e.target.value);
        const selectedVersion = product.versions[selectedIndex];
        
        updateThumbnails(selectedIndex);
        
        if (selectedVersion.image && selectedVersion.image.length > 0) {
            updateMainImage(1, selectedVersion.image[0]); // 1 because header image is at 0
        }
        
        updateStockDisplay(selectedVersion);
    });
    
    addToCartBtn.addEventListener('click', handleAddToCart);
    
    // Initial setup
    if (product.versions && product.versions.length > 0) {
        const initialVersion = product.versions[versionSelect.value];
        updateStockDisplay(initialVersion);
        updateThumbnails(parseInt(versionSelect.value));
    }
});