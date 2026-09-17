-- =============================================================
-- Veasna Shop — seed data aligned with API_CONTRACT.md
-- =============================================================

-- Users
INSERT INTO users (name, email, password_hash, role)
VALUES
  ('Admin',  'admin@veasnashop.com',  '$2b$10$xOhgK7MBvbs4XlDw5yQ8eOQ9wQXcJcYTYa1E1lTF9niHOtg2x9hMy', 'admin'),
  ('Elena R.', 'customer@veasnashop.com', '$2b$10$fsjvtoLjGM1iYSd5cuYOoeJPZBGuoNX6fUyctT9CP8Fseu0Mhh1ue', 'customer')
ON CONFLICT (email) DO NOTHING;

-- Categories (flat parent rows + child rows)
INSERT INTO categories (id, name, slug, description, image, sort_order)
VALUES
  (1,  'Living & Decor',       'living',              'Muted clay, tactile stoneware & mineral glazes', 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80', 1),
  (2,  'Artisanal Ceramics',   'ceramics-table',      'Tactile stoneware, hand-thrown pitchers',        'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80', 1),
  (3,  'Studio Kitchen & Dining','kitchen-dining',     'Stoneware mugs, plates, and bowls',              'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', 2),
  (4,  'Apparel & Linen',      'apparel-linen',       'Slow fashion, organic linen and cotton',         'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80', 2),
  (5,  'Washed Organic Linen', 'linen-care',          'Pre-washed linen robes and throws',              'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80', 1),
  (6,  'Slow Fashion',         'slow-fashion',        'Minimal-cut garments in natural fibers',         'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80', 2),
  (7,  'Scents & Botanicals',  'scents-botanicals',   'Steam-distilled essential oils and botanical candles','https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80', 3),
  (8,  'Botanical Scent',      'botanicals',          'Hand-poured candles and room sprays',            'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=800&q=80', 1),
  (9,  'Apothecary',           'apothecary',          'Small-batch bath salts and body care',           'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80', 2),
  (10, 'Handwoven Textiles',   'textiles-linen',      'Artisan-woven throws and cushion covers',        'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80', 4),
  (11, 'Stoneware Clay',       'stoneware-clay',      'Wood-fired functional pottery',                  'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80', 3)
ON CONFLICT (id) DO NOTHING;

-- Fix parent links
UPDATE categories SET parent_id = 1  WHERE slug IN ('ceramics-table','kitchen-dining');
UPDATE categories SET parent_id = 4  WHERE slug IN ('linen-care','slow-fashion');
UPDATE categories SET parent_id = 7  WHERE slug IN ('botanicals','apothecary');
UPDATE categories SET parent_id = 10 WHERE slug = 'stoneware-clay';

-- Products
INSERT INTO products (id, category_id, name, slug, description, base_price, original_price, is_active, rating, review_count, tag, image, color)
VALUES
  (1,  2, 'Kyoto Stone Pitcher',        'kyoto-stone-pitcher',        'Hand-thrown pitcher with a matte mineral glaze.',          74.00,  180.00, TRUE, 4.9, 64,  'Artisan Made',   'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80', '#4A705E'),
  (2,  2, 'Wabi-Sabi Tea Bowl',         'wabi-sabi-tea-bowl',         'Raku-fired tea bowl with natural ash glaze.',              48.00,  NULL,  TRUE, 4.8, 52,  NULL,             'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80', '#D6C7B2'),
  (3,  3, 'Zen Pour-Over Set',          'zen-pour-over-set',          'Minimalist pour-over with double-wall filter.',            62.00,  NULL,  TRUE, 4.7, 41,  'Bestseller',     'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', '#343837'),
  (4,  5, 'Pure Washed Organic Linen Robe','pure-linen-robe',          'Pre-washed GOTS organic linen robe.',                     145.00,  NULL,  TRUE, 4.9, 128, 'Eco-Wash',       'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80', '#4A705E'),
  (5,  8, 'Hinoki & Smoked Moss Candle','hinoki-smoked-moss-candle',  'Hand-poured soy wax candle, 55 hr burn.',                  38.00,  NULL,  TRUE, 4.6, 87,  NULL,             'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80', '#6B5B3E'),
  (6,  9, 'Cedar & Vetiver Bath Salt',  'cedar-vetiver-bath-salt',    'Steam-distilled mineral bath soak, 400g.',                 24.00,  NULL,  TRUE, 4.8, 35,  NULL,             'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80', '#3A5A40'),
  (7,  11,'Komorebi Stoneware Teapot',  'komorebi-teapot',            'Wood-fired teapot with bamboo handle.',                   84.00,  NULL,  TRUE, 4.9, 64,  'Bestseller',     'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80', '#5C4B2A'),
  (8,  10,'Handwoven Linen Throw',      'handwoven-linen-throw',      'Artisan-woven throw in natural undyed linen.',            98.00,  140.00, TRUE, 4.7, 45,  'New Arrival',    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80', '#B8A88A'),
  (9,  6, 'Minimalist Cotton Dress',    'minimalist-cotton-dress',    'Relaxed-fit organic cotton day dress.',                   92.00,  NULL,  TRUE, 4.5, 29,  NULL,             'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80', '#E8DDD3'),
  (10, 3, 'Ceramic Sake Set',           'ceramic-sake-set',           'Set of 4 small cups and a tokkuri flask.',                56.00,  NULL,  TRUE, 4.6, 38,  NULL,             'https://images.unsplash.com/photo-1565183997392-2f6f122e5912?auto=format&fit=crop&w=800&q=80', '#8C7A5B'),
  (11, 2, 'Raku Incense Holder',        'raku-incense-holder',        'Raku-fired incense holder with ash tray.',                32.00,  NULL,  TRUE, 4.4, 19,  NULL,             'https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=800&q=80', '#6E6050'),
  (12, 8,'Botanical Room Spray',        'botanical-room-spray',       'Linen and room mist, 120ml.',                             28.00,  NULL,  TRUE, 4.3, 22,  NULL,             'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=800&q=80', '#A4B494')
ON CONFLICT (id) DO NOTHING;

SELECT setval('products_id_seq', 12);
SELECT setval('categories_id_seq', 11);

-- Product variants
INSERT INTO product_variants (product_id, sku, variant_type, variant_name, price_adjustment, stock_quantity)
VALUES
  (1,  'KSP-SAGE-01',   'color',  'Sage Moss',   0.00,  30),
  (1,  'KSP-STN-01',    'color',  'Stone',        0.00,  25),
  (1,  'KSP-CLY-01',    'color',  'Clay',         0.00,  20),
  (2,  'WST-SAGE-01',   'color',  'Sage Moss',   0.00,  18),
  (2,  'WST-IVR-01',    'color',  'Ivory',        0.00,  22),
  (3,  'ZPO-BLK-01',    'color',  'Matte Black',  0.00,  40),
  (3,  'ZPO-WHT-01',    'color',  'Porcelain',   10.00,  15),
  (4,  'PLR-XS-S',      'size',   'XS / S',       0.00,  14),
  (4,  'PLR-M-L',       'size',   'M / L',        0.00,  20),
  (4,  'PLR-XL-XXL',    'size',   'XL / XXL',     0.00,  8),
  (5,  'HSC-HNK-01',    'scent',  'Hinoki',       0.00,  45),
  (5,  'HSC-CED-01',    'scent',  'Cedar & Vetiver', 0.00, 30),
  (5,  'HSC-SMK-01',    'scent',  'Smoked Moss',  0.00,  25),
  (6,  'CVS-CED-400',   'size',   '400g',         0.00,  50),
  (6,  'CVS-CED-200',   'size',   '200g',         0.00,  35),
  (7,  'KST-SAGE-01',   'color',  'Sage Moss',   0.00,  12),
  (7,  'KST-STN-01',    'color',  'Stone',        0.00,  16),
  (7,  'KST-CLY-01',    'color',  'Clay',         0.00,  10),
  (8,  'HWT-NAT-01',    'color',  'Natural Linen', 0.00, 22),
  (9,  'MCD-WHT-S',     'size',   'S',            0.00,  18),
  (9,  'MCD-WHT-M',     'size',   'M',            0.00,  22),
  (9,  'MCD-WHT-L',     'size',   'L',            0.00,  15),
  (10, 'CSS-CLR-4',     'size',   'Set of 4',     0.00,  30),
  (11, 'RIH-GLD-01',    'color',  'Gold Ash',     5.00,  12),
  (11, 'RIH-NTL-01',    'color',  'Natural',      0.00,  18),
  (12, 'BRS-HNK-120',   'scent',  'Hinoki',       0.00,  28),
  (12, 'BRS-LAV-120',   'scent',  'Lavender',     0.00,  32);

-- Product pairings
INSERT INTO product_pairings (product_id, pairing_product_id)
VALUES
  (5,  6),   -- Hinoki Candle <-> Cedar Bath Salt
  (5,  12),  -- Hinoki Candle <-> Botanical Spray
  (6,  5),   -- Cedar Bath Salt <-> Hinoki Candle
  (1,  2),   -- Kyoto Pitcher <-> Wabi-Sabi Bowl
  (1,  7),   -- Kyoto Pitcher <-> Komorebi Teapot
  (2,  1),   -- Wabi-Sabi Bowl <-> Kyoto Pitcher
  (7,  1),   -- Komorebi Teapot <-> Kyoto Pitcher
  (7,  10),  -- Komorebi Teapot <-> Sake Set
  (4,  8),   -- Linen Robe <-> Linen Throw
  (8,  4),   -- Linen Throw <-> Linen Robe
  (3,  10),  -- Pour-Over Set <-> Sake Set
  (11, 5),   -- Incense Holder <-> Hinoki Candle
  (12, 6);   -- Botanical Spray <-> Cedar Bath Salt

-- Default address for the customer user
INSERT INTO addresses (user_id, label, line1, line2, city, state, zip, country, is_default)
VALUES (2, 'Home', '742 Evergreen Terrace', '', 'Portland', 'OR', '97201', 'US', TRUE);

-- Default ritual profile for the customer user
INSERT INTO ritual_profiles (user_id, skin_type, scent_preferences, material_preferences, size_preference, lifestyle_notes)
VALUES (2, 'Normal', 'woody, earthy', 'organic linen, raw cotton', 'M / L', 'Prefers slow-made, minimal-waste products');
