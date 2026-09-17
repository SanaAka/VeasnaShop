const pool = require("../config/db");

exports.getAllProducts = async (req, res, next) => {
  try {
    const { category, search, sort, maxPrice } = req.query;

    let conditions = ["p.is_active = true"];
    let params = [];
    let idx = 1;

    if (category) {
      conditions.push(
        `(c.slug = $${idx} OR EXISTS (SELECT 1 FROM categories pc WHERE pc.id = c.parent_id AND pc.slug = $${idx + 1}))`
      );
      params.push(category, category);
      idx += 2;
    }

    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR c.name ILIKE $${idx} OR p.tag ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    if (maxPrice) {
      conditions.push(`p.base_price <= $${idx++}`);
      params.push(Number(maxPrice));
    }

    let orderBy = "p.id DESC";
    if (sort === "price-asc") orderBy = "p.base_price ASC";
    else if (sort === "price-desc") orderBy = "p.base_price DESC";
    else if (sort === "rating") orderBy = "p.rating DESC";
    else if (sort === "featured") orderBy = "p.review_count DESC";

    const result = await pool.query(
      `SELECT p.id, p.name, p.base_price AS price, p.original_price AS "originalPrice",
              p.rating, p.review_count AS reviews, p.tag, p.image, p.color,
              p.description,
              c.name AS category, c.slug AS "categorySlug"
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories cp ON cp.id = c.parent_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${orderBy}`,
      params
    );

    const DEFAULT_IMG = "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80";

    const products = result.rows.map((p) => ({
      ...p,
      image: p.image || DEFAULT_IMG,
    }));

    res.json({ products });
  } catch (err) {
    next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const productResult = await pool.query(
      `SELECT p.id, p.name, p.base_price AS price, p.original_price AS "originalPrice",
              p.rating, p.review_count AS reviews, p.tag, p.image, p.color,
              p.description,
              c.name AS category, c.slug AS "categorySlug"
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1 AND p.is_active = true`,
      [id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = productResult.rows[0];
    if (!product.image) {
      product.image = "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80";
    }

    const variantsResult = await pool.query(
      "SELECT id, variant_type, variant_name, sku, price_adjustment, stock_quantity FROM product_variants WHERE product_id = $1 ORDER BY id",
      [product.id]
    );

    const variantOptions = {};
    for (const v of variantsResult.rows) {
      if (!variantOptions[v.variant_type]) variantOptions[v.variant_type] = [];
      variantOptions[v.variant_type].push(v.variant_name);
    }
    product.variantOptions = variantOptions;
    product.variants = variantsResult.rows;

    res.json({ product });
  } catch (err) {
    next(err);
  }
};

exports.getProductPairings = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pp.name, c.name AS category, pp.base_price AS price,
              pp.description AS detail, pp.image,
              'In Stock' AS status
       FROM product_pairings pair
       JOIN products pp ON pp.id = pair.pairing_product_id
       JOIN categories c ON c.id = pp.category_id
       WHERE pair.product_id = $1 AND pp.is_active = true`,
      [id]
    );

    const DEFAULT_IMG = "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80";
    const items = result.rows.map((i) => ({
      ...i,
      image: i.image || DEFAULT_IMG,
    }));

    res.json({ items });
  } catch (err) {
    next(err);
  }
};
