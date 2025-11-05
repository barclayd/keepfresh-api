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
  search_lower TEXT;
  word_count INT;
  candidate_limit INT;
BEGIN
  PERFORM set_limit(similarity_threshold::real);

  search_lower := LOWER(search_query);
  word_count := array_length(string_to_array(search_lower, ' '), 1);

  -- Calculate dynamic limit based on current page needs
  -- Formula: page_limit + page_offset + buffer
  -- Page 1 (offset=0): 20 + 0 + 5 = 25 candidates (fast!)
  -- Page 2 (offset=20): 20 + 20 + 5 = 45 candidates
  -- Page 3 (offset=40): 20 + 40 + 5 = 65 candidates
  -- This optimizes for the common case (page 1) while supporting pagination
  candidate_limit := page_limit + page_offset + 5;

SELECT COUNT(DISTINCT (p.name, p.brand)) INTO total_results
FROM products p
WHERE
    (country_code IS NULL OR country_code = ANY(p.countries) OR 'WW' = ANY(p.countries))
  AND (
    p.search_vector @@ websearch_to_tsquery('english', search_query)
    OR p.name_lower % search_lower
    );

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
        -- ✅ TIER 0: EXACT CATEGORY MATCH (Highest priority for single-word searches)
        -- If user searches "milk", products in "Milk" category should dominate
        CASE
          WHEN word_count = 1 AND LOWER(c.name) = search_lower
          THEN 50000  -- Massively boost exact category matches
          ELSE 0
        END +

        -- TIER 1: EXACT PRODUCT NAME MATCH
        CASE WHEN p.name_lower = search_lower THEN 5000 ELSE 0 END +

        -- TIER 2: PREFIX MATCH
        CASE WHEN p.name_lower LIKE search_lower || '%' THEN 500 ELSE 0 END +

        -- TIER 3: FULL-TEXT SEARCH RANKING
        ts_rank_cd('{0.001, 0.01, 0.3, 1.0}', p.search_vector, websearch_to_tsquery('english', search_query)) * 100
      ) AS quick_score
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id  -- ✅ ADDED: Join with categories
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
        -- Note: Category bonus already applied in quick_score
        -- This final_score focuses on detailed similarity matching

        -- ═══════════════════════════════════════════════════════════
        -- TIER 0: EXACT CATEGORY MATCH (Already applied in quick_score)
        -- ═══════════════════════════════════════════════════════════
        -- Applying same massive bonus here to maintain ranking through final sort
        CASE
          WHEN word_count = 1 AND LOWER(qs.category_name) = search_lower
          THEN 50000  -- Match the quick_score bonus
          ELSE 0
        END +

        -- ═══════════════════════════════════════════════════════════
        -- TIER 1: EXACT NAME MATCH (Always highest priority)
        -- ═══════════════════════════════════════════════════════════
        CASE WHEN qs.name_lower = search_lower THEN 10000 ELSE 0 END +

        -- ═══════════════════════════════════════════════════════════
        -- TIER 2: WORD BOUNDARY DETECTION
        -- ═══════════════════════════════════════════════════════════
        CASE
          WHEN qs.name_lower = search_lower THEN 5000
          WHEN qs.name_lower ~ ('^' || search_lower || ' ') THEN 500
          WHEN qs.name_lower ~ (' ' || search_lower || ' ') THEN 300
          WHEN qs.name_lower ~ (' ' || search_lower || '$') THEN 800
          ELSE 0
        END +

        -- ═══════════════════════════════════════════════════════════
        -- TIER 3: NAME SIMILARITY (with length penalty)
        -- ═══════════════════════════════════════════════════════════
        (similarity(qs.name_lower, search_lower) * 40 /
          GREATEST(1, LENGTH(qs.name_lower) - LENGTH(search_lower))
        ) +

        -- ═══════════════════════════════════════════════════════════
        -- TIER 4: COMBINED MATCHING (For brand+product searches)
        -- ═══════════════════════════════════════════════════════════
        similarity(qs.source_name_lower || ' ' || qs.name_lower, search_lower) * 50 +
        similarity(qs.brand_lower || ' ' || qs.name_lower, search_lower) * 50 +

        -- ═══════════════════════════════════════════════════════════
        -- TIER 5: SOURCE/BRAND ALONE
        -- ═══════════════════════════════════════════════════════════
        similarity(qs.source_name_lower, search_lower) * 10 +
        similarity(qs.brand_lower, search_lower) * 10 +

        -- ═══════════════════════════════════════════════════════════
        -- TIER 6: FULL-TEXT SEARCH
        -- ═══════════════════════════════════════════════════════════
        ts_rank_cd('{0.001, 0.01, 0.3, 1.0}', qs.search_vector, websearch_to_tsquery('english', search_query)) * 2 +

        -- ═══════════════════════════════════════════════════════════
        -- TIER 7: GENERAL TEXT
        -- ═══════════════════════════════════════════════════════════
        similarity(qs.search_text, search_lower) * 0.1
      ) AS final_score
    FROM quick_scored qs
    ORDER BY
      qs.name,
      qs.brand,
      final_score DESC
  )
SELECT
    fs.id,
    fs.name,
    fs.brand,
    fs.storage_location,
    fs.expiry_type,
    fs.category_id,
    fs.category_name,
    fs.category_icon,
    fs.category_path_display,
    fs.amount,
    fs.unit,
    total_results
FROM final_scored fs
ORDER BY fs.final_score DESC
    LIMIT page_limit
OFFSET page_offset;
END;
$$;