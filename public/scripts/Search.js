document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('.search-container input');
  const searchIcon = document.querySelector('.search-icon');

  // Create search results dropdown
  const searchResultsDropdown = document.createElement('div');
  searchResultsDropdown.classList.add('search-results-dropdown');
  searchInput.parentElement.appendChild(searchResultsDropdown);

  // Debounce function to limit API calls
  function debounce(func, delay) {
      let timeoutId;
      return function() {
          const context = this;
          const args = arguments;
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
              func.apply(context, args);
          }, delay);
      };
  }

  // Fetch search results
  const fetchSearchResults = async (query) => {
      try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          const results = await response.json();
          displaySearchResults(results);
      } catch (error) {
          console.error('Search error:', error);
          searchResultsDropdown.innerHTML = '';
      }
  };

  // Display search results in dropdown
  const displaySearchResults = (results) => {
      // Clear previous results
      searchResultsDropdown.innerHTML = '';

      // If no results, hide dropdown
      if (results.length === 0) {
          searchResultsDropdown.classList.remove('active');
          return;
      }

      // Create scrollable results container
      const resultsList = document.createElement('div');
      resultsList.classList.add('search-results-list');

      // Populate results
      results.forEach(product => {
          const resultItem = document.createElement('a');
          resultItem.href = `/product-page/${product._id}`;
          resultItem.classList.add('search-result-item');

          // Create result item content
          resultItem.innerHTML = `
              <img src="${product.imageH}" alt="${product.name}" class="result-thumbnail">
              <div class="result-details">
                  <span class="result-name">${product.name}</span>
                  <span class="result-artist">${product.artist}</span>
                  <span class="result-price">₱${product.price.toFixed(2)}</span>
              </div>
          `;

          resultsList.appendChild(resultItem);
      });

      // Add results to dropdown
      searchResultsDropdown.innerHTML = '';
      searchResultsDropdown.appendChild(resultsList);
      searchResultsDropdown.classList.add('active');
  };

  // Handle input changes
  const handleSearchInput = debounce(async (event) => {
      const query = event.target.value.trim();

      // Hide dropdown if query is too short
      if (query.length < 2) {
          searchResultsDropdown.classList.remove('active');
          searchResultsDropdown.innerHTML = '';
          return;
      }

      // Fetch and display results
      await fetchSearchResults(query);
  }, 300);

  // Event listeners
  searchInput.addEventListener('input', handleSearchInput);

  // Close dropdown when clicking outside
  document.addEventListener('click', (event) => {
      if (!searchInput.parentElement.contains(event.target)) {
          searchResultsDropdown.classList.remove('active');
      }
  });

  // Navigate to search page on Enter or icon click
  const navigateToSearchPage = () => {
      const query = searchInput.value.trim();
      if (query.length > 0) {
          window.location.href = `/search?q=${encodeURIComponent(query)}`;
      }
  };

  searchIcon.addEventListener('click', navigateToSearchPage);
  searchInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
          navigateToSearchPage();
      }
  });
});