export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  roles: string[];
  patches: number[];
  createdAt?: string;
  updatedAt?: string;
}
