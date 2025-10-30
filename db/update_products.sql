-- Get search results
CREATE OR REPLACE FUNCTION search_products_paginated(
  search_query TEXT,
  country_code TEXT DEFAULT 'GB',
  similarity_threshold FLOAT DEFAULT 0.3,
  page_limit INT DEFAULT 20,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  name VARCHAR,
  brand VARCHAR,
  storage_location storage_location,
  expiry_type expiry_type,
  category_id BIGINT,
  category_name VARCHAR,
  category_icon VARCHAR,
  category_path_display VARCHAR,
  amount DOUBLE PRECISION,
  unit unit,
  total_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
total_results BIGINT;
BEGIN
  PERFORM set_limit(similarity_threshold::real);

  -- Get total count first
SELECT COUNT(*) INTO total_results
FROM products p
WHERE
    (country_code IS NULL OR country_code = ANY(p.countries) OR 'WW' = ANY(p.countries))
  AND (
    p.search_vector @@ websearch_to_tsquery('english', search_query)
    OR p.search_text % search_query
    OR p.name % search_query
    OR p.brand % search_query
    );

-- Return paginated results with total count
RETURN QUERY
SELECT
    p.id,
    p.name,
    p.brand,
    p.storage_location,
    p.expiry_type,
    c.id AS category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    c.path_display AS category_path_display,
    p.amount,
    p.unit,
    total_results
FROM products p
         INNER JOIN categories c ON p.category_id = c.id
WHERE
    (country_code IS NULL OR country_code = ANY(p.countries) OR 'WW' = ANY(p.countries))
  AND (
    p.search_vector @@ websearch_to_tsquery('english', search_query)
    OR p.search_text % search_query
    OR p.name % search_query
    OR p.brand % search_query
    )
ORDER BY (
             ts_rank_cd(p.search_vector, websearch_to_tsquery('english', search_query)) * 2 +
             similarity(p.search_text, search_query)
             ) DESC
    LIMIT page_limit
OFFSET page_offset;
END;
$$;