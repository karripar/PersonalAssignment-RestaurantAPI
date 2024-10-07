import { DailyMenu, WeeklyMenu} from "./types/Menu";
import { Restaurant } from "./types/Restaurant";

const restaurantIcon = L.icon({
  iconUrl: './src/img/restaurant-icon.png',
  iconSize: [120, 100],
  iconAnchor: [60, 100],
  popupAnchor: [0, -80],
})

const restaurantIconHighlighted = L.icon({
  iconUrl: './src/img/restaurant-icon-highlight.png',
  iconSize: [120, 100],
  iconAnchor: [60, 100],
  popupAnchor: [0, -80],
});



const restaurantModal = (restaurant: Restaurant, menu: DailyMenu | WeeklyMenu, menuType: 'daily' | 'weekly') => {
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

  } else if (menuType === 'weekly') {
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
      } else {
        html += `<p><strong>${date}:</strong> No courses available</p>`;
      }
    });
  }

  return html;
};



const errorModal = (message: string) => {
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

const popupContent = (restaurant: Restaurant, isFavorite: boolean): string => {
  const {name, address, company, city, postalCode} = restaurant;
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
}

export {restaurantModal, errorModal, popupContent, restaurantIcon, restaurantIconHighlighted};
