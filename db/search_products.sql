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
  has_next BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
search_lower TEXT;
  word_count INT;
  candidate_limit INT;
  result_count INT;
BEGIN
  PERFORM set_limit(similarity_threshold::real);

  search_lower := LOWER(search_query);
  word_count := array_length(string_to_array(search_lower, ' '), 1);

  -- Fetch one extra to determine if there's a next page
  candidate_limit := page_limit + page_offset + 6;

RETURN QUERY
    WITH
    quick_scored AS (
      SELECT
        p.id,
        p.name,
        p.brand,
        p.storage_location,
        p.expiry_type,
        p.category_id,
        p.name_lower,
        p.brand_lower,
        p.source_name_lower,
        p.search_vector,
        p.search_text,
        p.amount,
        p.unit,
        c.name AS category_name,
        c.icon AS category_icon,
        c.path_display AS category_path_display,
        (
          CASE
            WHEN word_count = 1 AND LOWER(c.name) = search_lower
            THEN 50000
            ELSE 0
          END +
          CASE WHEN p.name_lower = search_lower THEN 5000 ELSE 0 END +
          CASE WHEN p.name_lower LIKE search_lower || '%' THEN 500 ELSE 0 END +
          ts_rank_cd('{0.001, 0.01, 0.3, 1.0}', p.search_vector, websearch_to_tsquery('english', search_query)) * 100
        ) AS quick_score
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      WHERE
        (country_code IS NULL OR country_code = ANY(p.countries) OR 'WW' = ANY(p.countries))
        AND (
          p.search_vector @@ websearch_to_tsquery('english', search_query)
          OR p.name_lower % search_lower
        )
      ORDER BY quick_score DESC
      LIMIT candidate_limit
    ),
    final_scored AS (
      SELECT DISTINCT ON (qs.name, qs.brand)
        qs.id,
        qs.name,
        qs.brand,
        qs.storage_location,
        qs.expiry_type,
        qs.category_id,
        qs.category_name,
        qs.category_icon,
        qs.category_path_display,
        qs.amount,
        qs.unit,
        (
          CASE
            WHEN word_count = 1 AND LOWER(qs.category_name) = search_lower
            THEN 50000
            ELSE 0
          END +
          CASE WHEN qs.name_lower = search_lower THEN 10000 ELSE 0 END +
          CASE
            WHEN qs.name_lower = search_lower THEN 5000
            WHEN qs.name_lower LIKE search_lower || ' %' THEN 500
            WHEN qs.name_lower LIKE '% ' || search_lower || ' %' THEN 300
            WHEN qs.name_lower LIKE '% ' || search_lower THEN 800
            ELSE 0
          END +
          (similarity(qs.name_lower, search_lower) * 40 /
            GREATEST(1, LENGTH(qs.name_lower) - LENGTH(search_lower))
          ) +
          similarity(qs.source_name_lower || ' ' || qs.name_lower, search_lower) * 50 +
          similarity(qs.brand_lower || ' ' || qs.name_lower, search_lower) * 50 +
          similarity(qs.source_name_lower, search_lower) * 10 +
          similarity(qs.brand_lower, search_lower) * 10 +
          ts_rank_cd('{0.001, 0.01, 0.3, 1.0}', qs.search_vector, websearch_to_tsquery('english', search_query)) * 2 +
          similarity(qs.search_text, search_lower) * 0.1
        ) AS final_score
      FROM quick_scored qs
      ORDER BY qs.name, qs.brand, final_score DESC
    ),
    paginated AS (
      SELECT
        fs.*,
        ROW_NUMBER() OVER (ORDER BY fs.final_score DESC) AS rn
      FROM final_scored fs
      ORDER BY fs.final_score DESC
      LIMIT page_limit + 1
      OFFSET page_offset
    )
SELECT
    p.id,
    p.name,
    p.brand,
    p.storage_location,
    p.expiry_type,
    p.category_id,
    p.category_name,
    p.category_icon,
    p.category_path_display,
    p.amount,
    p.unit,
    (SELECT COUNT(*) FROM paginated) > page_limit AS has_next
FROM paginated p
WHERE p.rn <= page_limit
ORDER BY p.final_score DESC;
END;
$$;