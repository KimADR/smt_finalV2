// Known role literals, but allow other strings (e.g. for future roles).
// Using an intersection with {} keeps the literal types while permitting other strings.
export type Role =
  | 'ADMIN_FISCAL'
  | 'AGENT_FISCAL'
  | 'ENTREPRISE'
  | (string & {});

export interface AuthUser {
  id: number;
  email?: string;
  role: Role;
  entrepriseId?: number | null;
  entreprise?: { id: number } | null;
  // any additional fields can be present
  [k: string]: any;
}

export default AuthUser;
