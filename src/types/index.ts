import { UserRole } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  roles?: UserRole[];
  children?: NavItem[];
}
