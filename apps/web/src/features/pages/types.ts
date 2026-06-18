export interface PageChild {
  id: string;
  title: string;
  parentId: string | null;
  sortOrder: number;
  isHome: boolean;
  createdAt: string;
  updatedAt?: string;
  children?: PageChild[];
}

export interface PageItem {
  id: string;
  title: string;
  content: string | null;
  workspaceId: string;
  parentId: string | null;
  isHome: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; fullName: string };
  children: PageChild[];
}
