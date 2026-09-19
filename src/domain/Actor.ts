import type { CampusRole } from '../campusops/contracts';

export type Actor = Readonly<{
  id: string;
  role: CampusRole;
}>;