'use strict';

const restaurantIcon = L.icon({
    iconUrl: './src/img/restaurant-icon.png',
    iconSize: [120, 100],
    iconAnchor: [60, 100],
    popupAnchor: [0, -80],
});
const restaurantIconHighlighted = L.icon({
    iconUrl: './src/img/restaurant-icon-highlight.png',
    iconSize: [120, 100],
    iconAnchor: [60, 100],
    popupAnchor: [0, -80],
});
const restaurantModal = (restaurant, menu, menuType) => {
    const { name, address, city, postalCode, phone, company } = restaurant;
    let html = `
    <h3>${name}</h3>
    <p><strong>Company:</strong> ${company}</p>
    <p><strong>Address:</strong> ${address}, ${postalCode} ${city}</p>
    <p><strong>Phone:</strong> ${phone ?? 'N/A'}</p>
  `;
    if (menuType === 'daily') {
        html += `
      <h4>Today's Menu</h4>
      <table>
        <thead>
          <tr>
            <th>Course</th>
            <th>Diet</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
    `;
        if (menu.courses.length > 0) {
            menu.courses.forEach((course) => {
                const { name, diets, price } = course;
                html += `
          <tr class="modal-row">
            <td data-label="Course">${name}</td>
            <td data-label="Diet">${diets ?? ' - '}</td>
            <td data-label="Price">${price ?? ' - '}</td>
          </tr>
        `;
            });
        }
        else {
            html += `
        <tr>
          <td>No courses available today</td>
        </tr>
      `;
        }
        html += `
        </tbody>
      </table>
    `;
    }
    else if (menuType === 'weekly') {
        html += `<h4>This Week's Menu</h4>`;
        const weeklyMenu = menu;
        weeklyMenu.days.forEach((day) => {
            const { date, courses } = day;
            if (courses.length > 0) {
                html += `
          <h5 class="date">${date}</h5>
          <table class="modal-table">
            <thead>
              <tr class="modal-row">
                <th>Course</th>
                <th>Diet</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
        `;
                courses.forEach((course) => {
                    const { name, diets, price } = course;
                    html += `
            <tr class="weekly-tr">
              <td data-label="Course">${name}</td>
              <td data-label="Diets">${diets ?? ' - '}</td>
              <td data-label="Price">${price ?? ' - '}</td>
            </tr>
          `;
                });
                html += `
            </tbody>
          </table>
        `;
            }
            else {
                html += `<p><strong>${date}:</strong> No courses available</p>`;
            }
        });
    }
    return html;
};
const errorModal = (message) => {
    const html = `
        <div class="error-modal">
          <div class="close-modal">
            <button id="close-dialog">&#128940</button>
          </div>
        <h3>Error</h3>
        <p>${message}</p>
        <p>Please check your internet and/or VPN connection
        </div>
        `;
    return html;
};
const popupContent = (restaurant, isFavorite) => {
    const { name, address, company, city, postalCode } = restaurant;
    let content = `
    <div class="marker-popup">
    <h3>${name}</h3>
    <p>${company}</p>
    <p>${address}, ${postalCode} ${city}</p>
    <div class="popup-buttons">
    <button id="todays-menu">Today's menu</button>
    <button id="weekly-menu">Weekly menu</button>
    ${isFavorite ? '<p class="favorite-p">Favorite restaurant</p>' : '<button id="favorite-button">Add as Favorite</button>'}
    </div>
    </div>`;
    return content;
};

const apiUrl = 'https://media1.edu.metropolia.fi/restaurant/api/v1';

const fetchData = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`Error ${response.status} occured`);
    }
    const json = response.json();
    return json;
};
const getUserLocation = async () => {
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
        return [position.coords.latitude, position.coords.longitude];
    }
    catch (error) {
        throw new Error('Could not get user location');
    }
};
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};
const clearMarkers = (map, markers) => {
    markers.forEach((marker) => map.removeLayer(marker));
    markers = [];
};
const populateCityDropdown = (restaurants) => {
    const cityDropdown = document.getElementById('city-selector');
    const uniqueCities = [...new Set(restaurants.map((restaurant) => restaurant.city))];
    uniqueCities.sort((a, b) => a.localeCompare(b));
    uniqueCities.forEach((city) => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityDropdown.appendChild(option);
    });
};
const populateCompanyDropdown = (restaurants) => {
    const companyDropdown = document.getElementById('company-selector');
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
    const input = document.getElementById("password");
    if (input.type === "password") {
        input.type = "text";
    }
    else {
        input.type = "password";
    }
};
const isLoggedIn = () => {
    const token = localStorage.getItem('token');
    return token ? true : false;
};
const updateLoginButton = () => {
    const logInButton = document.getElementById('log-in');
    if (!logInButton)
        return;
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
    }
    else {
        // Update button to show login state
        logInButton.innerHTML = 'Log in <i class="fa-solid fa-right-to-bracket"></i>'; // Change icon back to login
        logInButton.title = 'Log in';
        logInButton.onclick = () => {
            // Show login dialog
            const dialog = document.querySelector('#user-dialog');
            const backdrop = document.getElementById('backdrop');
            if (backdrop && dialog) {
                backdrop.style.display = 'block';
                dialog.showModal();
                document.body.classList.add('no-scroll');
            }
        };
    }
};
const addRestaurantToFavorites = async (restaurantId) => {
    const modal = document.querySelector('dialog');
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('User not logged in');
        }
        if (!restaurantId) {
            throw new Error('Invalid restaurant ID');
        }
        const data = { favouriteRestaurant: restaurantId };
        const options = {
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
        }
        else {
            throw new Error('Failed to add restaurant to favorites');
        }
    }
    catch (error) {
        console.error('Error adding favorite restaurant:', error);
        modal.innerHTML = errorModal(error.message);
        modal.showModal();
    }
};

