const pool = require("../config/db");

const STATUS_MAP = {
  pending: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Fulfilled",
  cancelled: "Cancelled",
};

exports.dashboard = async (req, res, next) => {
  try {
    const userRes = await pool.query("SELECT id, name, email FROM users WHERE id = $1", [req.user.id]);
    const user = userRes.rows[0] || {};

    const statsRes = await pool.query(
      `SELECT
         COALESCE(SUM(total_amount), 0) AS total_spend,
         COUNT(*)::int AS order_count,
         COUNT(*) FILTER (WHERE fulfillment_status = 'delivered')::int AS delivered,
         COUNT(*) FILTER (WHERE fulfillment_status IN ('processing','shipped'))::int AS in_transit
       FROM orders WHERE user_id = $1`,
      [req.user.id]
    );
    const s = statsRes.rows[0];

    const recentRes = await pool.query(
      `SELECT o.order_number AS id, u.name AS customer, u.email,
              to_char(o.created_at, 'Mon DD, YYYY') AS date,
              o.total_amount AS total, o.fulfillment_status AS status,
              o.payment_method AS payment,
              (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       WHERE o.user_id = $1 ORDER BY o.id DESC LIMIT 5`,
      [req.user.id]
    );

    res.json({
      user,
      stats: [
        {
          label: "Total Spend",
          value: `$${Number(s.total_spend).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          icon: "payments",
          note: `Across ${s.order_count} mindful order${s.order_count !== 1 ? "s" : ""}`,
        },
        {
          label: "Orders Placed",
          value: String(s.order_count),
          icon: "receipt_long",
          note: `${s.in_transit} in transit \u2022 ${s.delivered} delivered`,
        },
      ],
      recentOrders: recentRes.rows.map((r) => ({
        id: r.id, customer: r.customer || "", email: r.email || "",
        date: r.date, total: Number(r.total),
        status: STATUS_MAP[r.status] || r.status, payment: r.payment || "", items: r.items,
      })),
    });
  } catch (err) { next(err); }
};

exports.wishlist = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, c.name AS category, p.base_price AS price,
              p.image, p.tag, 'In Stock' AS status
       FROM wishlists w JOIN products p ON p.id = w.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE w.user_id = $1 AND p.is_active = true ORDER BY w.id DESC`,
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch (err) { next(err); }
};

exports.addWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: "productId is required" });
    await pool.query(
      "INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.user.id, productId]
    );
    res.status(201).json({ added: true });
  } catch (err) { next(err); }
};

exports.removeWishlist = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2", [req.user.id, req.params.productId]);
    res.json({ removed: true });
  } catch (err) { next(err); }
};

exports.addresses = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, label, line1, line2, city, state, zip, country, is_default
       FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.upsertAddress = async (req, res, next) => {
  try {
    const { id, label, line1, line2, city, state, zip, country, is_default } = req.body;
    if (!line1 || !city || !state || !zip) {
      return res.status(400).json({ error: "line1, city, state, zip are required" });
    }
    if (id) {
      await pool.query(
        `UPDATE addresses SET label=$1, line2=$2, city=$3, state=$4, zip=$5, country=$6, is_default=$7
         WHERE id=$8 AND user_id=$9`,
        [label||"", line2||"", city, state, zip, country||"US", !!is_default, id, req.user.id]
      );
      res.json({ updated: true });
    } else {
      const result = await pool.query(
        `INSERT INTO addresses (user_id, label, line1, line2, city, state, zip, country, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [req.user.id, label||"", line1, line2||"", city, state, zip, country||"US", !!is_default]
      );
      res.status(201).json({ id: result.rows[0].id, added: true });
    }
  } catch (err) { next(err); }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM addresses WHERE id = $1 AND user_id = $2", [req.params.addressId, req.user.id]);
    res.json({ removed: true });
  } catch (err) { next(err); }
};

exports.ritual = async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM ritual_profiles WHERE user_id = $1", [req.user.id]);
    if (result.rows.length === 0) {
      return res.json({ skin_type: "", scent_preferences: "", material_preferences: "", size_preference: "", lifestyle_notes: "" });
    }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.updateRitual = async (req, res, next) => {
  try {
    const { skin_type, scent_preferences, material_preferences, size_preference, lifestyle_notes } = req.body;
    const existing = await pool.query("SELECT id FROM ritual_profiles WHERE user_id = $1", [req.user.id]);

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO ritual_profiles (user_id, skin_type, scent_preferences, material_preferences, size_preference, lifestyle_notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [req.user.id, skin_type||"", scent_preferences||"", material_preferences||"", size_preference||"", lifestyle_notes||""]
      );
    } else {
      await pool.query(
        `UPDATE ritual_profiles SET skin_type=$1, scent_preferences=$2, material_preferences=$3,
         size_preference=$4, lifestyle_notes=$5, updated_at=NOW() WHERE user_id=$6`,
        [skin_type||"", scent_preferences||"", material_preferences||"", size_preference||"", lifestyle_notes||"", req.user.id]
      );
    }
    res.json({ updated: true });
  } catch (err) { next(err); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const sets = ["updated_at = NOW()"];
    const params = [req.user.id];
    let idx = 2;

    if (name) { sets.push(`name = $${idx++}`); params.push(name); }
    if (email) { sets.push(`email = $${idx++}`); params.push(email); }
    if (password) {
      const bcrypt = require("bcrypt");
      const hash = await bcrypt.hash(password, 10);
      sets.push(`password_hash = $${idx++}`); params.push(hash);
    }

    await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1`, params);
    res.json({ updated: true });
  } catch (err) { next(err); }
};
