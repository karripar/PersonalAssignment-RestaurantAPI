import {Restaurant} from './types/Restaurant';
import { LoginUser, User } from './types/credentials';
import { UpdateResult, UploadResult } from './types/Result';
import { errorModal } from './components';
import { apiUrl } from './variables';

const fetchData = async <T>(
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


const getUserLocation = async(): Promise<[number, number]> => {
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
    return [position.coords.latitude, position.coords.longitude];
  } catch (error) {
    throw new Error('Could not get user location');
  }
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const clearMarkers = (map: L.Map, markers: L.Marker[]) => {
  markers.forEach((marker) => map.removeLayer(marker));
  markers = [];
}

const populateCityDropdown = (restaurants: Restaurant[]) => {
  const cityDropdown = document.getElementById('city-selector') as HTMLSelectElement;
  const uniqueCities = [...new Set(restaurants.map((restaurant) => restaurant.city))];
  uniqueCities.sort((a, b) => a.localeCompare(b));

  uniqueCities.forEach((city) => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    cityDropdown.appendChild(option);
  });
};

const populateCompanyDropdown = (restaurants: Restaurant[]) => {
  const companyDropdown = document.getElementById('company-selector') as HTMLSelectElement;
  const companies = [...new Set(restaurants.map((restaurant) => restaurant.company))];
  companies.sort((a, b) => a.localeCompare(b));

  companies.forEach((company) => {
    const option = document.createElement('option');
    option.value = company;
    option.textContent = company;
    companyDropdown.appendChild(option);
  });
};


const showPassword = () => {
  const input = document.getElementById("password") as HTMLInputElement;
  if (input.type === "password") {
    input.type = "text";
  } else {
    input.type = "password";
  }
}

const isLoggedIn = (): boolean => {
  const token = localStorage.getItem('token');
  return token ? true : false;
}

const updateLoginButton = () => {
  const logInButton = document.getElementById('log-in') as HTMLButtonElement;
  if (!logInButton) return;

  if (isLoggedIn()) {
    // Update button to show logout state
    logInButton.innerHTML = 'Log out <i class="fa-solid fa-right-from-bracket"></i>'; // Change icon to indicate logout
    logInButton.style.backgroundColor = 'var(--lapis-lazuli)';
    logInButton.title = 'Log out';

    logInButton.onclick = () => {
      // Log out functionality
      localStorage.removeItem('token');
      localStorage.removeItem('favoriteRestaurant');
      console.log('User logged out');
      updateLoginButton(); // Update button appearance after logout
      location.reload();
    };
  } else {
    // Update button to show login state
    logInButton.innerHTML = 'Log in <i class="fa-solid fa-right-to-bracket"></i>'; // Change icon back to login
    logInButton.title = 'Log in';

    logInButton.onclick = () => {
      // Show login dialog
      const dialog = document.querySelector('#user-dialog') as HTMLDialogElement;
      const backdrop = document.getElementById('backdrop') as HTMLElement;
      if (backdrop && dialog) {
        backdrop.style.display = 'block';
        dialog.showModal();
        document.body.classList.add('no-scroll');
      }
    };
  }
};


const addRestaurantToFavorites = async (restaurantId: string) => {
  const modal = document.querySelector('dialog') as HTMLDialogElement;
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('User not logged in');
    }

    if (!restaurantId) {
      throw new Error('Invalid restaurant ID');
    }

    const data = { favouriteRestaurant: restaurantId };

    const options: RequestInit = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    };

    const response = await fetchData(apiUrl + '/users', options);
    console.log("Restaurant added to favorites, response:", response);

    // Ensure response is successful before setting the ID in localStorage
    if (response) {
      localStorage.setItem('favoriteRestaurant', restaurantId);

    } else {
      throw new Error('Failed to add restaurant to favorites');
    }
  } catch (error) {
    console.error('Error adding favorite restaurant:', error);
    modal.innerHTML = errorModal((error as Error).message);
    modal.showModal();
  }
};

export {fetchData, getUserLocation, calculateDistance, clearMarkers, populateCityDropdown, populateCompanyDropdown, showPassword, isLoggedIn, updateLoginButton, addRestaurantToFavorites};
