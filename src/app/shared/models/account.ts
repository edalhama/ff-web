export type UserRole = 'admin' | 'user';

/** Cuenta de la sesión (`GET /account`). */
export interface Account {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  lang: string;
  active: boolean;
  last_login_at: string | null;
}
