import { User } from "./credentials";

interface UpdateResult {
    message: string;
    data: User;
}

interface UploadResult {
    message: string;
    data: {
        avatar: string;
        _id: string;
    };
}

export type { UpdateResult, UploadResult };
