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
      grocery_item: {
        Row: {
          amount: number | null;
          barcode: string | null;
          brand: string;
          category: string | null;
          created_at: string;
          expiry_type: Database['public']['Enums']['expiry_type'];
          id: number;
          image_url: string | null;
          lifespan_in_days: number | null;
          name: string;
          recommended_storage_location:
            | Database['public']['Enums']['storage_location']
            | null;
          source_id: number | null;
          source_ref: string | null;
          unit: Database['public']['Enums']['unit'] | null;
          updated_at: string;
        };
        Insert: {
          amount?: number | null;
          barcode?: string | null;
          brand: string;
          category?: string | null;
          created_at?: string;
          expiry_type: Database['public']['Enums']['expiry_type'];
          id?: number;
          image_url?: string | null;
          lifespan_in_days?: number | null;
          name: string;
          recommended_storage_location?:
            | Database['public']['Enums']['storage_location']
            | null;
          source_id?: number | null;
          source_ref?: string | null;
          unit?: Database['public']['Enums']['unit'] | null;
          updated_at?: string;
        };
        Update: {
          amount?: number | null;
          barcode?: string | null;
          brand?: string;
          category?: string | null;
          created_at?: string;
          expiry_type?: Database['public']['Enums']['expiry_type'];
          id?: number;
          image_url?: string | null;
          lifespan_in_days?: number | null;
          name?: string;
          recommended_storage_location?:
            | Database['public']['Enums']['storage_location']
            | null;
          source_id?: number | null;
          source_ref?: string | null;
          unit?: Database['public']['Enums']['unit'] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'grocery_item_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'grocery_item';
            referencedColumns: ['id'];
          },
        ];
      };
      grocery_item_source: {
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
      user: {
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
      user_grocery_item: {
        Row: {
          consumed_at: string | null;
          consumption_prediction: number | null;
          created_at: string;
          discarded_at: string | null;
          expiry_date: string | null;
          grocery_item_id: number;
          id: number;
          location_changed_at: string | null;
          move_count: number;
          opened_at: string | null;
          percentage_remaining: number;
          percentage_remaining_when_discarded: number | null;
          purchased_at: string | null;
          sec_in_freezer: number;
          sec_in_fridge: number;
          sec_in_pantry: number;
          status: Database['public']['Enums']['grocery_item_status'];
          storage_location: Database['public']['Enums']['storage_location'];
          thaw_count: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          consumed_at?: string | null;
          consumption_prediction?: number | null;
          created_at?: string;
          discarded_at?: string | null;
          expiry_date?: string | null;
          grocery_item_id: number;
          id?: number;
          location_changed_at?: string | null;
          move_count?: number;
          opened_at?: string | null;
          percentage_remaining?: number;
          percentage_remaining_when_discarded?: number | null;
          purchased_at?: string | null;
          sec_in_freezer?: number;
          sec_in_fridge?: number;
          sec_in_pantry?: number;
          status?: Database['public']['Enums']['grocery_item_status'];
          storage_location: Database['public']['Enums']['storage_location'];
          thaw_count?: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          consumed_at?: string | null;
          consumption_prediction?: number | null;
          created_at?: string;
          discarded_at?: string | null;
          expiry_date?: string | null;
          grocery_item_id?: number;
          id?: number;
          location_changed_at?: string | null;
          move_count?: number;
          opened_at?: string | null;
          percentage_remaining?: number;
          percentage_remaining_when_discarded?: number | null;
          purchased_at?: string | null;
          sec_in_freezer?: number;
          sec_in_fridge?: number;
          sec_in_pantry?: number;
          status?: Database['public']['Enums']['grocery_item_status'];
          storage_location?: Database['public']['Enums']['storage_location'];
          thaw_count?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'User Grocery Item_grocery_item_id_fkey';
            columns: ['grocery_item_id'];
            isOneToOne: false;
            referencedRelation: 'grocery_item';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'User Grocery Item_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
        | 'gal';
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
      ],
    },
  },
} as const;
