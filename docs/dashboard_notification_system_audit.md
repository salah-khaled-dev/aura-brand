# Dashboard + Notification System Audit

**التاريخ:** 2026-07-18
**النطاق:** Admin Dashboard widgets + نظام الإشعارات المركزي + Activity Log
**ملاحظة مهمة:** أثناء هذه الجلسة، كان هناك جلسة عمل أخرى شغالة بالتوازي على نفس الريبو (نفس الوقت تقريبًا) وبنت جزء كبير من نفس الهدف — تحديدًا موديول **العملاء الحقيقي بالكامل** (`customers` + `customer_addresses` + `customer_notes`) و RPCs التحليلات (`get_top_products`, `get_customer_growth`). التقرير ده بيغطي **الاثنين مع بعض** لأنهم مكمّلين لبعض ووصلوا لنفس الهدف. لو فيه جلسة تانية لسه شغالة، ممكن حاجات هنا تتغير بعد كتابة التقرير — راجع `git status` للتأكد من آخر حالة قبل ما تطبّق أي حاجة.

---

## 1. الملخص التنفيذي

| المحور | الحالة |
|---|---|
| Dashboard widgets (عملاء، إيرادات، طلبات، مخزون، تقييمات) | ✅ كلهم Supabase حقيقي الآن |
| نظام Notifications المركزي | ✅ موجود ومربوط، مع severity + صلاحيات مختلفة للسوبر أدمن |
| Activity Log | ✅ موجود، trigger-based، يغطي كل الجداول الأساسية |
| الأحداث المطلوبة (منتجات/طلبات/عملاء/أدمن/كوبونات) | ✅ مغطاة عبر Database Triggers، ما عدا المحتوى (مقالات) |
| Business/Finance module | ❌ لسه Mock بالكامل — **متروك عمدًا خارج نطاق هذه الجلسة** |
| Journal/Content module | ❌ لسه Mock بالكامل — **متروك عمدًا خارج نطاق هذه الجلسة** |

**نسبة الاكتمال الإجمالية لما طُلب:** ~80% من النطاق المتفق عليه (Dashboard + Notifications + Activity Log + Reviews)، و0% من Business/Finance و Journal/Content (متروكين لمرحلة لاحقة بقرار صريح).

---

## 2. إيه اللي كان Mock وإتحول إيه

### Dashboard Widgets

| Widget | قبل | بعد |
|---|---|---|
| أحدث العملاء | `CustomerService` mock (`mockCustomers` + localStorage) | `customers` table حقيقي (جلسة موازية) — `CustomerService.getCustomers()` بيرجع بيانات حقيقية، مرتبة `created_at desc` |
| نظرة عامة على الإيرادات (Revenue chart) | `AnalyticsService.getRevenueData()` بيرجع `mockRevenueData` (array فاضي أصلاً) | RPC جديدة `get_revenue_series(period)` بتجمّع من `orders` الحقيقية (`status = 'delivered'`) يوم/شهر |
| إيراد اليوم/الأسبوع/الشهر | مش موجود أصلاً | RPC جديدة `get_revenue_summary()` |
| أحدث الطلبات | كان حقيقي بالفعل (`OrderService.getOrders()`) | لا تغيير — كان Supabase من قبل |
| تنبيهات المخزون | فلترة client-side على كل المنتجات بـ `stock < 10` (رقم ثابت) | `ProductService.getLowStockProducts()` — بيستخدم `low_stock_limit` الحقيقي لكل منتج |
| تقييمات جديدة | `ReviewService` mock بالكامل (`localStorage`) | جدول `reviews` جديد في Supabase، `ReviewService` بالكامل حقيقي |
| نسب النمو (trend badges) على كروت المبيعات | أرقام ثابتة مزيفة (`+12.5%`, `+8.2%`...) مكتوبة في الكود مباشرة | بتُحسب فعليًا من `AnalyticsService.getSummary()` (نمو العملاء حقيقي عبر `get_customer_growth`؛ نمو الإيراد/الطلبات/التحويل صفر بصراحة لعدم وجود بيانات كافية للمقارنة — مش أرقام مختلَقة) |
| أعلى المنتجات مبيعًا (Top Products) | Mock فاضي | RPC `get_top_products()` (جلسة موازية) |
| Finance KPIs (صافي الربح، المصروفات، رأس المال، التدفق النقدي) | Mock بالكامل | **لسه Mock** — خارج النطاق (قسم 6) |