let map;
let markers = [];
const nearestButton = document.getElementById('nearest-restaurant');
const loginForm = document.querySelector('#dialog-form');
const usernameInput = document.querySelector('#username');
const passwordInput = document.querySelector('#password');
const emailInput = document.querySelector('#email');
const closeModal = document.querySelector('.close-modal');
const modal = document.querySelector('dialog');
if (!modal) {
    throw new Error('Modal not found');
}
closeModal?.addEventListener('click', () => {
    modal.close();
});
const initMap = async (color) => {
    try {
        const userLocation = await getUserLocation();
        console.log(userLocation);
        const mapOptions = {
            center: L.latLng(userLocation[0], userLocation[1]),
            zoom: 14,
        };
        map = L.map('map', mapOptions);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/' + color + '_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
            subdomains: 'abcd',
            maxZoom: 19,
        }).addTo(map);
    }
    catch (error) {
        console.error(error);
    }
};
initMap('dark');
closeModal && closeModal.addEventListener('click', () => {
    modal.close();
});
const createMarkers = (restaurants, highlightClosest) => {
    clearMarkers(map, markers);
    const favoriteRestaurantId = localStorage.getItem('favoriteRestaurant');
    restaurants.forEach((restaurant) => {
        const [lon, lat] = restaurant.location.coordinates;
        const icon = highlightClosest && restaurant._id === highlightClosest._id
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
                        const menu = await fetchData(apiUrl + `/restaurants/daily/${restaurant._id}/fi`);
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
                        const closeButton = document.getElementById('close-dialog');
                        closeButton && closeButton.addEventListener('click', () => {
                            modal.close();
                        });
                    }
                    catch (error) {
                        modal.innerHTML = errorModal(error.message);
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
                        const menu = await fetchData(apiUrl + `/restaurants/weekly/${restaurant._id}/fi`);
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
                        const closeButton = document.getElementById('close-dialog');
                        closeButton && closeButton.addEventListener('click', () => {
                            modal.close();
                        });
                    }
                    catch (error) {
                        modal.innerHTML = errorModal(error.message);
                        console.log(error);
                        modal.showModal();
                    }
                });
            }
            // Add click event listener for favorite button if the restaurant is not already a favorite
            const favoriteBtn = document.getElementById('favorite-button');
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
const locate = async (pos) => {
    try {
        const crd = pos.coords;
        const restaurants = await fetchData(apiUrl + '/restaurants');
        console.log(restaurants);
        let closestRestaurant = null; // Initialize as null
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
        }
        else {
            createMarkers(restaurants); // No closest restaurant found
        }
        nearestButton &&
            nearestButton.addEventListener('click', () => {
                if (closestRestaurant &&
                    closestRestaurant.location &&
                    closestRestaurant.location.coordinates) {
                    const [lon, lat] = closestRestaurant.location.coordinates;
                    const zoom = 16;
                    map.setView([lat, lon], zoom);
                }
                else {
                    console.log('No closest restaurant found, check gps permissions');
                }
            });
        // Filter restaurants by city when dropdown changes
        const cityDropdown = document.getElementById('city-selector');
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
        const companyDropdown = document.getElementById('company-selector');
        companyDropdown &&
            companyDropdown.addEventListener('change', () => {
                const selectedCompany = companyDropdown.value;
                const companyRestaurants = selectedCompany
                    ? restaurants.filter((restaurant) => restaurant.company === selectedCompany)
                    : restaurants;
                clearMarkers(map, markers);
                createMarkers(companyRestaurants, closestRestaurant); // Keep highlighting the closest restaurant
            });
    }
    catch (error) {
        modal.innerHTML = errorModal(error.message);
        modal.showModal();
    }
};
const openLogIn = document.querySelector('#log-in');
openLogIn &&
    openLogIn.addEventListener('click', () => {
        if (isLoggedIn()) {
            // User is logged in, show a logout option or simply log out directly
            localStorage.removeItem('token');
            location.reload(); // Optional: refresh page to reflect logged-out state
            // Replace login button with logout button
        }
        else {
            // Show login dialog
            const dialog = document.querySelector('#user-dialog');
            const backdrop = document.getElementById('backdrop');
            if (backdrop && dialog) {
                backdrop.style.display = 'block';
                dialog.showModal();
                document.body.classList.add('no-scroll');
            }
        }
    });
