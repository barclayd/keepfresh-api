-- Essential indexes for the categories table
CREATE INDEX IF NOT EXISTS idx_category_path ON categories USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_category_text ON categories USING GIN ((path::text) gin_trgm_ops);

-- If you have other columns that are frequently queried
CREATE INDEX IF NOT EXISTS idx_category_id ON categories (id);

-- For the preference rules table
CREATE INDEX IF NOT EXISTS idx_pref_context ON category_preferences (context_pattern);
CREATE INDEX IF NOT EXISTS idx_pref_path ON category_preferences (path_pattern);