import {
  errorModal,
  restaurantModal,
  popupContent,
  restaurantIcon,
  restaurantIconHighlighted,
} from './components';
import {
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
} from './functions';
import {apiUrl} from './variables';
import {Restaurant} from './types/Restaurant';
import {DailyMenu, WeeklyMenu} from './types/Menu';
import { LoginUser, User, UpdateUser, getFavorite} from './types/credentials';
import { UpdateResult, UploadResult } from './types/Result';

let map: L.Map;
let markers: L.Marker[] = [];
const nearestButton = document.getElementById('nearest-restaurant') as HTMLButtonElement;
const loginForm = document.querySelector('#dialog-form') as HTMLFormElement;
const usernameInput = document.querySelector('#username') as HTMLInputElement;
const passwordInput = document.querySelector('#password') as HTMLInputElement;
const emailInput = document.querySelector('#email') as HTMLInputElement;
const closeModal = document.querySelector('.close-modal') as HTMLDivElement;
const modal = document.querySelector('dialog');
if (!modal) {
  throw new Error('Modal not found');
}
closeModal?.addEventListener('click', () => {
  modal.close();
});



const initMap = async (color: string) => {
  try {
    const userLocation = await getUserLocation();
    console.log(userLocation);

    const mapOptions = {
      center: L.latLng(userLocation[0], userLocation[1]),
      zoom: 14,
    };
    map = L.map('map', mapOptions);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/' + color + '_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);
  } catch (error) {
    console.error(error);
  }
};

initMap('dark');

closeModal && closeModal.addEventListener('click', () => {
    modal.close();
 });

 const createMarkers = (
  restaurants: Restaurant[],
  highlightClosest?: Restaurant | null
) => {
  clearMarkers(map, markers);

  const favoriteRestaurantId = localStorage.getItem('favoriteRestaurant');

  restaurants.forEach((restaurant) => {
    const [lon, lat] = restaurant.location.coordinates;
    const icon =
      highlightClosest && restaurant._id === highlightClosest._id
        ? restaurantIconHighlighted
        : restaurantIcon;
    const marker = L.marker([lat, lon], { icon }).addTo(map);
    markers.push(marker);

    const isFavorite = favoriteRestaurantId === restaurant._id;
    const popupHTML = popupContent(restaurant, isFavorite);
    marker.bindPopup(popupHTML, {
      className: 'custom-popup',
    });

    marker.addEventListener('click', () => {
      marker.openPopup();

      // Add click event listener for today's menu button
      const todayMenuBtn = document.getElementById(`todays-menu`);
      if (todayMenuBtn) {
        todayMenuBtn.addEventListener('click', async () => {
          try {
            // Fetch today's menu
            const menu = await fetchData<DailyMenu>(
              apiUrl + `/restaurants/daily/${restaurant._id}/fi`
            );
            console.log(menu);

            modal.innerHTML = ''; // Clear previous content
            const menuHtml = restaurantModal(restaurant, menu, 'daily');
            modal.insertAdjacentHTML('beforeend', menuHtml);

            const closeButtonHtml = `
                      <div class="close-modal">
                        <button id="close-dialog">&#128940</button>
                      </div>`;
            modal.insertAdjacentHTML('beforeend', closeButtonHtml);
            modal.showModal(); // Show modal with menu details
            const closeButton = document.getElementById('close-dialog') as HTMLButtonElement;
            closeButton && closeButton.addEventListener('click', () => {
              modal.close();
            });

          } catch (error) {
            modal.innerHTML = errorModal((error as Error).message);
            modal.showModal();
          }
        });
      }

      // Add click event listener for weekly menu button
      const weeklyMenuBtn = document.getElementById(`weekly-menu`);
      if (weeklyMenuBtn) {
        weeklyMenuBtn.addEventListener('click', async () => {
          try {
            // Fetch weekly menu
            const menu = await fetchData<WeeklyMenu>(
              apiUrl + `/restaurants/weekly/${restaurant._id}/fi`
            );
            console.log(menu);

            modal.innerHTML = ''; // Clear previous content
            const menuHtml = restaurantModal(restaurant, menu, 'weekly');
            modal.insertAdjacentHTML('beforeend', menuHtml);

            const closeButtonHtml = `
                      <div class="close-modal">
                        <button id="close-dialog">&#128940</button>
                      </div>`;
            modal.insertAdjacentHTML('beforeend', closeButtonHtml);
            modal.showModal(); // Show modal with menu details
            const closeButton = document.getElementById('close-dialog') as HTMLButtonElement;
            closeButton && closeButton.addEventListener('click', () => {
              modal.close();
            });
          } catch (error) {
            modal.innerHTML = errorModal((error as Error).message);
            console.log(error);
            modal.showModal();
          }
        });
      }

      // Add click event listener for favorite button if the restaurant is not already a favorite
      const favoriteBtn = document.getElementById('favorite-button') as HTMLButtonElement;
      if (favoriteBtn && !isFavorite) {
        favoriteBtn.addEventListener('click', async () => {
          await addRestaurantToFavorites(restaurant._id);

          // Immediately update the button appearance after favoriting
          favoriteBtn.textContent = 'Favorited'; // Update button text
          favoriteBtn.disabled = true; // Optionally disable the button
          favoriteBtn.classList.add('favorited'); // Optionally add a CSS class for styling

          // Re-render the popup content to reflect that the restaurant is now favorited
          marker.setPopupContent(popupContent(restaurant, true));
        });
      }
    });
  });
};



