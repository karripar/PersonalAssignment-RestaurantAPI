import {Restaurant} from './types/Restaurant';
import {getFavorite} from './types/credentials';
import {errorModal} from './components';
import {apiUrl} from './variables';

const fetchData = async <T>( // Fetch data from API (general function)
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Error ${response.status} occured`);
  }
  const json = response.json();
  return json;
};

const getUserLocation = async (): Promise<[number, number]> => { // Get user location
  try {
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds
          maximumAge: 0, // No cache
        });
      }
    );
    return [position.coords.latitude, position.coords.longitude]; // Return coordinates
  } catch (error) {
    throw new Error('Could not get user location');
  }
};

const calculateDistance = ( // Calculate distance between two coordinates
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const clearMarkers = (map: L.Map, markers: L.Marker[]) => { // Clear markers from map
  markers.forEach((marker) => map.removeLayer(marker));
  markers = [];
};

const populateCityDropdown = (restaurants: Restaurant[]) => { // Populate city dropdown
  const cityDropdown = document.getElementById(
    'city-selector'
  ) as HTMLSelectElement;
  const uniqueCities = [
    ...new Set(restaurants.map((restaurant) => restaurant.city)),  // Get unique cities, ...new Set() removes duplicates
  ];
  uniqueCities.sort((a, b) => a.localeCompare(b)); // Sort cities alphabetically

  uniqueCities.forEach((city) => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    cityDropdown.appendChild(option);
  });
};

const populateCompanyDropdown = (restaurants: Restaurant[]) => { // Populate company dropdown
  const companyDropdown = document.getElementById(
    'company-selector'
  ) as HTMLSelectElement;
  const companies = [
    ...new Set(restaurants.map((restaurant) => restaurant.company)),
  ]; // Get unique companies
  companies.sort((a, b) => a.localeCompare(b));

  companies.forEach((company) => {
    const option = document.createElement('option');
    option.value = company;
    option.textContent = company;
    companyDropdown.appendChild(option);
  });
};

const showPassword = () => { // Show password
  const input = document.getElementById('password') as HTMLInputElement;
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
};

const isLoggedIn = (): boolean => { // Check if user is logged in
  const token = localStorage.getItem('token');
  return token ? true : false;
};

const updateLoginButton = () => { // Update login button
  const logInButton = document.getElementById('log-in') as HTMLButtonElement;
  if (!logInButton) return;

  if (isLoggedIn()) {
    // Update button to show logout state
    logInButton.innerHTML =
      'Log out <i class="fa-solid fa-right-from-bracket"></i>'; // Change icon to indicate logout
    logInButton.style.background = 'linear-gradient(135deg, #ff6a00, #ee0979)';
    logInButton.title = 'Log out';
  } else {
    // Update button to show login state
    logInButton.innerHTML =
      'Log in <i class="fa-solid fa-right-to-bracket"></i>'; // Change icon back to login
    logInButton.style.background = 'linear-gradient(135deg, #6e45e2, #88d3ce);';
    logInButton.title = 'Log in';
  }
};

const addRestaurantToFavorites = async (restaurantId: string) => { // Add restaurant to favorites
  const modal = document.querySelector('dialog') as HTMLDialogElement;
  try {
    const token = localStorage.getItem('token'); // Get token from localStorage
    if (!token) {
      return;
    }

    if (!restaurantId) { // Check if restaurant ID is valid
      throw new Error('Invalid restaurant ID');
    }

    const data = {favouriteRestaurant: restaurantId};

    const options: RequestInit = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    };

    const response = await fetchData<getFavorite>(apiUrl + '/users', options);
    console.log('Restaurant added to favorites, response:', response);

    // Ensure response is successful before setting the ID in localStorage
    if (response) {
      localStorage.setItem('favoriteRestaurant', restaurantId);
    } else {
      throw new Error('Failed to add restaurant to favorites');
    }
  } catch (error) { // Error handling
    console.error('Error adding favorite restaurant:', error);
    modal.innerHTML = errorModal((error as Error).message);
    const closeButtonHtml = `
                      <div class="close-modal">
                        <button id="close-dialog">&#128940</button>
                      </div>`;
    modal.insertAdjacentHTML('beforeend', closeButtonHtml);
    modal.showModal(); // Show modal with menu details
    const closeButton = document.getElementById(
      'close-dialog'
    ) as HTMLButtonElement;
    closeButton &&
      closeButton.addEventListener('click', () => {
        modal.close();
      });
  }
};

export {
  fetchData,
  getUserLocation,
  calculateDistance,
  clearMarkers,
  populateCityDropdown,
  populateCompanyDropdown,
  showPassword,
  isLoggedIn,
  updateLoginButton,
  addRestaurantToFavorites,
};
