CREATE OR REPLACE FUNCTION search_products(
  search_query TEXT,
  country_code TEXT DEFAULT 'GB',
  use_fuzzy BOOLEAN DEFAULT TRUE,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id BIGINT,
  name VARCHAR,
  brand VARCHAR,
  storage_location storage_location,
  expiry_type expiry_type,
  category_id BIGINT,
  category_name VARCHAR,
  category_path VARCHAR,
  category_icon VARCHAR,
  amount DOUBLE PRECISION,
  unit unit
)
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_limit(similarity_threshold::real);  -- Cast to real

  IF use_fuzzy THEN
    RETURN QUERY
SELECT
    p.id,
    p.name,
    p.brand,
    p.storage_location,
    p.expiry_type,
    c.id AS category_id,
    c.name AS category_name,
    c.path_display AS category_path,
    c.icon AS category_icon,
    p.amount,
    p.unit
FROM products p
         INNER JOIN categories c ON p.category_id = c.id
WHERE
    (country_code IS NULL OR country_code = ANY(p.countries))
  AND (
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
    RETURN QUERY
SELECT
    p.id,
    p.name,
    p.brand,
    p.storage_location,
    p.expiry_type,
    c.id AS category_id,
    c.name AS category_name,
    c.path_display AS category_path,
    c.icon AS category_icon,
    p.amount,
    p.unit
FROM products p
         INNER JOIN categories c ON p.category_id = c.id
WHERE
    (country_code IS NULL OR country_code = ANY(p.countries))
  AND p.search_vector @@ websearch_to_tsquery('english', search_query)
ORDER BY ts_rank_cd(p.search_vector, websearch_to_tsquery('english', search_query)) DESC;
END IF;
END;
$$;