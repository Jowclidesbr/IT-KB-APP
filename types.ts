export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  authorName: string;
  createdAt: string; // ISO Date string
  views: number;
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'CREATE' | 'DETAILS';