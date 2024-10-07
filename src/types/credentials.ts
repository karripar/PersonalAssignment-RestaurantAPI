interface User {
    _id: string;
    username: string;
    favoriteRestaurant: string;
    avatar: string;
    role: string;
    email: string;
}

interface LoginUser {
    message: string;
    token: string;
    data: User;
}

interface UpdateUser {
    favouriteRestaurant: string;
  }

interface getFavorite {
    favouriteRestaurant: string;
}


export type {User, LoginUser, UpdateUser, getFavorite};
