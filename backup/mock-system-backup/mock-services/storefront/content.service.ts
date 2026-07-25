import { mockStorage } from '@/lib/storage/mock-storage';
import { eventBus } from '@/lib/events/EventBus';

export interface ContentBlock {
  id: string;
  group: 'general' | 'checkout' | 'order_tracking' | 'emails' | 'pages';
  key: string;
  value: string;
  description: string;
}

let mockContent: ContentBlock[] = [
  // ── Order tracking status messages ──────────────────────────────────
  { id: 'cnt-3', group: 'order_tracking', key: 'status_received',  value: 'تم استلام طلبك بنجاح — يجهزه فريق أورا بعناية.',           description: 'رسالة: تم الاستلام' },
  { id: 'cnt-4', group: 'order_tracking', key: 'status_processing', value: 'طلبك قيد التحضير في أتيلييه أورا — الخياطة والتغليف الفاخر.',  description: 'رسالة: قيد التحضير' },
  { id: 'cnt-5', group: 'order_tracking', key: 'status_shipped',   value: 'تم شحن طلبك وهو في طريقه إليكِ — يصلكِ خلال 2-5 أيام عمل.', description: 'رسالة: تم الشحن' },
  { id: 'cnt-6', group: 'order_tracking', key: 'status_delivered', value: 'وصل طلبك بنجاح! نتمنى أن تستمتعي بكل قطعة من دار أورا.',       description: 'رسالة: تم التسليم' },

  // ── General ──────────────────────────────────────────────────────────
  { id: 'cnt-7', group: 'general', key: 'announcement_bar', value: 'الشحن مجاني لجميع محافظات مصر | التغليف الفاخر مجاني', description: 'نص شريط الإعلان العلوي' },

  // ── Pages — About ────────────────────────────────────────────────────
  { id: 'cnt-about-hero-title',       group: 'pages', key: 'about_hero_title',       value: 'قصتنا',                                                                                                                                  description: 'صفحة من نحن — عنوان البطل' },
  { id: 'cnt-about-hero-subtitle',    group: 'pages', key: 'about_hero_subtitle',    value: 'مجموعات حصرية تُصاغ يدوياً للمرأة التي تثق بحضورها وتتحرك بأناقتها الهادئة.',                                                          description: 'صفحة من نحن — وصف البطل' },
  { id: 'cnt-about-phil-title',       group: 'pages', key: 'about_phil_title',       value: 'الملابس هالة صامتة تروي حضوركِ الفخم',                                                                                                   description: 'صفحة من نحن — عنوان فلسفة الدار' },
  { id: 'cnt-about-phil-text',        group: 'pages', key: 'about_phil_text',        value: 'نحن نؤمن في أورا بأن الثوب ليس مجرد غطاء زينة خارجي، بل هو تجسيد ملموس لشخصيتكِ وقوتكِ الأنثوية المهيبة. نحن نتفادى خطوط الإنتاج السريع والاستنساخ التجاري، لنصوغ قوالب هندسية راقية من الكتان المعالج والحرير الخالص. كل تصميم نبدأ برسمه يعبّر عن لوحة فنية مستقلة تُنفذ بحرفية استثنائية لتدوم وتُروى عبر الأجيال.', description: 'صفحة من نحن — نص فلسفة الدار' },
  { id: 'cnt-about-craft-title',      group: 'pages', key: 'about_craft_title',      value: 'تفاصيل تُحاك بعناية في أتيلييه الجيزة',                                                                                                  description: 'صفحة من نحن — عنوان الحرفية' },
  { id: 'cnt-about-craft-text',       group: 'pages', key: 'about_craft_text',       value: 'من اختيار خيوط الكتان البلجيكي الطبيعي المعالج بنعومة الكشمير، إلى اختيار أورجانزا الحرير الفرنسي، نلتزم في دار أورا بأعلى معايير جودة المواد الخام. يتم رسم وتفصيل كل قطعة يدوياً في أتيلييه الجيزة بمصر، في إطار خياطة بطيئة ومدروسة تضمن إخراج كل غرزة بدقة استثنائية وعمر افتراضي يدوم طويلاً، مما يجعل من ثوبكِ إرثاً حقيقياً.', description: 'صفحة من نحن — نص الحرفية' },
  { id: 'cnt-about-vision-quote',     group: 'pages', key: 'about_vision_quote',     value: 'رؤيتنا أن نقدم للمرأة قطعًا تعكس شخصيتها وتمنحها حضورًا استثنائيًا',                                                                   description: 'صفحة من نحن — اقتباس الرؤية' },
  { id: 'cnt-about-vision-attr',      group: 'pages', key: 'about_vision_attr',      value: 'منسقو ومصممو أتيلييه أورا الجيزة',                                                                                                        description: 'صفحة من نحن — نسب الاقتباس' },
  { id: 'cnt-about-cta-title',        group: 'pages', key: 'about_cta_title',        value: 'تصفحي المتجر',                                                                                                                              description: 'صفحة من نحن — عنوان قسم الدعوة' },
  { id: 'cnt-about-cta-text',         group: 'pages', key: 'about_cta_text',         value: 'استكشفي أزياء أورا الفاخرة المنسوجة يدوياً بمقاييس الكوتور الحصرية ومستويات الخياطة الفاخرة.',                                          description: 'صفحة من نحن — نص قسم الدعوة' },
  { id: 'cnt-about-cta-button',       group: 'pages', key: 'about_cta_button',       value: 'زيارة المتجر الكوتور',                                                                                                                     description: 'صفحة من نحن — نص زر الدعوة' },

  // ── Pages — Tracking ─────────────────────────────────────────────────
  { id: 'cnt-tracking-hero-title',    group: 'pages', key: 'tracking_hero_title',    value: 'تتبع طلبكِ',                                                                                                                                description: 'صفحة تتبع الطلب — عنوان البطل' },
  { id: 'cnt-tracking-hero-label',    group: 'pages', key: 'tracking_hero_label',    value: 'مسار مقتنياتكِ',                                                                                                                            description: 'صفحة تتبع الطلب — تصنيف البطل' },
  { id: 'cnt-tracking-hero-subtitle', group: 'pages', key: 'tracking_hero_subtitle', value: 'تابعي رحلة تصميم وتجهيز قطع أورا الفاخرة خطوة بخطوة، بدءاً من القص والأشغال اليدوية بالأتيلييه وحتى وصول المندوب لباب منزلكِ.',        description: 'صفحة تتبع الطلب — وصف البطل' },
  { id: 'cnt-tracking-support-title', group: 'pages', key: 'tracking_support_title', value: 'هل تحتاجين إلى مساعدة؟',                                                                                                                   description: 'صفحة تتبع الطلب — عنوان قسم الدعم' },
  { id: 'cnt-tracking-support-text',  group: 'pages', key: 'tracking_support_text',  value: 'منسقو أتيلييه أورا جاهزون للتواصل معكِ وتحديثكِ بتفاصيل المقاسات الدقيقة أو حالة التحويل عبر الواتساب.',                                description: 'صفحة تتبع الطلب — نص قسم الدعم' },
  { id: 'cnt-tracking-support-btn',   group: 'pages', key: 'tracking_support_btn',   value: 'تواصلي معنا',                                                                                                                               description: 'صفحة تتبع الطلب — نص زر الدعم' },

  // ── Pages — Reviews ──────────────────────────────────────────────────
  { id: 'cnt-reviews-hero-label',     group: 'pages', key: 'reviews_hero_label',     value: 'صوت عميلاتنا',                                                                                                                             description: 'صفحة التقييمات — تصنيف البطل' },
  { id: 'cnt-reviews-hero-title',     group: 'pages', key: 'reviews_hero_title',     value: 'آراء عملائنا',                                                                                                                             description: 'صفحة التقييمات — عنوان البطل' },
  { id: 'cnt-reviews-hero-subtitle',  group: 'pages', key: 'reviews_hero_subtitle',  value: 'تجارب حقيقية من عميلات دار أورا — كلمات صادقة تعكس شغفنا بالحرفية والتميز.',                                                            description: 'صفحة التقييمات — وصف البطل' },

  // ── Pages — Wishlist ─────────────────────────────────────────────────
  { id: 'cnt-wishlist-empty-title',   group: 'pages', key: 'wishlist_empty_title',   value: 'مفضلتكِ فارغة',                                                                                                                            description: 'صفحة المفضلة — عنوان الحالة الفارغة' },
  { id: 'cnt-wishlist-empty-text',    group: 'pages', key: 'wishlist_empty_text',    value: 'ابدئي بحفظ القطع المفضلة لديكِ بالضغط على رمز القلب أثناء التصفح',                                                                       description: 'صفحة المفضلة — نص الحالة الفارغة' },
  { id: 'cnt-wishlist-empty-btn',     group: 'pages', key: 'wishlist_empty_btn',     value: 'زيارة المتجر الكوتور',                                                                                                                     description: 'صفحة المفضلة — نص زر الحالة الفارغة' },

  // ── Pages — Cart ─────────────────────────────────────────────────────
  { id: 'cnt-cart-empty-title',       group: 'pages', key: 'cart_empty_title',       value: 'حقيبتكِ فارغة حالياً',                                                                                                                    description: 'صفحة السلة — عنوان الحالة الفارغة' },
  { id: 'cnt-cart-empty-text',        group: 'pages', key: 'cart_empty_text',        value: 'تصفحي الكولكشن واختاري قطعكِ المفضلة.',                                                                                                   description: 'صفحة السلة — نص الحالة الفارغة' },
  { id: 'cnt-cart-empty-btn',         group: 'pages', key: 'cart_empty_btn',         value: 'زيارة المتجر الكوتور',                                                                                                                     description: 'صفحة السلة — نص زر الحالة الفارغة' },
];

mockContent = mockStorage.read('storefront.content', mockContent);

export const ContentService = {
  async getAllContent(): Promise<ContentBlock[]> {
    return [...mockContent];
  },

  async getContentByGroup(group: ContentBlock['group']): Promise<ContentBlock[]> {
    return mockContent.filter(c => c.group === group);
  },

  async getByKey(key: string): Promise<string | null> {
    return mockContent.find(c => c.key === key)?.value ?? null;
  },

  async updateContent(id: string, value: string): Promise<ContentBlock> {
    const idx = mockContent.findIndex(c => c.id === id);
    if (idx > -1) {
      mockContent[idx] = { ...mockContent[idx], value };
      mockStorage.write('storefront.content', mockContent);
      eventBus.emit('website.changed', { area: 'content' });
      return mockContent[idx];
    }
    throw new Error('Content not found');
  },
};
