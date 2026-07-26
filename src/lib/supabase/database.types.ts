// Hand-written to match supabase/migrations/*.sql exactly.
// Once the project is linked, regenerate the source of truth with:
//   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'customer' | 'admin' | 'super_admin';
export type ProductCollection = 'winter' | 'summer' | 'all_season';
export type ProductStatus =
  | 'draft'
  | 'preview'
  | 'published'
  | 'scheduled'
  | 'hidden'
  | 'archived'
  | 'discontinued';
export type CategoryStatus = 'active' | 'draft' | 'archived';
export type CouponType = 'percentage' | 'fixed' | 'shipping';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_to_ship'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partial' | 'partially_refunded';
/** DB enum still exists but `orders.payment_method` was relaxed to `text` (see 20260714120022) — kept for reference only. */
export type PaymentMethod = 'cash_on_delivery' | 'card' | 'wallet';
export type ContactMessageStatus = 'new' | 'read' | 'replied' | 'archived';
export type NotificationType = 'order' | 'account' | 'promotion' | 'stock' | 'system' | 'customer' | 'review';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          username: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          staff_role_key: string | null;
          is_active: boolean;
          bio: string;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          username?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          staff_role_key?: string | null;
          is_active?: boolean;
          bio?: string;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          username?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          staff_role_key?: string | null;
          is_active?: boolean;
          bio?: string;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      roles: {
        Row: {
          id: string;
          name_ar: string;
          name_key: string;
          description_ar: string;
          color: string;
          is_system: boolean;
          permissions: Record<string, { read: boolean; write: boolean; delete: boolean; [action: string]: boolean }>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name_ar: string;
          name_key: string;
          description_ar?: string;
          color?: string;
          is_system?: boolean;
          permissions?: Record<string, { read: boolean; write: boolean; delete: boolean; [action: string]: boolean }>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name_ar?: string;
          name_key?: string;
          description_ar?: string;
          color?: string;
          is_system?: boolean;
          permissions?: Record<string, { read: boolean; write: boolean; delete: boolean; [action: string]: boolean }>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo: string | null;
          description: string;
          status: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo?: string | null;
          description?: string;
          status?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo?: string | null;
          description?: string;
          status?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      collections: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          type: string;
          image: string | null;
          match_type: string;
          rules: Json;
          product_ids: string[];
          status: string;
          deleted_at: string | null;
          is_visible: boolean;
          is_featured: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string;
          type?: string;
          image?: string | null;
          match_type?: string;
          rules?: Json;
          product_ids?: string[];
          status?: string;
          deleted_at?: string | null;
          is_visible?: boolean;
          is_featured?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string;
          type?: string;
          image?: string | null;
          match_type?: string;
          rules?: Json;
          product_ids?: string[];
          status?: string;
          deleted_at?: string | null;
          is_visible?: boolean;
          is_featured?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      journal_articles: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string;
          content: string;
          featured_image: string;
          gallery: string[];
          category: string;
          tags: string[];
          author: string;
          reading_time_minutes: number;
          status: string;
          is_featured: boolean;
          publish_date: string;
          seo: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt?: string;
          content?: string;
          featured_image?: string;
          gallery?: string[];
          category?: string;
          tags?: string[];
          author?: string;
          reading_time_minutes?: number;
          status?: string;
          is_featured?: boolean;
          publish_date?: string;
          seo?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          excerpt?: string;
          content?: string;
          featured_image?: string;
          gallery?: string[];
          category?: string;
          tags?: string[];
          author?: string;
          reading_time_minutes?: number;
          status?: string;
          is_featured?: boolean;
          publish_date?: string;
          seo?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      suppliers: {
        Row: {
          id: string; name: string; supplier_code: string; contact_name: string; contact_person: string | null;
          email: string; phone: string; whatsapp: string; country: string; city: string; address: string;
          tax_number: string; commercial_registration: string; payment_terms: string; currency: string;
          materials_provided: string[]; status: string; notes: string; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; name: string; supplier_code: string; contact_name?: string; contact_person?: string | null;
          email?: string; phone?: string; whatsapp?: string; country?: string; city?: string; address?: string;
          tax_number?: string; commercial_registration?: string; payment_terms?: string; currency?: string;
          materials_provided?: string[]; status?: string; notes?: string; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; name?: string; supplier_code?: string; contact_name?: string; contact_person?: string | null;
          email?: string; phone?: string; whatsapp?: string; country?: string; city?: string; address?: string;
          tax_number?: string; commercial_registration?: string; payment_terms?: string; currency?: string;
          materials_provided?: string[]; status?: string; notes?: string; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };

      purchase_orders: {
        Row: {
          id: string; supplier_id: string | null; reference: string; date: string; expected_arrival: string | null;
          received_date: string | null; items: Json; subtotal: number; tax: number; shipping: number; total: number;
          status: string; payment_status: string; notes: string; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; supplier_id?: string | null; reference: string; date?: string; expected_arrival?: string | null;
          received_date?: string | null; items?: Json; subtotal?: number; tax?: number; shipping?: number; total?: number;
          status?: string; payment_status?: string; notes?: string; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; supplier_id?: string | null; reference?: string; date?: string; expected_arrival?: string | null;
          received_date?: string | null; items?: Json; subtotal?: number; tax?: number; shipping?: number; total?: number;
          status?: string; payment_status?: string; notes?: string; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };

      expenses: {
        Row: {
          id: string; name: string; category: string; amount: number; currency: string; date: string;
          payment_method: string; supplier_id: string | null; description: string | null; notes: string | null;
          receipt: string | null; reference_id: string | null; status: string; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; name: string; category?: string; amount?: number; currency?: string; date?: string;
          payment_method?: string; supplier_id?: string | null; description?: string | null; notes?: string | null;
          receipt?: string | null; reference_id?: string | null; status?: string; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; name?: string; category?: string; amount?: number; currency?: string; date?: string;
          payment_method?: string; supplier_id?: string | null; description?: string | null; notes?: string | null;
          receipt?: string | null; reference_id?: string | null; status?: string; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };

      assets: {
        Row: {
          id: string; name: string; type: string; purchase_date: string; purchase_value: number | null;
          current_value: number; depreciation: number | null; depreciation_rate: number | null; status: string;
          documents: string[]; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; name: string; type?: string; purchase_date?: string; purchase_value?: number | null;
          current_value?: number; depreciation?: number | null; depreciation_rate?: number | null; status?: string;
          documents?: string[]; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; name?: string; type?: string; purchase_date?: string; purchase_value?: number | null;
          current_value?: number; depreciation?: number | null; depreciation_rate?: number | null; status?: string;
          documents?: string[]; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };

      liabilities: {
        Row: {
          id: string; name: string; type: string; supplier_id: string | null; amount: number; due_date: string;
          status: string; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; name: string; type?: string; supplier_id?: string | null; amount?: number; due_date?: string;
          status?: string; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; name?: string; type?: string; supplier_id?: string | null; amount?: number; due_date?: string;
          status?: string; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };

      capital: {
        Row: {
          id: string; type: string; owner: string; amount: number; reason: string | null; date: string;
          notes: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; type: string; owner?: string; amount?: number; reason?: string | null; date?: string;
          notes?: string | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; type?: string; owner?: string; amount?: number; reason?: string | null; date?: string;
          notes?: string | null; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };

      seo_settings: {
        Row: {
          page: string; title: string; description: string; keywords: string; og_image: string;
          twitter_card: string; canonical: string | null; robots: string; json_ld: boolean; updated_at: string;
        };
        Insert: {
          page: string; title?: string; description?: string; keywords?: string; og_image?: string;
          twitter_card?: string; canonical?: string | null; robots?: string; json_ld?: boolean; updated_at?: string;
        };
        Update: {
          page?: string; title?: string; description?: string; keywords?: string; og_image?: string;
          twitter_card?: string; canonical?: string | null; robots?: string; json_ld?: boolean; updated_at?: string;
        };
        Relationships: [];
      };

      website_store_info: {
        Row: {
          id: number; store_name: string; phone: string; whatsapp: string; email: string; support_email: string;
          address: string; google_maps_url: string; working_hours: string; commercial_registration: string;
          tax_number: string; social_media: Json; announcement_bar: Json; updated_at: string;
        };
        Insert: {
          id?: number; store_name?: string; phone?: string; whatsapp?: string; email?: string; support_email?: string;
          address?: string; google_maps_url?: string; working_hours?: string; commercial_registration?: string;
          tax_number?: string; social_media?: Json; announcement_bar?: Json; updated_at?: string;
        };
        Update: {
          id?: number; store_name?: string; phone?: string; whatsapp?: string; email?: string; support_email?: string;
          address?: string; google_maps_url?: string; working_hours?: string; commercial_registration?: string;
          tax_number?: string; social_media?: Json; announcement_bar?: Json; updated_at?: string;
        };
        Relationships: [];
      };

      banners: {
        Row: {
          id: string; type: string; status: string; priority: number; schedule_start: string | null;
          schedule_end: string | null; target_url: string; overlay_opacity: number; animation: string;
          button_text: string | null; media_url: string; media_type: string; device_visibility: string[];
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; type?: string; status?: string; priority?: number; schedule_start?: string | null;
          schedule_end?: string | null; target_url?: string; overlay_opacity?: number; animation?: string;
          button_text?: string | null; media_url?: string; media_type?: string; device_visibility?: string[];
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; type?: string; status?: string; priority?: number; schedule_start?: string | null;
          schedule_end?: string | null; target_url?: string; overlay_opacity?: number; animation?: string;
          button_text?: string | null; media_url?: string; media_type?: string; device_visibility?: string[];
          created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };

      nav_menus: {
        Row: { id: string; location: string; items: Json; updated_at: string };
        Insert: { id?: string; location: string; items?: Json; updated_at?: string };
        Update: { id?: string; location?: string; items?: Json; updated_at?: string };
        Relationships: [];
      };

      footer_settings: {
        Row: {
          id: number; show_newsletter: boolean; newsletter_title: string; newsletter_subtitle: string;
          show_social_icons: boolean; show_payment_icons: boolean; developer_credit: string; copyright_text: string;
          columns: Json; updated_at: string;
        };
        Insert: {
          id?: number; show_newsletter?: boolean; newsletter_title?: string; newsletter_subtitle?: string;
          show_social_icons?: boolean; show_payment_icons?: boolean; developer_credit?: string; copyright_text?: string;
          columns?: Json; updated_at?: string;
        };
        Update: {
          id?: number; show_newsletter?: boolean; newsletter_title?: string; newsletter_subtitle?: string;
          show_social_icons?: boolean; show_payment_icons?: boolean; developer_credit?: string; copyright_text?: string;
          columns?: Json; updated_at?: string;
        };
        Relationships: [];
      };

      appearance_settings: {
        Row: {
          id: number; logo_url: string; favicon_url: string; loading_screen_type: string; theme_preset: string;
          border_radius: string; container_width: string; button_style: string; card_radius: string;
          animation_speed: string; accent_color: string; text_primary_color: string; background_primary_color: string;
          effects: Json; updated_at: string;
        };
        Insert: {
          id?: number; logo_url?: string; favicon_url?: string; loading_screen_type?: string; theme_preset?: string;
          border_radius?: string; container_width?: string; button_style?: string; card_radius?: string;
          animation_speed?: string; accent_color?: string; text_primary_color?: string; background_primary_color?: string;
          effects?: Json; updated_at?: string;
        };
        Update: {
          id?: number; logo_url?: string; favicon_url?: string; loading_screen_type?: string; theme_preset?: string;
          border_radius?: string; container_width?: string; button_style?: string; card_radius?: string;
          animation_speed?: string; accent_color?: string; text_primary_color?: string; background_primary_color?: string;
          effects?: Json; updated_at?: string;
        };
        Relationships: [];
      };

      content_blocks: {
        Row: { id: string; group: string; key: string; value: string; description: string; updated_at: string };
        Insert: { id?: string; group?: string; key: string; value?: string; description?: string; updated_at?: string };
        Update: { id?: string; group?: string; key?: string; value?: string; description?: string; updated_at?: string };
        Relationships: [];
      };

      homepage_sections: {
        Row: {
          id: string; type: string; title: string; subtitle: string | null; enabled: boolean;
          display_order: number; settings: Json; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; type: string; title?: string; subtitle?: string | null; enabled?: boolean;
          display_order?: number; settings?: Json; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; type?: string; title?: string; subtitle?: string | null; enabled?: boolean;
          display_order?: number; settings?: Json; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };

      customer_notifications: {
        Row: { id: string; order_id: string; order_number: string; status: string; title: string; message: string; is_read: boolean; created_at: string };
        Insert: { id?: string; order_id: string; order_number: string; status: string; title: string; message: string; is_read?: boolean; created_at?: string };
        Update: { id?: string; order_id?: string; order_number?: string; status?: string; title?: string; message?: string; is_read?: boolean; created_at?: string };
        Relationships: [];
      };

      categories: {
        Row: {
          id: string;
          name_ar: string;
          name_en: string;
          slug: string;
          description_ar: string | null;
          description_en: string | null;
          image_url: string | null;
          banner_url: string | null;
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
          is_featured: boolean;
          show_on_homepage: boolean;
          show_in_menu: boolean;
          status: CategoryStatus;
          deleted_at: string | null;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name_ar: string;
          name_en: string;
          slug: string;
          description_ar?: string | null;
          description_en?: string | null;
          image_url?: string | null;
          banner_url?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          is_featured?: boolean;
          show_on_homepage?: boolean;
          show_in_menu?: boolean;
          status?: CategoryStatus;
          deleted_at?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name_ar?: string;
          name_en?: string;
          slug?: string;
          description_ar?: string | null;
          description_en?: string | null;
          image_url?: string | null;
          banner_url?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          is_featured?: boolean;
          show_on_homepage?: boolean;
          show_in_menu?: boolean;
          status?: CategoryStatus;
          deleted_at?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };

      products: {
        Row: {
          id: string;
          name_ar: string;
          name_en: string;
          slug: string;
          sku: string;
          description_ar: string | null;
          description_en: string | null;
          short_description_ar: string | null;
          short_description_en: string | null;
          category_id: string;
          price: number;
          sale_price: number | null;
          stock: number;
          is_featured: boolean;
          is_active: boolean;
          collection: ProductCollection;
          collection_name: string | null;
          seo_title: string | null;
          seo_description: string | null;
          seo_keywords: string[];
          barcode: string | null;
          low_stock_limit: number;
          material: string | null;
          weight: number | null;
          brand: string;
          tags: string[];
          is_best_seller: boolean;
          is_new_arrival: boolean;
          status: ProductStatus;
          publish_at: string | null;
          hide_at: string | null;
          archive_at: string | null;
          canonical_url: string | null;
          og_title: string | null;
          og_description: string | null;
          hover_image_url: string | null;
          badge: string | null;
          details: string[];
          fabric: string | null;
          packaging: string | null;
          costing: Json;
          cost_price: number | null;
          stats: Json;
          revisions: Json;
          default_variant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name_ar: string;
          name_en: string;
          slug: string;
          sku: string;
          description_ar?: string | null;
          description_en?: string | null;
          short_description_ar?: string | null;
          short_description_en?: string | null;
          category_id: string;
          price: number;
          sale_price?: number | null;
          stock?: number;
          is_featured?: boolean;
          is_active?: boolean;
          collection?: ProductCollection;
          collection_name?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string[];
          barcode?: string | null;
          low_stock_limit?: number;
          material?: string | null;
          weight?: number | null;
          brand?: string;
          tags?: string[];
          is_best_seller?: boolean;
          is_new_arrival?: boolean;
          status?: ProductStatus;
          publish_at?: string | null;
          hide_at?: string | null;
          archive_at?: string | null;
          canonical_url?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          hover_image_url?: string | null;
          badge?: string | null;
          details?: string[];
          fabric?: string | null;
          packaging?: string | null;
          costing?: Json;
          cost_price?: number | null;
          stats?: Json;
          revisions?: Json;
          default_variant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name_ar?: string;
          name_en?: string;
          slug?: string;
          sku?: string;
          description_ar?: string | null;
          description_en?: string | null;
          short_description_ar?: string | null;
          short_description_en?: string | null;
          category_id?: string;
          price?: number;
          sale_price?: number | null;
          stock?: number;
          is_featured?: boolean;
          is_active?: boolean;
          collection?: ProductCollection;
          collection_name?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string[];
          barcode?: string | null;
          low_stock_limit?: number;
          material?: string | null;
          weight?: number | null;
          brand?: string;
          tags?: string[];
          is_best_seller?: boolean;
          is_new_arrival?: boolean;
          status?: ProductStatus;
          publish_at?: string | null;
          hide_at?: string | null;
          archive_at?: string | null;
          canonical_url?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          hover_image_url?: string | null;
          badge?: string | null;
          details?: string[];
          fabric?: string | null;
          packaging?: string | null;
          costing?: Json;
          cost_price?: number | null;
          stats?: Json;
          revisions?: Json;
          default_variant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_default_variant_id_fkey';
            columns: ['default_variant_id'];
            isOneToOne: false;
            referencedRelation: 'product_colors';
            referencedColumns: ['id'];
          },
        ];
      };

      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          alt_text: string | null;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          alt_text?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          url?: string;
          alt_text?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_images_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };

      product_variants: {
        Row: {
          id: string;
          product_id: string;
          size: string;
          color_name: string;
          color_hex: string | null;
          color_id: string | null;
          sku: string;
          price: number | null;
          sale_price: number | null;
          stock: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          size: string;
          color_name: string;
          color_hex?: string | null;
          color_id?: string | null;
          sku: string;
          price?: number | null;
          sale_price?: number | null;
          stock?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          size?: string;
          color_name?: string;
          color_hex?: string | null;
          color_id?: string | null;
          sku?: string;
          price?: number | null;
          sale_price?: number | null;
          stock?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_variants_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_variants_color_id_fkey';
            columns: ['color_id'];
            isOneToOne: false;
            referencedRelation: 'product_colors';
            referencedColumns: ['id'];
          },
        ];
      };

      product_colors: {
        Row: {
          id: string;
          product_id: string;
          name_ar: string;
          name_en: string | null;
          hex: string;
          sort_order: number;
          stock: number | null;
          sku_suffix: string | null;
          price_override: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name_ar: string;
          name_en?: string | null;
          hex: string;
          sort_order?: number;
          stock?: number | null;
          sku_suffix?: string | null;
          price_override?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          name_ar?: string;
          name_en?: string | null;
          hex?: string;
          sort_order?: number;
          stock?: number | null;
          sku_suffix?: string | null;
          price_override?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_colors_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };

      product_color_images: {
        Row: {
          id: string;
          color_id: string;
          url: string;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          color_id: string;
          url: string;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          color_id?: string;
          url?: string;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_color_images_color_id_fkey';
            columns: ['color_id'];
            isOneToOne: false;
            referencedRelation: 'product_colors';
            referencedColumns: ['id'];
          },
        ];
      };

      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          variant_id?: string | null;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          variant_id?: string | null;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      wishlist: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      coupons: {
        Row: {
          id: string;
          code: string;
          type: CouponType;
          value: number;
          min_order_amount: number;
          max_discount_amount: number | null;
          usage_limit: number | null;
          usage_count: number;
          per_user_limit: number | null;
          starts_at: string | null;
          expires_at: string | null;
          is_active: boolean;
          description: string;
          status: string;
          included_categories: string[];
          excluded_categories: string[];
          included_products: string[];
          excluded_products: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          type: CouponType;
          value: number;
          min_order_amount?: number;
          max_discount_amount?: number | null;
          usage_limit?: number | null;
          usage_count?: number;
          per_user_limit?: number | null;
          starts_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          description?: string;
          status?: string;
          included_categories?: string[];
          excluded_categories?: string[];
          included_products?: string[];
          excluded_products?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          type?: CouponType;
          value?: number;
          min_order_amount?: number;
          max_discount_amount?: number | null;
          usage_limit?: number | null;
          usage_count?: number;
          per_user_limit?: number | null;
          starts_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          description?: string;
          status?: string;
          included_categories?: string[];
          excluded_categories?: string[];
          included_products?: string[];
          excluded_products?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      customers: {
        Row: {
          id: string;
          customer_number: string;
          first_name: string | null;
          last_name: string | null;
          full_name: string;
          email: string;
          phone: string;
          avatar_url: string | null;
          gender: string | null;
          marketing_consent: boolean;
          status: string;
          favorite_category: string | null;
          favorite_brand: string | null;
          favorite_color: string | null;
          loyalty_points: number;
          notes: string;
          tags: string[];
          segments: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_number?: string;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string;
          email?: string;
          phone: string;
          avatar_url?: string | null;
          gender?: string | null;
          marketing_consent?: boolean;
          status?: string;
          favorite_category?: string | null;
          favorite_brand?: string | null;
          favorite_color?: string | null;
          loyalty_points?: number;
          notes?: string;
          tags?: string[];
          segments?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_number?: string;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string;
          email?: string;
          phone?: string;
          avatar_url?: string | null;
          gender?: string | null;
          marketing_consent?: boolean;
          status?: string;
          favorite_category?: string | null;
          favorite_brand?: string | null;
          favorite_color?: string | null;
          loyalty_points?: number;
          notes?: string;
          tags?: string[];
          segments?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      customer_addresses: {
        Row: {
          id: string;
          customer_id: string;
          label: string;
          full_name: string | null;
          phone: string | null;
          street: string;
          apartment: string | null;
          floor: string | null;
          building: string | null;
          area: string | null;
          city: string;
          postal_code: string | null;
          country: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          label?: string;
          full_name?: string | null;
          phone?: string | null;
          street?: string;
          apartment?: string | null;
          floor?: string | null;
          building?: string | null;
          area?: string | null;
          city?: string;
          postal_code?: string | null;
          country?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          label?: string;
          full_name?: string | null;
          phone?: string | null;
          street?: string;
          apartment?: string | null;
          floor?: string | null;
          building?: string | null;
          area?: string | null;
          city?: string;
          postal_code?: string | null;
          country?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      customer_notes: {
        Row: {
          id: string;
          customer_id: string;
          admin_id: string | null;
          admin_name: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          admin_id?: string | null;
          admin_name?: string;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          admin_id?: string | null;
          admin_name?: string;
          text?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      orders: {
        Row: {
          id: string;
          order_number: string;
          invoice_number: string | null;
          user_id: string | null;
          status: OrderStatus;
          payment_status: PaymentStatus;
          payment_method: string;
          subtotal: number;
          discount_amount: number;
          shipping_fee: number;
          tax_amount: number;
          total: number;
          currency: string;
          coupon_id: string | null;
          coupon_code: string | null;
          phone: string;
          shipping_address: Json;
          notes: string | null;
          customer_name: string;
          customer_email: string;
          customer_ref_id: string | null;
          customer_notes: string | null;
          discount_type: string | null;
          discount_value: number | null;
          shipping_company: string | null;
          tracking_number: string | null;
          courier_name: string | null;
          estimated_delivery_date: string | null;
          customer_update: string | null;
          customer_updated_at: string | null;
          billing_address: string | null;
          timeline: Json;
          internal_notes: Json;
          coupon_usage_counted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          invoice_number?: string | null;
          user_id?: string | null;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          payment_method?: string;
          subtotal: number;
          discount_amount?: number;
          shipping_fee?: number;
          tax_amount?: number;
          total: number;
          currency?: string;
          coupon_id?: string | null;
          coupon_code?: string | null;
          phone: string;
          shipping_address: Json;
          notes?: string | null;
          customer_name?: string;
          customer_email?: string;
          customer_ref_id?: string | null;
          customer_notes?: string | null;
          discount_type?: string | null;
          discount_value?: number | null;
          shipping_company?: string | null;
          tracking_number?: string | null;
          courier_name?: string | null;
          estimated_delivery_date?: string | null;
          customer_update?: string | null;
          customer_updated_at?: string | null;
          billing_address?: string | null;
          timeline?: Json;
          internal_notes?: Json;
          coupon_usage_counted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          invoice_number?: string | null;
          user_id?: string | null;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          payment_method?: string;
          subtotal?: number;
          discount_amount?: number;
          shipping_fee?: number;
          tax_amount?: number;
          total?: number;
          currency?: string;
          coupon_id?: string | null;
          coupon_code?: string | null;
          phone?: string;
          shipping_address?: Json;
          notes?: string | null;
          customer_name?: string;
          customer_email?: string;
          customer_ref_id?: string | null;
          customer_notes?: string | null;
          discount_type?: string | null;
          discount_value?: number | null;
          shipping_company?: string | null;
          tracking_number?: string | null;
          courier_name?: string | null;
          estimated_delivery_date?: string | null;
          customer_update?: string | null;
          customer_updated_at?: string | null;
          billing_address?: string | null;
          timeline?: Json;
          internal_notes?: Json;
          coupon_usage_counted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name: string;
          sku: string;
          image_url: string | null;
          size: string | null;
          color_name: string | null;
          color_id: string | null;
          color_hex: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name: string;
          sku: string;
          image_url?: string | null;
          size?: string | null;
          color_name?: string | null;
          color_id?: string | null;
          color_hex?: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name?: string;
          sku?: string;
          image_url?: string | null;
          size?: string | null;
          color_name?: string | null;
          color_id?: string | null;
          color_hex?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string | null;
          message: string;
          status: ContactMessageStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          subject?: string | null;
          message: string;
          status?: ContactMessageStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          subject?: string | null;
          message?: string;
          status?: ContactMessageStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      newsletter: {
        Row: {
          id: string;
          email: string;
          is_subscribed: boolean;
          subscribed_at: string;
          unsubscribed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          is_subscribed?: boolean;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          is_subscribed?: boolean;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          for_admins: boolean;
          type: NotificationType;
          title: string;
          message: string;
          link: string | null;
          is_read: boolean;
          actor_id: string | null;
          actor_email: string | null;
          action: string | null;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json;
          severity: string;
          sensitive: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          for_admins?: boolean;
          type?: NotificationType;
          title: string;
          message: string;
          link?: string | null;
          is_read?: boolean;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          severity?: string;
          sensitive?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          for_admins?: boolean;
          type?: NotificationType;
          title?: string;
          message?: string;
          link?: string | null;
          is_read?: boolean;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          severity?: string;
          sensitive?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      reviews: {
        Row: {
          id: string;
          product_id: string | null;
          product_name: string;
          product_image: string | null;
          product_color: string | null;
          product_size: string | null;
          customer_id: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          customer_avatar: string | null;
          order_id: string | null;
          order_item_id: string | null;
          order_number: string | null;
          rating: number;
          title: string;
          content: string;
          size_fit: string | null;
          recommended: boolean | null;
          images: string[];
          has_images: boolean;
          helpful_count: number;
          status: string;
          is_featured: boolean;
          is_pinned: boolean;
          verified_purchase: boolean;
          admin_reply: string | null;
          admin_notes: string | null;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          product_name?: string;
          product_image?: string | null;
          product_color?: string | null;
          product_size?: string | null;
          customer_id?: string | null;
          customer_name: string;
          customer_email?: string;
          customer_phone?: string | null;
          customer_avatar?: string | null;
          order_id?: string | null;
          order_item_id?: string | null;
          order_number?: string | null;
          rating: number;
          title?: string;
          content: string;
          size_fit?: string | null;
          recommended?: boolean | null;
          images?: string[];
          status?: string;
          is_featured?: boolean;
          is_pinned?: boolean;
          verified_purchase?: boolean;
          admin_reply?: string | null;
          admin_notes?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          product_name?: string;
          product_image?: string | null;
          product_color?: string | null;
          product_size?: string | null;
          customer_id?: string | null;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string | null;
          customer_avatar?: string | null;
          order_id?: string | null;
          order_item_id?: string | null;
          order_number?: string | null;
          rating?: number;
          title?: string;
          content?: string;
          size_fit?: string | null;
          recommended?: boolean | null;
          images?: string[];
          status?: string;
          is_featured?: boolean;
          is_pinned?: boolean;
          verified_purchase?: boolean;
          admin_reply?: string | null;
          admin_notes?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      activity_log: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before_data: Json | null;
          after_data: Json | null;
          metadata: Json;
          user_agent: string | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          metadata?: Json;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          metadata?: Json;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      store_settings: {
        Row: {
          id: number;
          store_name_ar: string;
          store_name_en: string;
          store_description: string;
          logo_url: string | null;
          favicon_url: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          whatsapp_number: string | null;
          address: Json;
          social_links: Json;
          working_hours: Json;
          seo_title: string | null;
          seo_description: string | null;
          seo_keywords: string[];
          og_image_url: string | null;
          google_analytics_id: string | null;
          google_search_console_code: string | null;
          robots_txt: string;
          sitemap_enabled: boolean;
          currency: string;
          tax_rate: number;
          shipping_fee: number;
          free_shipping_threshold: number | null;
          estimated_delivery_days: string;
          enable_cod: boolean;
          enable_vodafone_cash: boolean;
          enable_instapay: boolean;
          maintenance_mode: boolean;
          maintenance_message: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: number;
          store_name_ar?: string;
          store_name_en?: string;
          store_description?: string;
          logo_url?: string | null;
          favicon_url?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          whatsapp_number?: string | null;
          address?: Json;
          social_links?: Json;
          working_hours?: Json;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string[];
          og_image_url?: string | null;
          google_analytics_id?: string | null;
          google_search_console_code?: string | null;
          robots_txt?: string;
          sitemap_enabled?: boolean;
          currency?: string;
          tax_rate?: number;
          shipping_fee?: number;
          free_shipping_threshold?: number | null;
          estimated_delivery_days?: string;
          enable_cod?: boolean;
          enable_vodafone_cash?: boolean;
          enable_instapay?: boolean;
          maintenance_mode?: boolean;
          maintenance_message?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: number;
          store_name_ar?: string;
          store_name_en?: string;
          store_description?: string;
          logo_url?: string | null;
          favicon_url?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          whatsapp_number?: string | null;
          address?: Json;
          social_links?: Json;
          working_hours?: Json;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string[];
          og_image_url?: string | null;
          google_analytics_id?: string | null;
          google_search_console_code?: string | null;
          robots_txt?: string;
          sitemap_enabled?: boolean;
          currency?: string;
          tax_rate?: number;
          shipping_fee?: number;
          free_shipping_threshold?: number | null;
          estimated_delivery_days?: string;
          enable_cod?: boolean;
          enable_vodafone_cash?: boolean;
          enable_instapay?: boolean;
          maintenance_mode?: boolean;
          maintenance_message?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      media: {
        Row: {
          id: string;
          file_name: string;
          original_name: string;
          alt: string;
          mime_type: string;
          width: number | null;
          height: number | null;
          size_bytes: number;
          folder: string;
          bucket_id: string;
          storage_path: string;
          url: string;
          thumbnail_url: string | null;
          uploaded_by: string | null;
          used_in: string[];
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          file_name: string;
          original_name: string;
          alt?: string;
          mime_type: string;
          width?: number | null;
          height?: number | null;
          size_bytes: number;
          folder?: string;
          bucket_id?: string;
          storage_path: string;
          url: string;
          thumbnail_url?: string | null;
          uploaded_by?: string | null;
          used_in?: string[];
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          file_name?: string;
          original_name?: string;
          alt?: string;
          mime_type?: string;
          width?: number | null;
          height?: number | null;
          size_bytes?: number;
          folder?: string;
          bucket_id?: string;
          storage_path?: string;
          url?: string;
          thumbnail_url?: string | null;
          uploaded_by?: string | null;
          used_in?: string[];
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      stock_movements: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string | null;
          type: string;
          quantity: number;
          balance_before: number;
          balance_after: number;
          reason: string;
          reference_type: string | null;
          reference_id: string | null;
          warehouse_id: string;
          admin_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          type: string;
          quantity: number;
          balance_before: number;
          balance_after: number;
          reason?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          warehouse_id?: string;
          admin_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          variant_id?: string | null;
          type?: string;
          quantity?: number;
          balance_before?: number;
          balance_after?: number;
          reason?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          warehouse_id?: string;
          admin_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_movements_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movements_variant_id_fkey';
            columns: ['variant_id'];
            isOneToOne: false;
            referencedRelation: 'product_variants';
            referencedColumns: ['id'];
          },
        ];
      };
    };

    Views: Record<string, never>;

    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      validate_coupon: {
        Args: { p_code: string; p_order_amount: number };
        Returns: {
          id: string;
          type: CouponType;
          value: number;
          max_discount_amount: number | null;
          per_user_limit: number | null;
        }[];
      };
      increment_coupon_usage: {
        Args: { p_code: string; p_order_id: string };
        Returns: undefined;
      };
      get_guest_order: {
        Args: { p_order_number: string; p_contact: string };
        Returns: Json | null;
      };
      log_auth_event: {
        Args: { p_action: string };
        Returns: undefined;
      };
      get_customer_notifications: {
        Args: { p_order_number: string; p_contact: string };
        Returns: {
          id: string;
          order_id: string;
          order_number: string;
          status: string;
          title: string;
          message: string;
          is_read: boolean;
          created_at: string;
        }[];
      };
      mark_customer_notifications_read: {
        Args: { p_order_number: string; p_contact: string };
        Returns: undefined;
      };
      log_impersonation_event: {
        Args: { p_from_role: string; p_to_role: string; p_metadata?: Json };
        Returns: undefined;
      };
      get_revenue_summary: {
        Args: Record<string, never>;
        Returns: {
          today: number;
          this_week: number;
          this_month: number;
        }[];
      };
      get_revenue_series: {
        Args: { p_period?: string };
        Returns: {
          name: string;
          revenue: number;
          orders: number;
        }[];
      };
      get_customer_stats: {
        Args: { p_customer_id: string };
        Returns: {
          total_orders: number;
          cancelled_orders: number;
          returned_orders: number;
          total_spent: number;
          average_order_value: number;
          coupons_used: number;
        }[];
      };
      get_top_products: {
        Args: { p_limit?: number };
        Returns: {
          product_id: string;
          name: string | null;
          image: string | null;
          sales: number;
          revenue: number;
        }[];
      };
      get_customer_growth: {
        Args: Record<string, never>;
        Returns: {
          total_customers: number;
          new_this_month: number;
          new_last_month: number;
        }[];
      };
      create_guest_order: {
        Args: { p_order: Json; p_items: Json };
        Returns: Json;
      };
      record_stock_movement: {
        Args: {
          p_product_id: string;
          p_variant_id: string | null;
          p_type: string;
          p_quantity: number;
          p_reason: string;
          p_reference_type: string | null;
          p_reference_id: string | null;
          p_warehouse_id: string | null;
        };
        Returns: {
          id: string;
          product_id: string;
          variant_id: string | null;
          type: string;
          quantity: number;
          balance_before: number;
          balance_after: number;
          reason: string;
          reference_type: string | null;
          reference_id: string | null;
          warehouse_id: string;
          admin_id: string | null;
          created_at: string;
        }[];
      };
      update_stock_movement: {
        Args: { p_movement_id: string; p_quantity: number | null; p_reason: string | null };
        Returns: {
          id: string;
          product_id: string;
          variant_id: string | null;
          type: string;
          quantity: number;
          balance_before: number;
          balance_after: number;
          reason: string;
          reference_type: string | null;
          reference_id: string | null;
          warehouse_id: string;
          admin_id: string | null;
          created_at: string;
        }[];
      };
      delete_stock_movement: {
        Args: { p_movement_id: string };
        Returns: undefined;
      };
      get_product_review_stats: {
        Args: { p_product_id: string };
        Returns: {
          average_rating: number | null;
          review_count: number;
          pct_true_to_size: number | null;
          pct_runs_small: number | null;
          pct_runs_large: number | null;
          pct_recommended: number | null;
        }[];
      };
      get_review_admin_stats: {
        Args: Record<string, never>;
        Returns: {
          average_rating: number | null;
          review_count: number;
          approval_rate: number | null;
          most_reviewed_products: Json;
          lowest_rated_products: Json;
        }[];
      };
      mark_review_helpful: {
        Args: { p_review_id: string };
        Returns: number;
      };
    };

    // ProductStatus/CategoryStatus are plain `text` columns with CHECK
    // constraints (see 20260714120018), not real Postgres enum types, so
    // they're intentionally not listed here — only genuine `create type ...
    // as enum` types belong in this section.
    Enums: {
      user_role: UserRole;
      product_collection: ProductCollection;
      coupon_type: CouponType;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      contact_message_status: ContactMessageStatus;
      notification_type: NotificationType;
    };

    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
