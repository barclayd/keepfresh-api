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
BEGIN
  PERFORM set_limit(similarity_threshold::real);

  search_lower := LOWER(search_query);
  word_count := array_length(string_to_array(search_lower, ' '), 1);
  candidate_limit := page_limit + page_offset + 5;

  -- Fast path for GB (uses partial index)
  IF country_code = 'GB' THEN
    RETURN QUERY
    WITH
      prefetch AS (
        SELECT
          p.id, p.name, p.brand, p.storage_location, p.expiry_type,
          p.category_id, p.name_lower, p.brand_lower, p.source_name_lower,
          p.search_vector, p.search_text, p.amount, p.unit,
          c.name AS category_name, c.icon AS category_icon, c.path_display AS category_path_display,
          ts_rank_cd(p.search_vector, websearch_to_tsquery('english', search_query)) AS prefetch_score
        FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE
          ('GB' = ANY(p.countries) OR 'WW' = ANY(p.countries))
          AND (
            p.search_vector @@ websearch_to_tsquery('english', search_query)
            OR p.name_lower % search_lower
          )
        ORDER BY prefetch_score DESC
        LIMIT 150
      ),
      quick_scored AS (
        SELECT
          pf.*,
          (
            CASE WHEN word_count = 1 AND LOWER(pf.category_name) = search_lower THEN 50000 ELSE 0 END +
            CASE WHEN pf.name_lower = search_lower THEN 5000 ELSE 0 END +
            CASE WHEN pf.name_lower LIKE search_lower || '%' THEN 500 ELSE 0 END +
            ts_rank_cd('{0.001, 0.01, 0.3, 1.0}', pf.search_vector, websearch_to_tsquery('english', search_query)) * 100
          ) AS quick_score
        FROM prefetch pf
        ORDER BY quick_score DESC
        LIMIT candidate_limit
      ),
      scored AS (
        SELECT
          qs.id, qs.name, qs.brand, qs.storage_location, qs.expiry_type,
          qs.category_id, qs.category_name, qs.category_icon, qs.category_path_display,
          qs.amount, qs.unit,
          (
            CASE WHEN word_count = 1 AND LOWER(qs.category_name) = search_lower THEN 50000 ELSE 0 END +
            CASE WHEN qs.name_lower = search_lower THEN 10000 ELSE 0 END +
            CASE
              WHEN qs.name_lower = search_lower THEN 5000
              WHEN qs.name_lower LIKE search_lower || ' %' THEN 500
              WHEN qs.name_lower LIKE '% ' || search_lower || ' %' THEN 300
              WHEN qs.name_lower LIKE '% ' || search_lower THEN 800
              ELSE 0
            END +
            (similarity(qs.name_lower, search_lower) * 40 / GREATEST(1, LENGTH(qs.name_lower) - LENGTH(search_lower))) +
            similarity(qs.source_name_lower || ' ' || qs.name_lower, search_lower) * 50 +
            similarity(qs.brand_lower || ' ' || qs.name_lower, search_lower) * 50 +
            similarity(qs.source_name_lower, search_lower) * 10 +
            similarity(qs.brand_lower, search_lower) * 10 +
            ts_rank_cd('{0.001, 0.01, 0.3, 1.0}', qs.search_vector, websearch_to_tsquery('english', search_query)) * 2 +
            similarity(qs.search_text, search_lower) * 0.1
          ) AS final_score
        FROM quick_scored qs
      ),
      dedupe_name_brand AS (
        SELECT DISTINCT ON (s.name, s.brand)
          s.*
        FROM scored s
        ORDER BY s.name, s.brand, s.final_score DESC
      ),
      final_scored AS (
        SELECT DISTINCT ON (d.id)
          d.*
        FROM dedupe_name_brand d
        ORDER BY d.id, d.final_score DESC
      ),
      paginated AS (
        SELECT fs.*, ROW_NUMBER() OVER (ORDER BY fs.final_score DESC) AS rn
        FROM final_scored fs
      )
SELECT
    p.id, p.name, p.brand, p.storage_location, p.expiry_type,
    p.category_id, p.category_name, p.category_icon, p.category_path_display,
    p.amount, p.unit,
    (SELECT COUNT(*) FROM paginated) > page_limit