### نظام الإشعارات

| كان | بقى |
|---|---|
| جدول `notifications` كان موجود بالـ RLS بس **مفيش أي كود بيكتب فيه أو يقرأ منه فعليًا** | جدول شغال بالكامل — كل عملية CRUD مهمة بتكتب فيه تلقائيًا عبر Database Triggers |
| `NotificationService` بيقرأ من `mockStorage`/localStorage | `NotificationService` بيقرأ من `public.notifications` الحقيقي |
| مفيش تصنيف أهمية (severity) أو خصوصية (sensitive) | أُضيف `severity` (info/warning/critical) و `sensitive` (يحدد مين يشوف الإشعار) |
| `NotificationCenter.tsx` — كومبوننت متيتم (orphaned)، مش متستخدم في أي مكان | لم يُلمس — يفضل dead code، يُنصح بحذفه في تنظيف لاحق (خارج نطاق هذه الجلسة) |

### Activity Log

| كان | بقى |
|---|---|
| مفهوم `ActivityLog` موجود بس بس في v2 scaffolding غير مستخدم (`MockActivityLogRepository` — in-memory، يتصفّر عند أي refresh) | جدول `activity_log` حقيقي، trigger-based، يسجل `before_data`/`after_data` كـ JSON على كل insert/update/delete |
| `PermissionContext.tsx` (تبديل الأدوار/impersonation) هو المستهلك الوحيد الفعلي | لا يزال يسجل عبره، بالإضافة لكل الجداول المذكورة تحت |

---

## 3. الجداول الجديدة في Supabase

| الجدول | الوصف | المصدر |
|---|---|---|
| `activity_log` | سجل تدقيق كامل (before/after) لكل تعديل — insert/update/delete/login/logout | migration `20260715000009` |
| `customers` | سجل CRM للعملاء، مُشتق تلقائيًا من الطلبات (لا يوجد نظام تسجيل دخول عملاء بعد) | migration `20260715000010` (جلسة موازية) |
| `customer_addresses`, `customer_notes` | عناوين وملاحظات داخلية لكل عميل | migration `20260715000010` |
| `reviews` | تقييمات المنتجات — قابلة للإرسال كضيف (pending فقط)، تُعتمد من الأدمن | migration `20260715000011` (هذه الجلسة) |
| — تعديلات على `notifications` | إضافة أعمدة `severity`, `sensitive`, `actor_id`, `actor_email`, `action`, `entity_type`, `entity_id`, `metadata` | migrations `20260715000009` + `20260715000011` |

**RPCs جديدة:**
- `get_revenue_summary()` — إيراد اليوم/الأسبوع/الشهر
- `get_revenue_series(p_period)` — بيانات الرسم البياني يوم/أسبوع/شهر
- `get_top_products(p_limit)` — أعلى المنتجات مبيعًا (جلسة موازية)
- `get_customer_growth()` — نمو عدد العملاء (جلسة موازية)
- `get_customer_stats(p_customer_id)` — إحصائيات عميل واحد live، بدون stored cache (جلسة موازية)
- `log_auth_event(p_action)` — تسجيل دخول/خروج (كانت موجودة، تم تحديثها لتصنّف كحدث حساس)

---

## 4. الـ RLS Policies (نظرة عامة)

القاعدة المتبعة في كل جدول جديد: RLS مفعّل دايمًا + `grant` صريح + policies باسم `<table>_<action>_<audience>`، وبتستخدم `is_admin()`/`is_super_admin()` (SQL functions موجودة أصلاً في `profiles`).

