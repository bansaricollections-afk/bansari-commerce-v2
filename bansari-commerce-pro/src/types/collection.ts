export interface Collection {
  id: number;

  name: string;

  slug: string;

  description?: string;

  bannerImage?: string;

  featured: boolean;

  startDate?: string;

  endDate?: string;

  createdAt: string;

  updatedAt: string;
}