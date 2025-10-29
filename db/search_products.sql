CREATE OR REPLACE FUNCTION search_products(
  search_query TEXT,
  filter_country TEXT DEFAULT 'GB',
  use_fuzzy BOOLEAN DEFAULT TRUE,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set similarity threshold for fuzzy search
  PERFORM set_limit(similarity_threshold);

  IF use_fuzzy THEN
    -- Hybrid search: combines full-text search with fuzzy matching
    RETURN QUERY
SELECT jsonb_build_object(
               'id', p.id,
               'name', p.name,
               'brand', p.brand,
               'storage_location', p.storage_location,
               'expiry_type', p.expiry_type,
               'category', jsonb_build_object(
                       'id', c.id,
                       'name', c.name,
                       'path', c.path::text,
                       'icon', c.icon,
                       'shelf_life_in_pantry_in_days_unopened', c.shelf_life_in_pantry_in_days_unopened,
                       'shelf_life_in_pantry_in_days_opened', c.shelf_life_in_pantry_in_days_opened,
                       'shelf_life_in_fridge_in_days_unopened', c.shelf_life_in_fridge_in_days_unopened,
                       'shelf_life_in_fridge_in_days_opened', c.shelf_life_in_fridge_in_days_opened,
                       'shelf_life_in_freezer_in_days_unopened', c.shelf_life_in_freezer_in_days_unopened,
                       'shelf_life_in_freezer_in_days_opened', c.shelf_life_in_freezer_in_days_opened
                           ),
               'amount', p.amount,
               'unit', p.unit,
               'relevance_score', (
                   ts_rank_cd(p.search_vector, websearch_to_tsquery('english', search_query)) * 2 +
                   similarity(p.search_text, search_query)
                   )
       ) AS result
FROM products p
         INNER JOIN categories c ON p.category_id = c.id
WHERE
  -- Country filter
    (filter_country = ANY(p.countries))
  AND (
    -- Match either full-text OR fuzzy
    p.search_vector @@ websearch_to_tsquery('english', search_query)
    OR p.search_text % search_query
    OR p.name % search_query
    OR p.brand % search_query
    )
ORDER BY (
             ts_rank_cd(p.search_vector, websearch_to_tsquery('english', search_query)) * 2 +
             similarity(p.search_text, search_query)
             ) DESC;
ELSE
    -- Standard full-text search only
    RETURN QUERY
SELECT jsonb_build_object(
               'id', p.id,
               'name', p.name,
               'brand', p.brand,
               'storage_location', p.storage_location,
               'expiry_type', p.expiry_type,
               'category', jsonb_build_object(
                       'id', c.id,
                       'name', c.name,
                       'path', c.path::text,
                       'icon', c.icon,
                       'shelf_life_in_pantry_in_days_unopened', c.shelf_life_in_pantry_in_days_unopened,
                       'shelf_life_in_pantry_in_days_opened', c.shelf_life_in_pantry_in_days_opened,
                       'shelf_life_in_fridge_in_days_unopened', c.shelf_life_in_fridge_in_days_unopened,
                       'shelf_life_in_fridge_in_days_opened', c.shelf_life_in_fridge_in_days_opened,
                       'shelf_life_in_freezer_in_days_unopened', c.shelf_life_in_freezer_in_days_unopened,
                       'shelf_life_in_freezer_in_days_opened', c.shelf_life_in_freezer_in_days_opened
                           ),
               'amount', p.amount,
               'unit', p.unit,
               'relevance_score', ts_rank_cd(p.search_vector, websearch_to_tsquery('english', search_query))
       ) AS result
FROM products p
         INNER JOIN categories c ON p.category_id = c.id
WHERE
-- Country filter
    (filter_country = ANY(p.countries))
  AND p.search_vector @@ websearch_to_tsquery('english', search_query)
ORDER BY ts_rank_cd(p.search_vector, websearch_to_tsquery('english', search_query)) DESC;
END IF;
END;
$$;