const locate = async (pos: GeolocationPosition) => {
  try {
    const crd = pos.coords;
    const restaurants = await fetchData<Restaurant[]>(apiUrl + '/restaurants');
    console.log(restaurants);

    let closestRestaurant: Restaurant | null = null; // Initialize as null
    let shortestDistance = Infinity;

    // Calculate closest restaurant
    restaurants.forEach((restaurant) => {
      const [lon, lat] = restaurant.location.coordinates;
      const distance = calculateDistance(crd.latitude, crd.longitude, lat, lon);

      if (distance < shortestDistance) {
        shortestDistance = distance;
        closestRestaurant = restaurant; // Assign closest restaurant
      }
    });

    // Populate City Dropdown
    populateCityDropdown(restaurants);
    populateCompanyDropdown(restaurants);

    // Create markers, passing the closest restaurant for highlighting
    if (closestRestaurant) {
      createMarkers(restaurants, closestRestaurant); // Now closestRestaurant will be assigned
    } else {
      createMarkers(restaurants); // No closest restaurant found
    }

    nearestButton &&
      nearestButton.addEventListener('click', () => {
        if (
          closestRestaurant &&
          closestRestaurant.location &&
          closestRestaurant.location.coordinates
        ) {
          const [lon, lat] = closestRestaurant.location.coordinates;
          const zoom = 16;

          map.setView([lat, lon], zoom);
        } else {
          console.log('No closest restaurant found, check gps permissions');
        }
      });

    // Filter restaurants by city when dropdown changes
    const cityDropdown = document.getElementById(
      'city-selector'
    ) as HTMLSelectElement;
    cityDropdown &&
      cityDropdown.addEventListener('change', () => {
        const selectedCity = cityDropdown.value;
        const cityRestaurants = selectedCity
          ? restaurants.filter((restaurant) => restaurant.city === selectedCity)
          : restaurants;
        const [lon, lat] = cityRestaurants[0].location.coordinates;
        map.setView([lat, lon], 10); // Zoom to city
        clearMarkers(map, markers);
        createMarkers(cityRestaurants, closestRestaurant); // Keep highlighting the closest restaurant
      });

    const companyDropdown = document.getElementById(
      'company-selector'
    ) as HTMLSelectElement;
    companyDropdown &&
      companyDropdown.addEventListener('change', () => {
        const selectedCompany = companyDropdown.value;
        const companyRestaurants = selectedCompany
          ? restaurants.filter(
              (restaurant) => restaurant.company === selectedCompany
            )
          : restaurants;
        clearMarkers(map, markers);
        createMarkers(companyRestaurants, closestRestaurant); // Keep highlighting the closest restaurant
      });
  } catch (error) {
    modal.innerHTML = errorModal((error as Error).message);
    modal.showModal();
  }
};

const openLogIn = document.querySelector('#log-in') as HTMLButtonElement;
openLogIn &&
  openLogIn.addEventListener('click', () => {
    if (isLoggedIn()) {
      // User is logged in, show a logout option or simply log out directly

      localStorage.removeItem('token');
      location.reload(); // Optional: refresh page to reflect logged-out state

      // Replace login button with logout button

    } else {
      // Show login dialog
      const dialog = document.querySelector('#user-dialog') as HTMLDialogElement;
      const backdrop = document.getElementById('backdrop') as HTMLElement;
      if (backdrop && dialog) {
        backdrop.style.display = 'block';
        dialog.showModal();
        document.body.classList.add('no-scroll');
      }
    }
});



const closeLogIn = document.querySelector('#close-btn') as HTMLButtonElement;
closeLogIn &&
  closeLogIn.addEventListener('click', (event) => {
    event.preventDefault();
    const dialog = document.querySelector('#user-dialog') as HTMLDialogElement;
    const backdrop = document.getElementById('backdrop') as HTMLElement;

    if (dialog && backdrop) {
      backdrop.style.display = 'none';
      dialog.close();
      document.body.classList.remove('no-scroll');
    }

    updateLoginButton(); // Update button appearance after dialog close
});

const userDialog = document.querySelector('#user-dialog') as HTMLDialogElement;
userDialog &&
  userDialog.addEventListener('close', () => {
    const backdrop = document.getElementById('backdrop') as HTMLElement;
    if (backdrop) {
      backdrop.style.display = 'none';
    }
    document.body.classList.remove('no-scroll');
    updateLoginButton();
});

const showPasswordButton = document.querySelector('#show-password') as HTMLButtonElement;
showPasswordButton && showPasswordButton.addEventListener('click', showPassword);