FROM paginated p
WHERE p.rn > page_offset AND p.rn <= page_offset + page_limit
ORDER BY p.final_score DESC;

-- Slow path for other countries
ELSE
    RETURN QUERY
    WITH
      prefetch AS (
        SELECT
          p.id, p.name, p.brand, p.storage_location, p.expiry_type,
          p.category_id, p.name_lower, p.brand_lower, p.source_name_lower,
          p.search_vector, p.search_text, p.amount, p.unit,
          c.name AS category_name, c.icon AS category_icon, c.path_display AS category_path_display,
          ts_rank_cd(p.search_vector, websearch_to_tsquery('english', search_query)) AS prefetch_score
        FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE
          (country_code IS NULL OR country_code = ANY(p.countries) OR 'WW' = ANY(p.countries))
          AND (
            p.search_vector @@ websearch_to_tsquery('english', search_query)
            OR p.name_lower % search_lower
          )
        ORDER BY prefetch_score DESC
        LIMIT 150
      ),
      quick_scored AS (
        SELECT
          pf.*,
          (
            CASE WHEN word_count = 1 AND LOWER(pf.category_name) = search_lower THEN 50000 ELSE 0 END +
            CASE WHEN pf.name_lower = search_lower THEN 5000 ELSE 0 END +
            CASE WHEN pf.name_lower LIKE search_lower || '%' THEN 500 ELSE 0 END +
            ts_rank_cd('{0.001, 0.01, 0.3, 1.0}', pf.search_vector, websearch_to_tsquery('english', search_query)) * 100
          ) AS quick_score
        FROM prefetch pf
        ORDER BY quick_score DESC
        LIMIT candidate_limit
      ),
      scored AS (
        SELECT
          qs.id, qs.name, qs.brand, qs.storage_location, qs.expiry_type,
          qs.category_id, qs.category_name, qs.category_icon, qs.category_path_display,
          qs.amount, qs.unit,
          (
            CASE WHEN word_count = 1 AND LOWER(qs.category_name) = search_lower THEN 50000 ELSE 0 END +
            CASE WHEN qs.name_lower = search_lower THEN 10000 ELSE 0 END +
            CASE
              WHEN qs.name_lower = search_lower THEN 5000
              WHEN qs.name_lower LIKE search_lower || ' %' THEN 500
              WHEN qs.name_lower LIKE '% ' || search_lower || ' %' THEN 300
              WHEN qs.name_lower LIKE '% ' || search_lower THEN 800
              ELSE 0
            END +
            (similarity(qs.name_lower, search_lower) * 40 / GREATEST(1, LENGTH(qs.name_lower) - LENGTH(search_lower))) +
            similarity(qs.source_name_lower || ' ' || qs.name_lower, search_lower) * 50 +
            similarity(qs.brand_lower || ' ' || qs.name_lower, search_lower) * 50 +
            similarity(qs.source_name_lower, search_lower) * 10 +
            similarity(qs.brand_lower, search_lower) * 10 +
            ts_rank_cd('{0.001, 0.01, 0.3, 1.0}', qs.search_vector, websearch_to_tsquery('english', search_query)) * 2 +
            similarity(qs.search_text, search_lower) * 0.1
          ) AS final_score
        FROM quick_scored qs
      ),
      -- First: dedupe by name+brand, keeping highest score
      dedupe_name_brand AS (
        SELECT DISTINCT ON (s.name, s.brand)
          s.*
        FROM scored s
        ORDER BY s.name, s.brand, s.final_score DESC
      ),
      final_scored AS (
        SELECT DISTINCT ON (d.id)
          d.*
        FROM dedupe_name_brand d
        ORDER BY d.id, d.final_score DESC
      ),
      paginated AS (
        SELECT fs.*, ROW_NUMBER() OVER (ORDER BY fs.final_score DESC) AS rn
        FROM final_scored fs
      )
SELECT
    p.id, p.name, p.brand, p.storage_location, p.expiry_type,
    p.category_id, p.category_name, p.category_icon, p.category_path_display,
    p.amount, p.unit,
    (SELECT COUNT(*) FROM paginated) > page_limit
FROM paginated p
WHERE p.rn > page_offset AND p.rn <= page_offset + page_limit
ORDER BY p.final_score DESC;
END IF;
END;
$$;