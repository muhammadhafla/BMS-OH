import type { ReactNode } from 'react';

export interface Module {
  name: string;
  description: string;
  href: string;
  icon: ReactNode;
}
