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
export type CouponType = 'percentage' | 'fixed';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cash_on_delivery' | 'card' | 'wallet';
export type ContactMessageStatus = 'new' | 'read' | 'replied' | 'archived';
export type NotificationType = 'order' | 'account' | 'promotion' | 'stock' | 'system';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          staff_role_key: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          staff_role_key?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          staff_role_key?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
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
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
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
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
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
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          seo_title: string | null;
          seo_description: string | null;
          seo_keywords: string[];
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
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string[];
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
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
      };

      product_variants: {
        Row: {
          id: string;
          product_id: string;
          size: string;
          color_name: string;
          color_hex: string | null;
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
          sku?: string;
          price?: number | null;
          sale_price?: number | null;
          stock?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          status: OrderStatus;
          payment_status: PaymentStatus;
          payment_method: PaymentMethod;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod;
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
        }[];
      };
    };

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