document.addEventListener('DOMContentLoaded', () => {
  updateLoginButton();
  const registerToggle = document.getElementById('register-toggle') as HTMLInputElement;
  const loginToggle = document.getElementById('login-toggle') as HTMLInputElement;
  const emailContainer = document.getElementById('email-container') as HTMLDivElement;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
  const errorMsg = document.getElementById('error-msg') as HTMLDivElement; // Error message container
  const successMsg = document.getElementById('success-msg') as HTMLDivElement; // Success message container
  let isRegistering = registerToggle && registerToggle.checked;

  registerToggle.addEventListener('change', () => {
    emailInput.disabled = false;
    emailContainer.style.display = 'block';
    submitBtn.textContent = 'Register';
    isRegistering = true;
  });

  loginToggle.addEventListener('change', () => {
    emailInput.disabled = true;
    emailContainer.style.display = 'none';
    submitBtn.textContent = 'Login';
    isRegistering = false;
  });

  loginForm && loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMsg.textContent = ''; // Clear previous error message
    successMsg.textContent = ''; // Clear previous success message

    try {
      if (isRegistering) {
        await register();
        successMsg.textContent = 'User created! Please log in.';
        successMsg.style.color = 'green'; // Style it as green
      } else {
        const loginResponse = await login();
        console.log(loginResponse);
        localStorage.setItem('token', loginResponse.token);
      }
    } catch (error) {
      // Display different error messages for login and registration failures
      if (isRegistering) {
        errorMsg.textContent = 'Username or email taken.';
      } else {
        errorMsg.textContent = 'Login failed. Check credentials.';
      }

      errorMsg.style.color = 'red'; // Style it as red
      console.error((error as Error).message);
    }
  });
});


// Login function
const login = async (): Promise<LoginUser> => {
  if (!usernameInput || !passwordInput) {
    throw new Error('Form not found');
  }
  const username = usernameInput.value;
  const password = passwordInput.value;
  const modal = document.querySelector('.user-dialog') as HTMLDialogElement;

  const data = { username, password };

  const options: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };

  const response = await fetchData<LoginUser>(apiUrl + '/auth/login', options);

  if (response && response.token) {
    localStorage.setItem('token', response.token);
    localStorage.setItem('favoriteRestaurant', response.data.favoriteRestaurant);
    console.log('User logged in, token saved to LS');
    console.log(response.data);

    // Clear input fields and close the modal
    usernameInput.value = '';
    passwordInput.value = '';
    modal && modal.close();

    return response;
  } else {
    throw new Error('Login failed. Invalid credentials.');
  }
};

// Register function
const register = async (): Promise<User> => {
  const username = usernameInput.value;
  const password = passwordInput.value;
  const email = emailInput.value;

  const data = { username, password, email };

  const options: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };

  const registerResponse = await fetchData<User>(apiUrl + '/users', options);

  if (registerResponse) {
    console.log('User registered successfully');

    // Clear input fields and close the modal
    usernameInput.value = '';
    passwordInput.value = '';
    emailInput.value = '';

    return registerResponse;
  } else {
    throw new Error('Registration failed.');
  }
};

const showFavoriteButton = document.getElementById('show-favorite') as HTMLButtonElement;

showFavoriteButton &&
  showFavoriteButton.addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // If the user is not logged in, open the login dialog
      const dialog = document.querySelector('#user-dialog') as HTMLDialogElement;
      const backdrop = document.getElementById('backdrop') as HTMLElement;
      if (backdrop && dialog) {
        backdrop.style.display = 'block';
        dialog.showModal();
        document.body.classList.add('no-scroll');
      }
      return; // Stop further execution until the user is logged in
    }

    try {
      // Fetch user details to get the favorite restaurant ID
      const userResponse = await fetchData<getFavorite>(`${apiUrl}/users/token`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(userResponse);

      const favoriteRestaurantId = userResponse.favouriteRestaurant;
      if (!favoriteRestaurantId) {
        console.log('No favorite restaurant found.');
        return;
      }

      // Fetch the favorite restaurant details using the ID from the response
      const favoriteRestaurant = await fetchData<Restaurant>(
        `${apiUrl}/restaurants/${favoriteRestaurantId}`
      );

      if (favoriteRestaurant && favoriteRestaurant.location) {
        const [lon, lat] = favoriteRestaurant.location.coordinates;

        // Set the map view to the favorite location
        map.setView([lat, lon], 9);

        // open the popup for the restaurant
        const favoriteMarker = L.marker([lat, lon], { icon: restaurantIcon }).addTo(map);
        const popupHTML = popupContent(favoriteRestaurant, true);
        favoriteMarker.bindPopup(popupHTML, { className: 'custom-popup' }).openPopup();
      } else {
        console.log('Favorite restaurant details not found.');
      }
    } catch (error) {
      console.error('Failed to fetch favorite restaurant details:', error);
      modal.innerHTML = errorModal((error as Error).message);
      modal.showModal();
    }
});



navigator.geolocation.getCurrentPosition(locate);
