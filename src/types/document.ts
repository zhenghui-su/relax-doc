export type DocumentListItem = {
  id: string;
  title: string;
  parentId: string | null;
  updatedAt: Date;
  createdAt: Date;
  isArchived: boolean;
  isFavorite: boolean;
  role: "owner" | "editor" | "viewer";
};
