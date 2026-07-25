export interface SEOData {
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  slug: string;
  keywords: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

export const defaultSEOData: SEOData = {
  metaTitle: '',
  metaDescription: '',
  canonical: '',
  slug: '',
  keywords: '',
  robots: 'index, follow',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  twitterTitle: '',
  twitterDescription: '',
  twitterImage: ''
};
