type Course = { // Course type
    name: string;
    price: string;
    diets: string;
}

type DailyMenu = { // Daily menu type
    courses: Course[];
}

type Day = DailyMenu & {date: string}; // Day type

type WeeklyMenu = {
    days: Day[]; // Weekly menu type
    courses: Course[];
}


export type {DailyMenu, WeeklyMenu, Course};
