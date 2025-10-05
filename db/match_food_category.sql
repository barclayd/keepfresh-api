CREATE OR REPLACE FUNCTION match_food_category(api_categories text[])
RETURNS TABLE (
    id bigint,
    name varchar,
    path ltree,
    image_url varchar,
    icon varchar,
    path_display varchar,
    recommended_storage_location storage_location
)
LANGUAGE plpgsql
AS $$
DECLARE
i int;
    clean_term text;
    best_match record;
    context_terms text;
    search_words text[];
BEGIN
    context_terms := lower(array_to_string(api_categories, ' '));

FOR i IN REVERSE array_upper(api_categories, 1)..1 LOOP
        -- Clean the term: treat hyphens as spaces, remove plurals
        clean_term := lower(
            regexp_replace(
                regexp_replace(
                    regexp_replace(api_categories[i], '-', ' ', 'g'),
                    's$', '', 'g'
                ),
                '[^a-zA-Z0-9\s]', '', 'g'
            )
        );

        -- Split into individual words
        search_words := string_to_array(clean_term, ' ');

        -- Score categories by how many words match
SELECT
    c.id,
    c.name,
    c.path,
    c.image_url,
    c.icon,
    c.path_display,
    c.recommended_storage_location,
    (
        SELECT COUNT(*)::float
        FROM unnest(search_words) w
        WHERE lower(c.path::text) LIKE '%' || w || '%'
    ) / array_length(search_words, 1)::float as word_match_score,
    COALESCE(MIN(p.preference_score), 5) as pref_score
INTO best_match
FROM categories c
         LEFT JOIN category_preferences p
                   ON context_terms LIKE p.context_pattern
                       AND lower(c.path::text) LIKE lower(p.path_pattern)
WHERE EXISTS (
    SELECT 1 FROM unnest(search_words) w
    WHERE lower(c.path::text) LIKE '%' || w || '%'
)
GROUP BY c.id, c.name, c.path, c.image_url, c.icon, c.path_display, c.recommended_storage_location
ORDER BY
    word_match_score DESC,
    pref_score ASC,
    nlevel(c.path) DESC
    LIMIT 1;

IF best_match.path IS NOT NULL AND best_match.word_match_score > 0 THEN
            RETURN QUERY
SELECT
    best_match.id,
    best_match.name,
    best_match.path,
    best_match.image_url,
    best_match.icon,
    best_match.path_display,
    best_match.recommended_storage_location;
RETURN;
END IF;

        -- Try fuzzy matching if no word matches found
SELECT
    c.id,
    c.name,
    c.path,
    c.image_url,
    c.icon,
    c.path_display,
    c.recommended_storage_location,
    similarity(lower(c.path::text), clean_term) as sim_score,
    COALESCE(MIN(p.preference_score), 5) as pref_score
INTO best_match
FROM categories c
         LEFT JOIN category_preferences p
                   ON context_terms LIKE p.context_pattern
                       AND lower(c.path::text) LIKE lower(p.path_pattern)
WHERE similarity(lower(c.path::text), clean_term) > 0.3
GROUP BY c.id, c.name, c.path, c.image_url, c.icon, c.path_display, c.recommended_storage_location
ORDER BY
    sim_score DESC,
    pref_score ASC,
    nlevel(c.path) DESC
    LIMIT 1;

IF best_match.path IS NOT NULL AND best_match.sim_score > 0.4 THEN
            RETURN QUERY
SELECT
    best_match.id,
    best_match.name,
    best_match.path,
    best_match.image_url,
    best_match.icon,
    best_match.path_display,
    best_match.recommended_storage_location;
RETURN;
END IF;
END LOOP;

    RETURN;
END;
$$;