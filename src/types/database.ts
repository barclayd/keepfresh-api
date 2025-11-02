export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.4';
  };
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string;
          expiry_type: Database['public']['Enums']['expiry_type'];
          icon: string;
          id: number;
          name: string;
          path: unknown;
          path_display: string;
          recommended_storage_location: Database['public']['Enums']['storage_location'];
          shelf_life_in_freezer_in_days_opened: number | null;
          shelf_life_in_freezer_in_days_unopened: number | null;
          shelf_life_in_fridge_in_days_opened: number | null;
          shelf_life_in_fridge_in_days_unopened: number | null;
          shelf_life_in_pantry_in_days_opened: number | null;
          shelf_life_in_pantry_in_days_unopened: number | null;
        };
        Insert: {
          created_at?: string;
          expiry_type?: Database['public']['Enums']['expiry_type'];
          icon: string;
          id?: number;
          name: string;
          path: unknown;
          path_display: string;
          recommended_storage_location: Database['public']['Enums']['storage_location'];
          shelf_life_in_freezer_in_days_opened?: number | null;
          shelf_life_in_freezer_in_days_unopened?: number | null;
          shelf_life_in_fridge_in_days_opened?: number | null;
          shelf_life_in_fridge_in_days_unopened?: number | null;
          shelf_life_in_pantry_in_days_opened?: number | null;
          shelf_life_in_pantry_in_days_unopened?: number | null;
        };
        Update: {
          created_at?: string;
          expiry_type?: Database['public']['Enums']['expiry_type'];
          icon?: string;
          id?: number;
          name?: string;
          path?: unknown;
          path_display?: string;
          recommended_storage_location?: Database['public']['Enums']['storage_location'];
          shelf_life_in_freezer_in_days_opened?: number | null;
          shelf_life_in_freezer_in_days_unopened?: number | null;
          shelf_life_in_fridge_in_days_opened?: number | null;
          shelf_life_in_fridge_in_days_unopened?: number | null;
          shelf_life_in_pantry_in_days_opened?: number | null;
          shelf_life_in_pantry_in_days_unopened?: number | null;
        };
        Relationships: [];
      };
      category_preferences: {
        Row: {
          context_pattern: string | null;
          description: string | null;
          id: number;
          path_pattern: string | null;
          preference_score: number | null;
        };
        Insert: {
          context_pattern?: string | null;
          description?: string | null;
          id?: number;
          path_pattern?: string | null;
          preference_score?: number | null;
        };
        Update: {
          context_pattern?: string | null;
          description?: string | null;
          id?: number;
          path_pattern?: string | null;
          preference_score?: number | null;
        };
        Relationships: [];
      };
      inventory_item_events: {
        Row: {
          category_path: unknown;
          created_at: string;
          days_until_expiry: number | null;
          event_type: string;
          from_location: Database['public']['Enums']['storage_location'] | null;
          from_status:
            | Database['public']['Enums']['grocery_item_status']
            | null;
          id: string;
          inventory_item_id: number;
          to_location: Database['public']['Enums']['storage_location'] | null;
          to_status: Database['public']['Enums']['grocery_item_status'] | null;
          user_id: string | null;
        };
        Insert: {
          category_path?: unknown;
          created_at?: string;
          days_until_expiry?: number | null;
          event_type: string;
          from_location?:
            | Database['public']['Enums']['storage_location']
            | null;
          from_status?:
            | Database['public']['Enums']['grocery_item_status']
            | null;
          id?: string;
          inventory_item_id: number;
          to_location?: Database['public']['Enums']['storage_location'] | null;
          to_status?: Database['public']['Enums']['grocery_item_status'] | null;
          user_id?: string | null;
        };
        Update: {
          category_path?: unknown;
          created_at?: string;
          days_until_expiry?: number | null;
          event_type?: string;
          from_location?:
            | Database['public']['Enums']['storage_location']
            | null;
          from_status?:
            | Database['public']['Enums']['grocery_item_status']
            | null;
          id?: string;
          inventory_item_id?: number;
          to_location?: Database['public']['Enums']['storage_location'] | null;
          to_status?: Database['public']['Enums']['grocery_item_status'] | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'inventory_items_events_category_path_fkey';
            columns: ['category_path'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['path'];
          },
          {
            foreignKeyName: 'inventory_items_events_inventory_item_id_fkey';
            columns: ['inventory_item_id'];
            isOneToOne: false;
            referencedRelation: 'inventory_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inventory_items_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      inventory_items: {
        Row: {
          consumed_at: string | null;
          consumption_prediction: number | null;
          consumption_prediction_changed_at: string | null;
          created_at: string;
          discarded_at: string | null;
          expiry_date: string | null;
          expiry_type: Database['public']['Enums']['expiry_type'] | null;
          id: number;
          location_changed_at: string | null;
          opened_at: string | null;
          percentage_remaining: number;
          product_id: number;
          purchased_at: string | null;
          status: Database['public']['Enums']['grocery_item_status'];
          storage_location: Database['public']['Enums']['storage_location'];
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          consumed_at?: string | null;
          consumption_prediction?: number | null;
          consumption_prediction_changed_at?: string | null;
          created_at?: string;
          discarded_at?: string | null;
          expiry_date?: string | null;
          expiry_type?: Database['public']['Enums']['expiry_type'] | null;
          id?: number;
          location_changed_at?: string | null;
          opened_at?: string | null;
          percentage_remaining?: number;
          product_id: number;
          purchased_at?: string | null;
          status?: Database['public']['Enums']['grocery_item_status'];
          storage_location: Database['public']['Enums']['storage_location'];
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          consumed_at?: string | null;
          consumption_prediction?: number | null;
          consumption_prediction_changed_at?: string | null;
          created_at?: string;
          discarded_at?: string | null;
          expiry_date?: string | null;
          expiry_type?: Database['public']['Enums']['expiry_type'] | null;
          id?: number;
          location_changed_at?: string | null;
          opened_at?: string | null;
          percentage_remaining?: number;
          product_id?: number;
          purchased_at?: string | null;
          status?: Database['public']['Enums']['grocery_item_status'];
          storage_location?: Database['public']['Enums']['storage_location'];
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'inventory_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'User Grocery Item_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      product_source: {
        Row: {
          api_base_url: string | null;
          created_at: string;
          id: number;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          api_base_url?: string | null;
          created_at?: string;
          id?: number;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          api_base_url?: string | null;
          created_at?: string;
          id?: number;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          amount: number | null;
          barcode: string | null;
          brand: string;
          category_id: number;
          category_path_display: string;
          countries: string[] | null;
          created_at: string;
          expiry_type: Database['public']['Enums']['expiry_type'];
          id: number;
          lifespan_in_days: number | null;
          name: string;
          search_text: string | null;
          search_vector: unknown;
          source_id: number;
          source_ref: string;
          storage_location: Database['public']['Enums']['storage_location'];
          unit: Database['public']['Enums']['unit'] | null;
          updated_at: string;
        };
        Insert: {
          amount?: number | null;
          barcode?: string | null;
          brand: string;
          category_id: number;
          category_path_display?: string | null;
          countries?: string[] | null;
          created_at?: string;
          expiry_type: Database['public']['Enums']['expiry_type'];
          id?: number;
          lifespan_in_days?: number | null;
          name: string;
          search_text?: string | null;
          search_vector?: unknown;
          source_id: number;
          source_ref: string;
          storage_location: Database['public']['Enums']['storage_location'];
          unit?: Database['public']['Enums']['unit'] | null;
          updated_at?: string;
        };
        Update: {
          amount?: number | null;
          barcode?: string | null;
          brand?: string;
          category_id?: number;
          category_path_display?: string;
          countries?: string[] | null;
          created_at?: string;
          expiry_type?: Database['public']['Enums']['expiry_type'];
          id?: number;
          lifespan_in_days?: number | null;
          name?: string;
          search_text?: string | null;
          search_vector?: unknown;
          source_id?: number;
          source_ref?: string;
          storage_location?: Database['public']['Enums']['storage_location'];
          unit?: Database['public']['Enums']['unit'] | null;
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
            foreignKeyName: 'products_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'product_source';
            referencedColumns: ['id'];
          },
        ];
      };
      temp_products: {
        Row: {
          amount: number | null;
          barcode: string | null;
          brand: string | null;
          category_id: number | null;
          countries: string | null;
          created_at: string | null;
          expiry_type: string | null;
          id: number | null;
          lifespan_in_days: number | null;
          name: string | null;
          source_id: number | null;
          source_ref: string | null;
          storage_location: string | null;
          unit: string | null;
          updated_at: string | null;
        };
        Insert: {
          amount?: number | null;
          barcode?: string | null;
          brand?: string | null;
          category_id?: number | null;
          countries?: string | null;
          created_at?: string | null;
          expiry_type?: string | null;
          id?: number | null;
          lifespan_in_days?: number | null;
          name?: string | null;
          source_id?: number | null;
          source_ref?: string | null;
          storage_location?: string | null;
          unit?: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount?: number | null;
          barcode?: string | null;
          brand?: string | null;
          category_id?: number | null;
          countries?: string | null;
          created_at?: string | null;
          expiry_type?: string | null;
          id?: number | null;
          lifespan_in_days?: number | null;
          name?: string | null;
          source_id?: number | null;
          source_ref?: string | null;
          storage_location?: string | null;
          unit?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created_at: string;
          email: string | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      debug_category_match: {
        Args: { api_categories: string[] };
        Returns: {
          category_path: string;
          match_type: string;
          preference_score: number;
          similarity_score: number;
        }[];
      };
      match_food_category: {
        Args: { api_categories: string[] };
        Returns: {
          icon: string;
          id: number;
          name: string;
          path: unknown;
          path_display: string;
          recommended_storage_location: Database['public']['Enums']['storage_location'];
        }[];
      };
      search_products_paginated: {
        Args: {
          country_code?: string;
          page_limit?: number;
          page_offset?: number;
          search_query: string;
          similarity_threshold?: number;
        };
        Returns: {
          amount: number;
          brand: string;
          category_icon: string;
          category_id: number;
          category_name: string;
          category_path_display: string;
          expiry_type: Database['public']['Enums']['expiry_type'];
          id: number;
          name: string;
          storage_location: Database['public']['Enums']['storage_location'];
          total_count: number;
          unit: Database['public']['Enums']['unit'];
        }[];
      };
    };
    Enums: {
      expiry_type: 'best_before' | 'use_by' | 'long_life';
      grocery_item_status: 'unopened' | 'opened' | 'consumed' | 'discarded';
      source: 'open_food_facts';
      storage_location: 'fridge' | 'freezer' | 'pantry';
      unit:
        | 'mg'
        | 'g'
        | 'kg'
        | 'oz'
        | 'lb'
        | 'ml'
        | 'l'
        | 'fl_oz'
        | 'pt'
        | 'qt'
        | 'gal'
        | 'unit';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      expiry_type: ['best_before', 'use_by', 'long_life'],
      grocery_item_status: ['unopened', 'opened', 'consumed', 'discarded'],
      source: ['open_food_facts'],
      storage_location: ['fridge', 'freezer', 'pantry'],
      unit: [
        'mg',
        'g',
        'kg',
        'oz',
        'lb',
        'ml',
        'l',
        'fl_oz',
        'pt',
        'qt',
        'gal',
        'unit',
      ],
    },
  },
} as const;
