class LocationHandler {
  static async fetchLocations(type, parentCode = '') {
    let url = 'https://psgc.gitlab.io/api/';
    switch (type) {
      case 'regions':
        url += 'regions/';
        break;
      case 'provinces':
        // Special handling for NCR
        if (parentCode === '130000000') { // NCR region code
          return []; // NCR has no provinces
        }
        url += `regions/${parentCode}/provinces/`;
        break;
      case 'cities':
        // For NCR, fetch cities directly from region
        if (parentCode.startsWith('13')) { // NCR codes start with 13
          url += `regions/130000000/cities-municipalities/`;
        } else {
          url += `provinces/${parentCode}/cities-municipalities/`;
        }
        break;
      case 'barangays':
        url += `cities-municipalities/${parentCode}/barangays/`;
        break;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      return [];
    }
  }

  static async populateLocationDropdowns(formPrefix, selectedLocation = {}) {
    const dropdowns = {
      region: document.getElementById(`${formPrefix}-region`),
      province: document.getElementById(`${formPrefix}-province`),
      city: document.getElementById(`${formPrefix}-city`),
      barangay: document.getElementById(`${formPrefix}-barangay`)
    };
  
    // Reset and disable dropdowns
    dropdowns.province.innerHTML = '<option value="">Select Province</option>';
    dropdowns.city.innerHTML = '<option value="">Select City/Municipality</option>';
    dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
    dropdowns.province.disabled = true;
    dropdowns.city.disabled = true;
    dropdowns.barangay.disabled = true;
  
    try {
      // Populate regions
      const regions = await this.fetchLocations('regions');
      dropdowns.region.innerHTML = '<option value="">Select Region</option>';
      regions.forEach(region => {
        const option = new Option(region.name, JSON.stringify({ code: region.code, name: region.name }));
        if (selectedLocation.region && selectedLocation.region.code === region.code) {
          option.selected = true;
        }
        dropdowns.region.add(option);
      });
  
      // Populate additional dropdowns if editing
      if (selectedLocation.region) {
        const isNCR = selectedLocation.region.code === '130000000';
        
        if (!isNCR) {
          const provinces = await this.fetchLocations('provinces', selectedLocation.region.code);
          provinces.forEach(province => {
            const option = new Option(province.name, JSON.stringify({ code: province.code, name: province.name }));
            if (selectedLocation.province && selectedLocation.province.code === province.code) {
              option.selected = true;
            }
            dropdowns.province.add(option);
          });
          dropdowns.province.disabled = false;
        }
  
        if (selectedLocation.province || isNCR) {
          const cities = await this.fetchLocations('cities', 
            isNCR ? selectedLocation.region.code : selectedLocation.province.code);
          cities.forEach(city => {
            const option = new Option(city.name, JSON.stringify({ code: city.code, name: city.name }));
            if (selectedLocation.city && selectedLocation.city.code === city.code) {
              option.selected = true;
            }
            dropdowns.city.add(option);
          });
          dropdowns.city.disabled = false;
        }
  
        if (selectedLocation.city) {
          const barangays = await this.fetchLocations('barangays', selectedLocation.city.code);
          barangays.forEach(barangay => {
            const option = new Option(barangay.name, JSON.stringify({ code: barangay.code, name: barangay.name }));
            if (selectedLocation.barangay && selectedLocation.barangay.code === barangay.code) {
              option.selected = true;
            }
            dropdowns.barangay.add(option);
          });
          dropdowns.barangay.disabled = false;
        }
      }
    } catch (error) {
      console.error('Error populating dropdowns:', error);
    }
  }
  static setupLocationDropdownListeners(formPrefix) {
    const dropdowns = {
      region: document.getElementById(`${formPrefix}-region`),
      province: document.getElementById(`${formPrefix}-province`),
      city: document.getElementById(`${formPrefix}-city`),
      barangay: document.getElementById(`${formPrefix}-barangay`)
    };
  
    dropdowns.region.addEventListener('change', async () => {
      const selectedRegion = JSON.parse(dropdowns.region.value || '{}');
      dropdowns.province.innerHTML = '<option value="">Select Province</option>';
      dropdowns.city.innerHTML = '<option value="">Select City/Municipality</option>';
      dropdowns.barangay.innerHTML = '<option value="">Select Barangay</option>';
      dropdowns.province.disabled = dropdowns.city.disabled = dropdowns.barangay.disabled = true;
  
      if (selectedRegion.code) {
        const isNCR = selectedRegion.code === '130000000';
        
        if (!isNCR) {
          const provinces = await LocationHandler.fetchLocations('provinces', selectedRegion.code);
          provinces.forEach(province => {
            dropdowns.province.add(new Option(province.name, JSON.stringify({ code: province.code, name: province.name })));
          });
          dropdowns.province.disabled = false;
        } else {
          dropdowns.province.innerHTML = `<option value='${JSON.stringify({ code: "130000000", name: "NCR" })}'>NCR</option>`;
          dropdowns.province.disabled = true;
          
          const cities = await LocationHandler.fetchLocations('cities', selectedRegion.code);
          cities.forEach(city => {
            dropdowns.city.add(new Option(city.name, JSON.stringify({ code: city.code, name: city.name })));
          });
          dropdowns.city.disabled = false;
        }
      }
    });
  }
}

window.LocationHandler = LocationHandler;