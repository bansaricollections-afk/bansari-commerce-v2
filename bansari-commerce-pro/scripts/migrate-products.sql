insert into public.products (
    sku,
    name,
    slug,
    description,
    category,
    collection,
    price,
    old_price,
    discount,
    stock,
    featured,
    badge,
    rating,
    review_count,
    specifications,
    images
)
values (
    'BC-KS-0001',
    'Pink Embroidered Kurta Set',
    'pink-embroidered-kurta-set',
    'Premium embroidered kurta set designed for festive celebrations and elegant occasions.',
    'Kurta Sets',
    'Celebration Edit',
    2499,
    3499,
    29,
    25,
    true,
    'New Arrival',
    4.8,
    126,
    '{
      "fabric":"Cotton Blend",
      "work":"Embroidery",
      "neckline":"Round Neck",
      "sleeve":"3/4 Sleeve",
      "fit":"Regular",
      "occasion":["Festive","Office"],
      "care":"Gentle Hand Wash"
    }'::jsonb,
    '[
      {
        "id":"1",
        "url":"/products/p1.png",
        "alt":"Pink Kurta Front",
        "type":"front"
      }
    ]'::jsonb
);
