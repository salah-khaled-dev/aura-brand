export interface JournalArticle {
  slug: string;
  title: string;
  excerpt: string;
  content: string; // Markdown or simple HTML strings for now
  category: string;
  publishDate: string;
  isoDate: string;
  readTime: string;
  image: string;
}

export const journalCategories = [
  "نصائح الموضة",
  "الأقمشة والخامات",
  "تنسيق الإطلالات",
  "اتجاهات الموسم",
  "دليل الأناقة"
];

export const mockArticles: JournalArticle[] = [];
