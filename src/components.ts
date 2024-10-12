import { DailyMenu, WeeklyMenu} from "./types/Menu";
import { Restaurant } from "./types/Restaurant";

const restaurantIcon = L.icon({ // Default icon for restaurants
  iconUrl: './img/restaurant-icon.png',
  iconSize: [120, 90],
  iconAnchor: [60, 100],
  popupAnchor: [0, -80],
})

const restaurantIconHighlighted = L.icon({ // Highlighted icon for favorite restaurants
  iconUrl: './img/restaurant-icon-highlight.png',
  iconSize: [120, 90],
  iconAnchor: [60, 100],
  popupAnchor: [0, -80],
});


// Function to create the modal content for a restaurant
const restaurantModal = (restaurant: Restaurant, menu: DailyMenu | WeeklyMenu, menuType: 'daily' | 'weekly') => {
  const { name, address, city, postalCode, phone, company } = restaurant;
  let html = `
    <h3>${name}</h3>
    <p><strong>Company:</strong> ${company}</p>
    <p><strong>Address:</strong> ${address}, ${postalCode} ${city}</p>
    <p><strong>Phone:</strong> ${phone ?? 'N/A'}</p>
  `;

  if (menuType === 'daily') { // Daily menu
    html += `
      <h4>Today's Menu: </h4>
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
      (menu as DailyMenu).courses.forEach((course) => {
        const { name, diets, price } = course;
        html += `
          <tr class="modal-row">
            <td data-label="Course">${name}</td>
            <td data-label="Diet">${diets ?? ' - '}</td>
            <td data-label="Price">${price ?? ' - '}</td>
          </tr>
        `;
      });
    } else {
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

  } else if (menuType === 'weekly') { // Weekly menu
    html += `<h4>This Week's Menu</h4>`;

    const weeklyMenu = menu as WeeklyMenu;

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

        courses.forEach((course) => { // Loop through courses
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
      } else {
        html += `<p><strong>${date}:</strong> No courses available</p>`;
      }
    });
  }

  return html;
};



const errorModal = (message: string) => { // Error modal
  const html = `
        <div class="error-modal">
        <h3>Alert!</h3>
        <p>${message}</p>
        </div>
        `;
  return html;
};

const popupContent = (restaurant: Restaurant, isFavorite: boolean): string => { // Popup content for markers
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


const logoutModal = () => { // Logout modal
  const html = `
    <div class="logout-modal">
    <div class="logout-modal-content">
      <h3>Logout?</h3>
      <div class="log-out-image"></div>
      <p>Are you sure you want to logout?</p>
      <div class="logout-buttons">
        <button id="logout-yes">Confirm</button>
        <button id="logout-no">Cancel</button>
      </div>
      </div>
    </div>
  `;
  return html;
}

export {restaurantModal, errorModal, popupContent, restaurantIcon, restaurantIconHighlighted, logoutModal};
