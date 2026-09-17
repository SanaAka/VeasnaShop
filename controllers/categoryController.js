const pool = require("../config/db");

exports.getAllCategories = async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.id::text AS id, c.name, c.slug, c.description, c.image,
              (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id AND p.is_active = true) AS "count"
       FROM categories c
       WHERE c.parent_id IS NULL
       ORDER BY c.sort_order, c.id`
    );

    const categories = [];
    for (const cat of result.rows) {
      const children = await pool.query(
        `SELECT child.id::text AS id, child.name, child.slug, child.description, child.image,
                (SELECT COUNT(*)::int FROM products p WHERE p.category_id = child.id AND p.is_active = true) AS items
         FROM categories child
         WHERE child.parent_id = $1
         ORDER BY child.sort_order, child.id`,
        [cat.id]
      );

      categories.push({ ...cat, children: children.rows });
    }

    res.json({ categories });
  } catch (err) {
    next(err);
  }
};