| الجدول | Guests/Anon | Authenticated (عميل) | Admin | Super Admin |
|---|---|---|---|---|
| `reviews` | قراءة `status='approved'` فقط، وإرسال تقييم جديد (`status='pending'` فقط، بدون موافقة ذاتية) | نفس صلاحيات anon | قراءة/تعديل/حذف كامل | (لا فرق إضافي) |
| `customers` / `customer_addresses` / `customer_notes` | لا وصول | لا وصول | قراءة/كتابة كاملة | (لا فرق إضافي) |
| `activity_log` | لا وصول | لا وصول | قراءة فقط | قراءة فقط (نفس الأدمن) |
| `notifications` | لا وصول | قراءة/تعديل صفوفه الشخصية فقط | قراءة الإشعارات التشغيلية (`sensitive=false`) | قراءة **كل** الإشعارات بما فيها الحساسة (`sensitive=true`) |

**نموذج ظهور الإشعارات (بالاتفاق معك في هذه الجلسة):**
- **تشغيلي (يظهر لكل الأدمنز):** طلب جديد، تغيير حالة طلب، تعديل سعر/مخزون منتج، نفاد مخزون، استخدام كوبون، تقييم جديد، عميل جديد.
- **حساس (سوبر أدمن فقط):** تسجيل دخول/خروج، إنشاء/حذف عضو فريق (أدمن)، تغيير صلاحيات، تغيير إعدادات المتجر.

---

## 5. تغطية الأحداث المطلوبة (notification + activity_log معًا)

| المجموعة | الحدث | مغطى؟ | الآلية |
|---|---|---|---|
| **المنتجات** | إنشاء/تعديل/حذف | ✅ | trigger `log_product_activity` |
| | تعديل السعر (منفصل) | ✅ | نفس الـ trigger، يفرّق `price`/`sale_price` |
| | تعديل المخزون (منفصل) | ✅ | نفس الـ trigger |
| | نفاد المخزون (severity=critical) | ✅ | نفس الـ trigger، عند `stock` من `>0` إلى `<=0` |
| **الطلبات** | إنشاء/تغيير حالة/إلغاء/تأكيد/شحن | ✅ | trigger `log_order_activity` (الحالة كلها ضمن `status` واحد، برسالة توضح الانتقال) |
| **العملاء** | إنشاء/تعديل/حذف حساب | ✅ | trigger على `customers` (`log_entity_activity('عميل','customer')`) |
| **الأدمن** | تسجيل دخول/خروج | ✅ | `log_auth_event()` RPC، حساس |
| | إنشاء/حذف Admin | ✅ | trigger `log_profile_activity` على `profiles` (staff فقط)، حساس |
| | تغيير صلاحيات | ✅ | نفس الـ trigger، يكتشف تغيّر `role`/`staff_role_key` |
| | تغيير إعدادات المتجر | ✅ | trigger على `store_settings`، حساس |
| **الكوبونات** | إنشاء/تعديل/حذف | ✅ | trigger عام على `coupons` |
| | استخدام كوبون | ✅ | جزء من `log_order_activity` — عند وجود `coupon_id` في طلب جديد |
| **المحتوى** | إنشاء/تعديل/حذف مقال | ❌ | **لا يوجد جدول `journal`/`articles` في Supabase أصلاً** — خارج النطاق المتفق عليه لهذه الجلسة |

---

## 6. المتروك عمدًا (Out of Scope بقرار صريح معك)

### Business/Finance module
لا يوجد أي جدول في Supabase لـ: الموردين (`suppliers`)، أوامر الشراء (`purchase_orders`)، المصروفات (`expenses`)، الأصول (`assets`)، الخصوم (`liabilities`)، رأس المال (`capital`). الصفحات الإدارية لكل ده موجودة لكن بتتعامل مع `mockStorage`/localStorage بالكامل عبر `business.service.ts`. هذا مشروع فرعي مستقل (~6 جداول جديدة + إعادة كتابة service كاملة) — **لم يُلمس في هذه الجلسة بناءً على اختيارك الصريح**.

### Journal/Content module
لا يوجد جدول `journal`/`articles`. `JournalService` بالكامل mock. نفس القرار — **متروك لمرحلة لاحقة**.

