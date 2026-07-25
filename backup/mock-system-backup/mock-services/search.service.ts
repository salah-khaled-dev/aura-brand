import { ProductService } from './product.service';
import { OrderService } from './order.service';
import { CustomerService } from './customer.service';
import { CategoryService } from './category.service';
import { CollectionService } from './collection.service';
import { CouponService } from './coupon.service';
import { JournalService } from './journal.service';
import { ReviewService } from './review.service';
import { MediaService } from './media.service';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'product' | 'order' | 'customer' | 'category' | 'collection' | 'coupon' | 'article' | 'review' | 'media' | 'cms';
  url: string;
}

export interface GroupedSearchResults {
  products: SearchResultItem[];
  orders: SearchResultItem[];
  customers: SearchResultItem[];
  categories: SearchResultItem[];
  collections: SearchResultItem[];
  coupons: SearchResultItem[];
  articles: SearchResultItem[];
  reviews: SearchResultItem[];
  media: SearchResultItem[];
  cms: SearchResultItem[];
}

export const SearchService = {
  async globalSearch(query: string): Promise<GroupedSearchResults> {
    if (!query || query.trim().length < 2) {
      return {
        products: [], orders: [], customers: [], categories: [],
        collections: [], coupons: [], articles: [], reviews: [], media: [], cms: []
      };
    }

    const q = query.toLowerCase().trim();

    // Fire all searches in parallel (mimicking microservices / fast RPC)
    const [
      products, orders, customers, categories, collections, 
      coupons, articles, reviews, media
    ] = await Promise.all([
      ProductService.getProducts(), // Could pass { search: q } if implemented
      OrderService.getOrders(),
      CustomerService.getCustomers({ search: q }),
      CategoryService.getCategories(),
      CollectionService.getCollections(),
      CouponService.getCoupons(),
      JournalService.getArticles(),
      ReviewService.getReviews(),
      MediaService.getMedia({ search: q })
    ]);

    // Manual filtering for services that don't yet support {search: q} natively in Mock
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    const filteredOrders = orders.filter(o => o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q));
    const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(q));
    const filteredCollections = collections.filter(c => c.name.toLowerCase().includes(q));
    const filteredCoupons = coupons.filter(c => c.code.toLowerCase().includes(q));
    const filteredArticles = articles.filter(a => a.title.toLowerCase().includes(q));
    const filteredReviews = reviews.filter(r => r.customerName.toLowerCase().includes(q) || r.productId.toLowerCase().includes(q));

    const cmsPages = [
      { id: 'cms-home', title: 'الصفحة الرئيسية', url: '/admin/website/home' },
      { id: 'cms-pages', title: 'الصفحات والمحتوى', url: '/admin/website/pages' },
      { id: 'cms-collections', title: 'عرض التشكيلات على الموقع', url: '/admin/website/collections' },
      { id: 'cms-banners', title: 'البنرات', url: '/admin/website/banners' },
      { id: 'cms-nav', title: 'القوائم والروابط', url: '/admin/website/navigation' },
      { id: 'cms-media', title: 'مكتبة الوسائط', url: '/admin/website/media' },
      { id: 'cms-seo', title: 'محركات البحث (SEO)', url: '/admin/website/seo' },
      { id: 'cms-redirects', title: 'التحويلات', url: '/admin/website/redirects' },
      { id: 'cms-appearance', title: 'المظهر والتصميم', url: '/admin/website/appearance' },
      { id: 'cms-footer', title: 'تذييل الصفحة', url: '/admin/website/footer' },
      { id: 'cms-store', title: 'إعدادات المتجر', url: '/admin/website/settings' },
    ];
    const filteredCms = cmsPages.filter(c => c.title.toLowerCase().includes(q));

    return {
      products: filteredProducts.map(p => ({ id: p.id, title: p.name, subtitle: p.sku, type: 'product', url: `/admin/products/${p.id}` })),
      orders: filteredOrders.map(o => ({ id: o.id, title: o.orderNumber, subtitle: o.customerName, type: 'order', url: `/admin/orders/${o.id}` })),
      customers: customers.map(c => ({ id: c.id, title: c.fullName, subtitle: c.email, type: 'customer', url: `/admin/customers/${c.id}` })),
      categories: filteredCategories.map(c => ({ id: c.id, title: c.name, type: 'category', url: `/admin/categories` })),
      collections: filteredCollections.map(c => ({ id: c.id, title: c.name, type: 'collection', url: `/admin/collections` })),
      coupons: filteredCoupons.map(c => ({ id: c.id, title: c.code, type: 'coupon', url: `/admin/coupons` })),
      articles: filteredArticles.map(a => ({ id: a.id, title: a.title, type: 'article', url: `/admin/journal` })),
      reviews: filteredReviews.map(r => ({ id: r.id, title: `تقييم من ${r.customerName}`, type: 'review', url: `/admin/reviews` })),
      media: media.map(m => ({ id: m.id, title: m.originalName, type: 'media', url: `/admin/website/media` })),
      cms: filteredCms.map(c => ({ id: c.id, title: c.title, type: 'cms', url: c.url })),
    };
  }
};
