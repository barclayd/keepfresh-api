INSERT INTO products (
    created_at, name, brand, lifespan_in_days, expiry_type,
    barcode, updated_at, storage_location, amount, unit,
    category_id, source_id, source_ref, countries
)
SELECT
    COALESCE(created_at, NOW()),
    name,
    brand,
    lifespan_in_days,
    expiry_type::expiry_type,
    barcode,
    COALESCE(updated_at, NOW()),
    storage_location::storage_location,
    amount,
    unit::unit,
    category_id,
    source_id,
    source_ref,
    CASE
        WHEN countries IS NULL OR countries = '' THEN ARRAY['GB']
        ELSE string_to_array(countries, '|')
        END
FROM temp_products
    ON CONFLICT (source_id, source_ref)
DO UPDATE SET
    name = EXCLUDED.name,
           brand = EXCLUDED.brand,
           lifespan_in_days = EXCLUDED.lifespan_in_days,
           expiry_type = EXCLUDED.expiry_type,
           barcode = EXCLUDED.barcode,
           updated_at = NOW(),
           storage_location = EXCLUDED.storage_location,
           amount = EXCLUDED.amount,
           unit = EXCLUDED.unit,
           category_id = EXCLUDED.category_id,
           countries = EXCLUDED.countries;