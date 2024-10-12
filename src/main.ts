import * as L from 'leaflet';
import {
  errorModal,
  restaurantModal,
  popupContent,
  restaurantIcon,
  restaurantIconHighlighted,
  logoutModal
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
import { LoginUser, User, getFavorite} from './types/credentials';

let map: L.Map;
let markers: L.Marker[] = [];
const nearestButton = document.getElementById('nearest-restaurant') as HTMLButtonElement;
const loginForm = document.querySelector('#dialog-form') as HTMLFormElement;
const usernameInput = document.querySelector('#username') as HTMLInputElement;
const passwordInput = document.querySelector('#password') as HTMLInputElement;
const emailInput = document.querySelector('#email') as HTMLInputElement;
const closeModal = document.querySelector('.close-modal') as HTMLDivElement;
const modal = document.querySelector('dialog') as HTMLDialogElement;
const logoutDialog = document.querySelector('dialog') as HTMLDialogElement;
const backdrop = document.getElementById('backdrop') as HTMLElement;

if (!modal) {
  throw new Error('Modal not found');
}
closeModal?.addEventListener('click', () => {
  modal.close();
});


const initMap = async (color: string) => { // initialize the map with the color and the user location
  try {
    const userLocation = await getUserLocation();
    console.log(userLocation);

    const mapOptions = {
      center: L.latLng(userLocation[0], userLocation[1]),
      zoom: 14,
    };
    map = L.map('map', mapOptions);

    L.control.scale().addTo(map);


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

initMap('dark'); // Initialize the map with the dark theme

closeModal && closeModal.addEventListener('click', () => {
    modal.close();
 });

 const createMarkers = ( // create markers for the restaurants
  restaurants: Restaurant[],
  highlightClosest?: Restaurant | null
) => {
  clearMarkers(map, markers);

  const favoriteRestaurantId = localStorage.getItem('favoriteRestaurant'); // Get the favorite restaurant ID from localStorage

  restaurants.forEach((restaurant) => {
    const [lon, lat] = restaurant.location.coordinates;
    const icon =
      highlightClosest && restaurant._id === highlightClosest._id // Highlight the closest restaurant
        ? restaurantIconHighlighted
        : restaurantIcon;
    const marker = L.marker([lat, lon], { icon }).addTo(map);
    markers.push(marker);

    const isFavorite = favoriteRestaurantId === restaurant._id;
    const popupHTML = popupContent(restaurant, isFavorite);
    marker.bindPopup(popupHTML, { // Create a popup for each marker
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

          } catch (error) { // Display error message if fetching the menu fails
            modal.innerHTML = errorModal((error as Error).message);
            const closeButtonHtml = `
                      <div class="close-modal">
                        <button id="close-dialog">&#128940</button>
                      </div>`;
            modal.insertAdjacentHTML('beforeend', closeButtonHtml);
            const closeButton = document.getElementById('close-dialog') as HTMLButtonElement;
            closeButton && closeButton.addEventListener('click', () => {
              modal.close();
            });
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
          // Re-render the popup content to show that the restaurant is now a favorite
          if (isLoggedIn()) {
            marker.setPopupContent(popupContent(restaurant, true));
          } else {
            userDialog.showModal();
          }
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

    // Populate City Dropdown and Company Dropdown for filtering
    populateCityDropdown(restaurants);
    populateCompanyDropdown(restaurants);

    // Create markers, passing the closest restaurant for highlighting
    if (closestRestaurant) {
      createMarkers(restaurants, closestRestaurant); // Now closestRestaurant will be assigned
    } else {
      createMarkers(restaurants); // No closest restaurant found
    }


    nearestButton?.addEventListener('click', () => {
        if (
          closestRestaurant &&
          closestRestaurant.location &&
          closestRestaurant.location.coordinates
        ) {
          const [lon, lat] = closestRestaurant.location.coordinates;
          const zoom = 16;

          map.setView([lat, lon], zoom); // user clicks the button --> set view to the closest restaurant
        } else {
          console.log('No closest restaurant found, check gps permissions');
        }
      });

    // Filter restaurants by city when dropdown changes
    const cityDropdown = document.getElementById(
      'city-selector'
    ) as HTMLSelectElement;

    cityDropdown?.addEventListener('change', () => {
        const selectedCity = cityDropdown.value;
        const cityRestaurants = selectedCity
          ? restaurants.filter((restaurant) => restaurant.city === selectedCity)
          : restaurants;
        const [lon, lat] = cityRestaurants[0].location.coordinates; // Get the first restaurant's coordinates to zoom to city
        map.setView([lat, lon], 10); // Zoom to city with a wider view to show all restaurants
        clearMarkers(map, markers);
        createMarkers(cityRestaurants, closestRestaurant); // Keep highlighting the closest restaurant
      });

    const companyDropdown = document.getElementById(
      'company-selector'
    ) as HTMLSelectElement;

    companyDropdown?.addEventListener('change', () => {
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
    modal.innerHTML = errorModal("Couldn't fetch restaurants. Check your internet or VPN connection."); // Display error message
    const closeButtonHtml = `
                      <div class="close-modal">
                        <button id="close-dialog">&#128940</button>
                      </div>`;
    modal.insertAdjacentHTML('beforeend', closeButtonHtml);
    const closeButton = document.getElementById('close-dialog') as HTMLButtonElement;
    closeButton && closeButton.addEventListener('click', () => {
      modal.close();
    });
    modal.showModal();
  }
};

const openLogIn = document.querySelector('#log-in') as HTMLButtonElement;

openLogIn?.addEventListener('click', () => {
    if (isLoggedIn()) {
      // User is logged in, show a logout option
      logoutDialog.innerHTML = ""; // Clear existing content
      const modalContent = logoutModal();
      logoutDialog.insertAdjacentHTML('beforeend', modalContent); // Insert the modal content
      logoutDialog.showModal();
      backdrop.style.display = 'block'; // Show the backdrop

      const confirmLogout = document.getElementById('logout-yes') as HTMLButtonElement;
      const cancelLogout = document.getElementById('logout-no') as HTMLButtonElement;

      // Add event listener for Confirm button
      confirmLogout?.addEventListener('click', () => {
        localStorage.removeItem('token'); // Remove token from local storage
        logoutDialog.close();
        backdrop.style.display = 'none'; // Hide the backdrop
        updateLoginButton(); // Refresh the page to update the UI
        location.reload();
      });

      // Add event listener for Cancel button
      cancelLogout?.addEventListener('click', () => {
        backdrop.style.display = 'none'; // Hide the backdrop
        logoutDialog.close(); // Simply close the modal
      });

    } else {
      // Show login dialog if user is not logged in
      const userDialog = document.querySelector('#user-dialog') as HTMLDialogElement;
      const backdrop = document.getElementById('backdrop') as HTMLElement;
      if (backdrop && userDialog) {
        backdrop.style.display = 'block';
        userDialog.showModal();
        document.body.classList.add('no-scroll');
      }
    }
});




const closeLogIn = document.querySelector('#close-btn') as HTMLButtonElement;

closeLogIn?.addEventListener('click', (event) => { // Close the login dialog
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

userDialog?.addEventListener('close', () => { // Close the login dialog and backdrop
    const backdrop = document.getElementById('backdrop') as HTMLElement;
    if (backdrop) {
      backdrop.style.display = 'none';
    }
    document.body.classList.remove('no-scroll');
    updateLoginButton();
});

const showPasswordButton = document.querySelector('#show-password') as HTMLButtonElement;
showPasswordButton?.addEventListener('click', showPassword);

document.addEventListener('DOMContentLoaded', () => { // Event listener for the login form
  updateLoginButton();
  const registerToggle = document.getElementById('register-toggle') as HTMLInputElement;
  const loginToggle = document.getElementById('login-toggle') as HTMLInputElement;
  const emailContainer = document.getElementById('email-container') as HTMLDivElement;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
  const errorMsg = document.getElementById('error-msg') as HTMLDivElement; // Error message container
  const successMsg = document.getElementById('success-msg') as HTMLDivElement; // Success message container
  let isRegistering = registerToggle && registerToggle.checked;

  registerToggle.addEventListener('change', () => { // Toggle between login and register
    emailInput.disabled = false;
    emailContainer.style.display = 'block';
    submitBtn.textContent = 'Register';
    isRegistering = true;
  });

  loginToggle.addEventListener('change', () => { // Toggle between login and register
    emailInput.disabled = true;
    emailContainer.style.display = 'none';
    submitBtn.textContent = 'Login';
    isRegistering = false;
  });

  loginForm?.addEventListener('submit', async (event) => { // Submit the form
    event.preventDefault();
    errorMsg.textContent = ''; // Clear previous error message
    successMsg.textContent = ''; // Clear previous success message

    try {
      if (isRegistering) { // Register the user
        await register();
        successMsg.textContent = 'User created! Please log in.';
        successMsg.style.color = 'green'; // Style it as green
      } else { // Log in the user
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
const login = async (): Promise<LoginUser> => { // Log in the user
  if (!usernameInput || !passwordInput) {
    throw new Error('Form not found');
  }
  const username = usernameInput.value;
  const password = passwordInput.value;
  const modal = document.querySelector('.user-dialog') as HTMLDialogElement;

  const data = { username, password };

  const options: RequestInit = { // Options for the fetch request
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };

  const response = await fetchData<LoginUser>(apiUrl + '/auth/login', options);

  if (response && response.token) { // Save the token to localStorage
    localStorage.setItem('token', response.token);
    localStorage.setItem('favoriteRestaurant', response.data.favoriteRestaurant);
    console.log('User logged in, token saved to LS');
    console.log(response.data);
    location.reload();

    // Clear input fields and close the modal
    usernameInput.value = '';
    passwordInput.value = '';
    modal && modal.close();

    return response;
  } else {
    throw new Error('Login failed. Invalid credentials.'); // Display error message
  }
};

// Register function
const register = async (): Promise<User> => { // Register the user
  const username = usernameInput.value;
  const password = passwordInput.value;
  const email = emailInput.value;

  const data = { username, password, email };

  const options: RequestInit = { // Options for the fetch request
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


showFavoriteButton?.addEventListener('click', async () => {
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
      return; // Stop executing until the user is logged in
    }

    try {
      // Fetch user to get the favorite restaurant ID
      const userResponse = await fetchData<getFavorite>(`${apiUrl}/users/token`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(userResponse);

      const favoriteRestaurantId = userResponse.favouriteRestaurant; // Get the favorite restaurant ID from the response
      if (!favoriteRestaurantId) {
        console.log('No favorite restaurant found.');
        modal.innerHTML = errorModal('No favorite restaurant has been added. Add one by clicking a marker.'); // Display error message
        const closeButtonHtml = `
                      <div class="close-modal">
                        <button id="close-dialog">&#128940</button>
                      </div>`;
        modal.insertAdjacentHTML('beforeend', closeButtonHtml);
        modal.showModal();
        const closeButton = document.getElementById('close-dialog') as HTMLButtonElement;
        closeButton && closeButton.addEventListener('click', () => {
            modal.close();});
        return;
      }

      // Fetch the favorite restaurant using the ID from the response
      const favoriteRestaurant = await fetchData<Restaurant>( // Fetch the favorite restaurant details
        `${apiUrl}/restaurants/${favoriteRestaurantId}`
      );

      if (favoriteRestaurant && favoriteRestaurant.location) {
        const [lon, lat] = favoriteRestaurant.location.coordinates;

        // Set the map view to the favorite location
        map.setView([lat, lon], 9);

        // open the popup for the restaurant
        const favoriteMarker = L.marker([lat, lon], { icon: restaurantIcon }).addTo(map); // Add a marker for the favorite restaurant
        const popupHTML = popupContent(favoriteRestaurant, true);
        favoriteMarker.bindPopup(popupHTML, { className: 'custom-popup' }).openPopup(); // Open the popup for the favorite restaurant
      } else {
        console.log('Favorite restaurant details not found.');
      }
    } catch (error) {
      console.error('Failed to fetch favorite restaurant details:', error); // Display error message
      modal.innerHTML = errorModal((error as Error).message);
      const closeButtonHtml = `
                      <div class="close-modal">
                        <button id="close-dialog">&#128940</button>
                      </div>`;
      modal.insertAdjacentHTML('beforeend', closeButtonHtml);
      const closeButton = document.getElementById('close-dialog') as HTMLButtonElement;
      closeButton && closeButton.addEventListener('click', () => {
        modal.close();});
      modal.showModal();
    }
});

const toggleSwitch = document.getElementById('checkbox') as HTMLInputElement;
const nav = document.querySelector('.main-nav') as HTMLElement;
const filterBtn = document.querySelectorAll('.filter-buttons button') as NodeListOf<HTMLButtonElement>;
const footer = document.querySelector('.foot h4') as HTMLElement;
const foot = document.querySelector('.foot') as HTMLElement;

// Function to apply the theme based on localStorage value
function applyTheme() {
  const savedTheme = localStorage.getItem('theme');
  const isLightMode = savedTheme === 'light';

  document.body.classList.toggle('light', isLightMode); // Toggle the light class
  nav.classList.toggle('light', isLightMode);
  footer.classList.toggle('light', isLightMode);
  foot.classList.toggle('light', isLightMode);
  filterBtn.forEach(button => button.classList.toggle('light', isLightMode));

  toggleSwitch.checked = isLightMode;
}

// Event listener for the toggle switch
toggleSwitch?.addEventListener('change', () => { // Change the theme based on the toggle switch
  const isLightMode = toggleSwitch.checked;

  document.body.classList.toggle('light', isLightMode);
  nav.classList.toggle('light', isLightMode);
  foot.classList.toggle('light', isLightMode);
  footer.classList.toggle('light', isLightMode);
  filterBtn.forEach(button => button.classList.toggle('light', isLightMode));

  localStorage.setItem('theme', isLightMode ? 'light' : 'dark'); // Save the theme to localStorage
});

// Apply the theme when the page loads
document.addEventListener('DOMContentLoaded', applyTheme); // Apply the theme when the page loads

// Geolocation function
navigator.geolocation.getCurrentPosition(locate);

