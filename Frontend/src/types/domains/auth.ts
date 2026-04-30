export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  profilePhotoUrl?: string;
  roles?: string[];
}

export interface AuthResponse {
  user: User;
}

export interface ProfileUpdatePayload {
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
}