const closeLogIn = document.querySelector('#close-btn');
closeLogIn &&
    closeLogIn.addEventListener('click', (event) => {
        event.preventDefault();
        const dialog = document.querySelector('#user-dialog');
        const backdrop = document.getElementById('backdrop');
        if (dialog && backdrop) {
            backdrop.style.display = 'none';
            dialog.close();
            document.body.classList.remove('no-scroll');
        }
        updateLoginButton(); // Update button appearance after dialog close
    });
const userDialog = document.querySelector('#user-dialog');
userDialog &&
    userDialog.addEventListener('close', () => {
        const backdrop = document.getElementById('backdrop');
        if (backdrop) {
            backdrop.style.display = 'none';
        }
        document.body.classList.remove('no-scroll');
        updateLoginButton();
    });
const showPasswordButton = document.querySelector('#show-password');
showPasswordButton && showPasswordButton.addEventListener('click', showPassword);
document.addEventListener('DOMContentLoaded', () => {
    updateLoginButton();
    const registerToggle = document.getElementById('register-toggle');
    const loginToggle = document.getElementById('login-toggle');
    const emailContainer = document.getElementById('email-container');
    const submitBtn = document.getElementById('submit-btn');
    const errorMsg = document.getElementById('error-msg'); // Error message container
    const successMsg = document.getElementById('success-msg'); // Success message container
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
            }
            else {
                const loginResponse = await login();
                console.log(loginResponse);
                localStorage.setItem('token', loginResponse.token);
            }
        }
        catch (error) {
            // Display different error messages for login and registration failures
            if (isRegistering) {
                errorMsg.textContent = 'Username or email taken.';
            }
            else {
                errorMsg.textContent = 'Login failed. Check credentials.';
            }
            errorMsg.style.color = 'red'; // Style it as red
            console.error(error.message);
        }
    });
});
// Login function
const login = async () => {
    if (!usernameInput || !passwordInput) {
        throw new Error('Form not found');
    }
    const username = usernameInput.value;
    const password = passwordInput.value;
    const modal = document.querySelector('.user-dialog');
    const data = { username, password };
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    };
    const response = await fetchData(apiUrl + '/auth/login', options);
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
    }
    else {
        throw new Error('Login failed. Invalid credentials.');
    }
};
// Register function
const register = async () => {
    const username = usernameInput.value;
    const password = passwordInput.value;
    const email = emailInput.value;
    const data = { username, password, email };
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    };
    const registerResponse = await fetchData(apiUrl + '/users', options);
    if (registerResponse) {
        console.log('User registered successfully');
        // Clear input fields and close the modal
        usernameInput.value = '';
        passwordInput.value = '';
        emailInput.value = '';
        return registerResponse;
    }
    else {
        throw new Error('Registration failed.');
    }
};
const showFavoriteButton = document.getElementById('show-favorite');
showFavoriteButton &&
    showFavoriteButton.addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            // If the user is not logged in, open the login dialog
            const dialog = document.querySelector('#user-dialog');
            const backdrop = document.getElementById('backdrop');
            if (backdrop && dialog) {
                backdrop.style.display = 'block';
                dialog.showModal();
                document.body.classList.add('no-scroll');
            }
            return; // Stop further execution until the user is logged in
        }
        try {
            // Fetch user details to get the favorite restaurant ID
            const userResponse = await fetchData(`${apiUrl}/users/token`, {
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
            const favoriteRestaurant = await fetchData(`${apiUrl}/restaurants/${favoriteRestaurantId}`);
            if (favoriteRestaurant && favoriteRestaurant.location) {
                const [lon, lat] = favoriteRestaurant.location.coordinates;
                // Set the map view to the favorite location
                map.setView([lat, lon], 9);
                // open the popup for the restaurant
                const favoriteMarker = L.marker([lat, lon], { icon: restaurantIcon }).addTo(map);
                const popupHTML = popupContent(favoriteRestaurant, true);
                favoriteMarker.bindPopup(popupHTML, { className: 'custom-popup' }).openPopup();
            }
            else {
                console.log('Favorite restaurant details not found.');
            }
        }
        catch (error) {
            console.error('Failed to fetch favorite restaurant details:', error);
            modal.innerHTML = errorModal(error.message);
            modal.showModal();
        }
    });
navigator.geolocation.getCurrentPosition(locate);
