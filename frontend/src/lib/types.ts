export type Role = "ADMIN" | "USER";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
};

export type Car = {
  id: string;
  plate: string;
  color: string;
  brand: string;
  createdAt: string;
};

export type Driver = {
  id: string;
  name: string;
  createdAt: string;
};

export type Usage = {
  id: string;
  carId: string;
  driverId: string;
  startedAt: string;
  endedAt: string | null;
  reason: string;
  car: Pick<Car, "id" | "plate" | "color" | "brand">;
  driver: Pick<Driver, "id" | "name">;
};