### Widget "قيمة المخزون" في الـ Dashboard
بيحسب `stock × costPrice`، لكن `costPrice` مش موجود كعمود حقيقي في جدول `products` — القيمة بتطلع صفر دايمًا. لم يكن من الـ 5 widgets المطلوبة صراحةً، فلم يُعالَج في هذه الجلسة — يستحق إصلاح منفصل صغير (إضافة عمود `cost_price` أو استخدام `InventoryService.getInventoryValue()` الموجودة أصلاً في `business.service.ts`).

### `NotificationCenter.tsx` و v2 repository scaffolding
كودان ميتين (dead code) موثقان مسبقًا في `docs/migration/mock-to-supabase-audit.md` — لم يُلمسا، خارج النطاق.

---

## 6.1 ملاحظة أمنية تم إصلاحها أثناء الجلسة

مراجعة أمان آلية اكتشفت إن `reviews_select_public` كانت بتسمح لأي زائر غير مسجّل (`anon`) بقراءة عمود `customer_email` (بيانات شخصية) لأي تقييم معتمد، لأن RLS بيتحكم في الصفوف مش الأعمدة. تم الإصلاح في نفس الـ migration: `anon` بقى عنده `SELECT` على أعمدة محددة فقط (بدون `customer_email`/`customer_id`)، و`authenticated` احتفظ بوصول كامل لأن كل جلسة `authenticated` في التطبيق ده هي أدمن بالضرورة (`auth.service.ts` بيرفض ويسجّل خروج أي حساب دوره مش admin/super_admin — مفيش نظام تسجيل دخول عملاء أصلاً). لو نظام حسابات العملاء اتعمل يومًا ما، الافتراض ده لازم يُعاد النظر فيه.

## 7. التحقق (Verification)

- ✅ `npm run lint` — لا أخطاء.
- ✅ `npm run build` — نجح بالكامل (75 صفحة)، بدون أخطاء TypeScript، رغم التغييرات الكبيرة المتزامنة من الجلسة الموازية.
- ⚠️ **لم يتم التحقق الوظيفي الفعلي (end-to-end) في متصفح حقيقي** — الـ migrations الجديدة (`20260715000009` إلى `20260715000012`) **لسه ما اتطبقتش على قاعدة البيانات الحية**. مفيش عندي وصول مباشر (Supabase MCP مش مفعّل، ومفيش CLI مربوط بالمشروع)، فالخطوة دي عليك:
  1. طبّق ملفات الـ migrations دي بالترتيب عبر Supabase SQL Editor أو CLI: من `20260715000009_event_driven_activity_log.sql` لحد `20260715000012_analytics_top_products.sql`.
  2. بعد التطبيق، شغّل `npx supabase gen types typescript --linked` وقارن الناتج بـ `src/lib/supabase/database.types.ts` الحالي (اتكتب يدويًا ليطابق الـ SQL، لكن لازم يتأكد بمصدر حقيقي).
  3. جرّب: تسجيل دخول كأدمن عادي وكسوبر أدمن (جلستين) — تأكد إن العادي مش شايف تنبيهات الدخول/الصلاحيات، والسوبر أدمن شايف كل حاجة.
  4. جرّب: تعديل سعر منتج، تصفير مخزونه، إنشاء طلب بكوبون — تأكد من ظهور الإشعارات الصحيحة في `/admin/notifications` و `/admin/activity-log`.

---

## 8. نسبة الاكتمال

| القسم | النسبة |
|---|---|
| Dashboard widgets (الخمسة المطلوبة) | 100% مربوطة بـ Supabase |
| نظام Notifications | 100% (بنية + severity + RLS) |
| Activity Log | 100% للجداول المغطاة |
| تغطية الأحداث المطلوبة | ~92% (14 من 15 حدث مذكور — المتبقي هو المحتوى/المقالات، خارج النطاق) |
| Business/Finance | 0% (مؤجل بقرار صريح) |
| Journal/Content | 0% (مؤجل بقرار صريح) |
| **التحقق الفعلي على قاعدة بيانات حية** | 0% — لم يُطبَّق بعد، بانتظارك |
