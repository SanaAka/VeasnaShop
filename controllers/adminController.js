const pool = require("../config/db");

// ─── Dashboard ──────────────────────────────────────────────

exports.dashboard = async (req, res, next) => {
  try {
    const { range } = req.query;

    let dateWhere = "";
    if (range === "Today") {
      dateWhere = "WHERE created_at >= CURRENT_DATE";
    } else if (range === "Last 7 Days") {
      dateWhere = "WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (range === "Year to Date (YTD)") {
      dateWhere = "WHERE created_at >= date_trunc('year', CURRENT_DATE)";
    } else {
      // Default: Last 30 Days or All
      dateWhere = "WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const orderStats = await pool.query(
      `SELECT
         COALESCE(SUM(total_amount), 0)::numeric AS revenue,
         COUNT(*)::int AS total_orders,
         COUNT(*) FILTER (WHERE fulfillment_status = 'delivered')::int AS fulfilled,
         COUNT(*) FILTER (WHERE fulfillment_status IN ('pending','Paid','processing'))::int AS pending
       FROM orders ${dateWhere}`
    );
    const o = orderStats.rows[0];
    const aov = o.total_orders > 0 ? Number(o.revenue) / o.total_orders : 0;

    const lowStockRes = await pool.query(
      `SELECT pv.id, p.name, pv.sku, pv.variant_name, pv.stock_quantity AS left,
              pv.stock_quantity <= 1 AS urgent, p.image AS img
       FROM product_variants pv JOIN products p ON p.id = pv.product_id
       WHERE pv.stock_quantity <= 5 AND p.is_active = true
       ORDER BY pv.stock_quantity ASC LIMIT 10`
    );

    const recentOrders = await pool.query(
      `SELECT o.order_number AS "id", to_char(o.created_at, 'HH24:MI') AS time,
              u.name, u.email, o.total_amount AS total, o.fulfillment_status AS status,
              o.payment_method AS payment, o.wrap_fee,
              (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items,
              (SELECT oi.name FROM order_items oi WHERE oi.order_id = o.id ORDER BY oi.id LIMIT 1) AS first_item_name,
              (SELECT oi.variant_label FROM order_items oi WHERE oi.order_id = o.id ORDER BY oi.id LIMIT 1) AS first_item_variant
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.id DESC LIMIT 15`
    );

    const deptRes = await pool.query(
      `SELECT c.name AS label, COALESCE(SUM(oi.unit_price * oi.quantity), 0)::numeric AS total
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       LEFT JOIN order_items oi ON oi.product_id = p.id
       WHERE c.parent_id IS NULL
       GROUP BY c.id, c.name ORDER BY total DESC`
    );
    const deptColors = ["bg-primary-container", "bg-secondary-fixed-dim", "bg-tertiary-container", "bg-secondary-fixed"];
    const deptTotal = deptRes.rows.reduce((s, d) => s + Number(d.total), 0) || 1;
    const departments = deptRes.rows.map((d, i) => {
      const pct = Math.round((Number(d.total) / deptTotal) * 100);
      return { label: d.label, value: `$${Number(d.total).toLocaleString("en-US")}`, pct: `(${pct}%)`, color: deptColors[i % deptColors.length] };
    });

    const chartRes = await pool.query(
      `SELECT
         to_char(d.day, 'Dy') AS day_name,
         COALESCE(SUM(o.total_amount), 0)::numeric AS revenue,
         COUNT(o.id)::int AS orders
       FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d(day)
       LEFT JOIN orders o ON DATE(o.created_at) = DATE(d.day)
       GROUP BY d.day
       ORDER BY d.day`
    );

    const revenuePoints = chartRes.rows.map((r) => Number(r.revenue));
    const ordersPoints = chartRes.rows.map((r) => Number(r.orders));
    const days = chartRes.rows.map((r) => r.day_name);

    const initialsClsPool = [
      "bg-secondary-fixed text-on-secondary-fixed",
      "bg-tertiary-fixed text-on-tertiary-fixed",
      "bg-primary-fixed text-on-primary-fixed-variant",
      "bg-secondary-container text-on-secondary-container",
    ];
    const fulfilCls = (s) => {
      if (s === "shipped") return { text: "Shipped", cls: "bg-surface-container-high text-on-surface" };
      if (s === "delivered") return { text: "Delivered", cls: "bg-surface-container-high text-on-surface" };
      return { text: "In Queue", cls: "bg-error-container text-on-error-container", dot: "bg-error" };
    };
    const initials = (name) => (name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

    res.json({
      kpis: [
        { label: "Gross Revenue", value: `$${Number(o.revenue).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, change: null, icon: "payments", iconCls: "bg-secondary-fixed/50 text-on-secondary-fixed-variant", note: range ? `Filtered: ${range}` : "Filtered: Last 30 Days", spark: "" },
        { label: "Total Orders", value: `${o.total_orders} Orders`, change: null, icon: "local_mall", iconCls: "bg-tertiary-fixed text-on-tertiary-fixed", note: `${o.fulfilled} fulfilled \u2022 ${o.pending} pending`, bar: true },
        { label: "Average Order Value", value: `$${aov.toFixed(2)}`, change: null, icon: "analytics", iconCls: "bg-primary-fixed text-on-primary-fixed-variant", note: "Healthy basket size" },
        { label: "Action Required", value: `${lowStockRes.rows.length} Low Stock`, change: null, icon: "warning", iconCls: "bg-error-container text-on-error-container", note: "", action: true },
      ],
      chart: {
        mode: "revenue",
        days,
        series: [{ points: revenuePoints.length > 0 ? revenuePoints : [0, 0, 0, 0, 0, 0, 0], peak: Math.max(...revenuePoints, 0) }],
        ordersSeries: [{ points: ordersPoints.length > 0 ? ordersPoints : [0, 0, 0, 0, 0, 0, 0], peak: Math.max(...ordersPoints, 0) }]
      },
      departments,
      orders: recentOrders.rows.map((r, i) => {
        const shipped = r.status === "shipped" || r.status === "delivered";
        const fulfil = fulfilCls(r.status);
        const firstItem = r.first_item_name || `${r.items} item(s)`;
        const variant = r.first_item_variant ? ` (${r.first_item_variant})` : "";
        const sub = r.items > 1 ? `+ ${r.items - 1} more item${r.items - 1 > 1 ? "s" : ""}` : "Single item order";
        return {
          id: `#${r.id}`, time: r.time, name: r.name || "", email: r.email || "",
          item: firstItem + variant, sub,
          total: `$${Number(r.total).toFixed(2)}`, payment: r.payment || "",
          fulfilment: fulfil,
          initials: initials(r.name),
          initialsCls: initialsClsPool[i % initialsClsPool.length],
          action: shipped ? null : "Fulfill",
          status: shipped ? "shipped" : "unfulfilled",
          shipped,
        };
      }),
      lowStock: lowStockRes.rows.map((r) => ({
        img: r.img || "",
        name: `${r.name} (${r.variant_name})`, sku: r.sku, left: `Only ${r.left} left!`,
        urgent: r.urgent, reorder: "Reorder point: 5",
      })),
      activity: [],
    });
  } catch (err) { next(err); }
};

// ─── Products (admin) ───────────────────────────────────────

exports.listProducts = async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.base_price AS price, p.tag, p.category_id,
              c.name AS category, p.is_active,
              CASE WHEN p.is_active THEN 'Published' ELSE 'Draft' END AS status,
              COALESCE(SUM(pv.stock_quantity), 0)::int AS "stockLevel",
              p.image, p.color, p.description,
              CASE
                WHEN c.name ILIKE '%linen%'    THEN 'GOTS Organic'
                WHEN LOWER(c.name) IN ('artisanal ceramics','stoneware clay') THEN 'Wood-fired Kiln'
                WHEN c.name ILIKE '%scent%' OR LOWER(c.name) IN ('botanical scent','apothecary') THEN 'Steam-distilled'
                WHEN c.name ILIKE '%textile%'  THEN 'Handwoven'
                ELSE 'Small-batch'
              END AS provenance,
              ARRAY(SELECT DISTINCT COALESCE(NULLIF(pv2.color, ''), p.color)
                    FROM product_variants pv2 WHERE pv2.product_id = p.id) AS colors,
              json_agg(json_build_object(
                'color', COALESCE(NULLIF(pv.color, ''), p.color),
                'label', pv.variant_name,
                'sku', pv.sku,
                'price', p.base_price + pv.price_adjustment,
                'stock', pv.stock_quantity
              ) ORDER BY pv.id) AS variants
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_variants pv ON pv.product_id = p.id
       GROUP BY p.id, c.name ORDER BY p.id`
    );

    const products = result.rows.map((row) => {
      const variants = (row.variants || []).map((v) => ({
        ...v,
        badge:
          v.stock <= 1 ? "Restock Queued" :
          v.stock <= 4 ? "Low Stock" :
          "Active",
      }));
      return {
        id: row.id,
        name: row.name,
        sku: variants[0]?.sku || "",
        category_id: row.category_id,
        category: row.category,
        tag: row.tag || "",
        description: row.description || "",
        units: `${row.stockLevel} unit${row.stockLevel === 1 ? "" : "s"}`,
        stockLevel: row.stockLevel,
        status: row.status,
        price: Number(row.price),
        provenance: row.provenance,
        colors: row.colors || [row.color],
        image: row.image,
        variants,
      };
    });

    res.json({ products });
  } catch (err) { next(err); }
};

exports.getProduct = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS category FROM products p
       JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    const variants = await pool.query("SELECT * FROM product_variants WHERE product_id = $1", [req.params.id]);
    const product = result.rows[0];
    product.variants = variants.rows;
    res.json({ product });
  } catch (err) { next(err); }
};

exports.createProduct = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, slug, description, base_price, original_price, category_id, is_active, tag, image, color, rating, review_count, variants } = req.body;
    if (!name || !slug || !category_id || !base_price) {
      return res.status(400).json({ error: "name, slug, category_id, base_price are required" });
    }
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO products (category_id, name, slug, description, base_price, original_price, is_active, tag, image, color, rating, review_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [category_id, name, slug, description||"", base_price, original_price||null, is_active!==false, tag||null, image||"", color||null, rating||0, review_count||0]
    );
    const product = result.rows[0];
    let insertedVariants = [];
    if (variants && variants.length > 0) {
      const results = await Promise.all(variants.map((v) =>
        client.query(
          `INSERT INTO product_variants (product_id, sku, variant_type, variant_name, price_adjustment, stock_quantity, color)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [product.id, v.sku, v.variant_type||"size", v.variant_name, v.price_adjustment||0, v.stock_quantity||0, v.color||color||""]
        )
      ));
      insertedVariants = results.map((r) => r.rows[0]);
    }
    await client.query("COMMIT");
    product.variants = insertedVariants;
    res.status(201).json({ product });
  } catch (err) { await client.query("ROLLBACK"); next(err); } finally { client.release(); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { name, slug, description, base_price, original_price, category_id, is_active, tag, image, color } = req.body;
    const result = await pool.query(
      `UPDATE products SET name=COALESCE($1,name), slug=COALESCE($2,slug), description=COALESCE($3,description),
       base_price=COALESCE($4,base_price), original_price=$5, category_id=COALESCE($6,category_id),
       is_active=COALESCE($7,is_active), tag=$8, image=COALESCE($9,image), color=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [name, slug, description, base_price, original_price, category_id, is_active, tag, image, color, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    res.json({ product: result.rows[0] });
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    res.json({ deleted: true });
  } catch (err) { next(err); }
};

exports.bulkUpdateProducts = async (req, res, next) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: "products array required" });
    for (const p of products) {
      await pool.query(
        `UPDATE products SET is_active=$1, base_price=$2, name=COALESCE($3,name) WHERE id=$4`,
        [p.is_active, p.price, p.name, p.id]
      );
    }
    res.json({ updated: products.length });
  } catch (err) { next(err); }
};

exports.updateVariant = async (req, res, next) => {
  try {
    const { stock, price, label, color } = req.body;
    const result = await pool.query(
      `UPDATE product_variants
       SET stock_quantity=COALESCE($1,stock_quantity), price_adjustment=COALESCE($2,price_adjustment),
           variant_name=COALESCE($3,variant_name), color=COALESCE($4,color)
       WHERE product_id=$5 AND sku=$6 RETURNING *`,
      [stock, price, label, color, req.params.id, req.params.sku]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Variant not found" });
    res.json({ variant: result.rows[0] });
  } catch (err) { next(err); }
};

// ─── Orders (admin) ─────────────────────────────────────────

exports.listOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    let where = "";
    if (status && status !== "all") {
      where = `WHERE o.fulfillment_status = ${status === "shipped" ? "'shipped'" : "'pending','Paid','processing'"}`;
    }

    const orders = await pool.query(
      `SELECT o.order_number AS "id", o.created_at, to_char(o.created_at, 'HH24:MI') AS clock,
              u.name, u.email, o.total_amount AS total, o.fulfillment_status AS status,
              o.payment_method AS payment, o.payment_last4,
              o.shipping_line1, o.shipping_city, o.shipping_state, o.shipping_country,
              o.wrap_fee,
              (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items,
              ARRAY(SELECT oi.image FROM order_items oi WHERE oi.order_id = o.id AND oi.image <> '' LIMIT 3) AS images,
              (SELECT st.stripe_payment_intent_id FROM stripe_transactions st WHERE st.order_id = o.id LIMIT 1) AS pid
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       ${where} ORDER BY o.id DESC`
    );

    const stats = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE fulfillment_status IN ('pending','Paid','processing'))::int AS awaiting,
         COUNT(*) FILTER (WHERE fulfillment_status = 'shipped')::int AS shipped
       FROM orders`
    );

    const initials = (name) =>
      (name || "?")
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const fulfilCls = (s) => {
      if (s === "shipped") return { text: "Shipped", cls: "bg-primary-container text-on-primary" };
      if (s === "delivered") return { text: "Delivered", cls: "bg-surface-container-high text-on-surface" };
      if (s === "Paid") return { text: "Packing", cls: "bg-surface-container-high text-on-surface-variant", dot: "bg-primary" };
      return { text: "In Queue", cls: "bg-secondary-fixed text-on-secondary-fixed-variant", dot: "bg-secondary" };
    };

    res.json({
      orders: orders.rows.map((r) => ({
        id: `#${r.id}`,
        tag: Number(r.wrap_fee) > 0 ? { icon: "redeem", label: "Gift Box" } : null,
        time: `${new Date(r.created_at).toDateString() === new Date().toDateString() ? "Today" : "Today"}, ${r.clock}`,
        name: r.name || "",
        email: r.email || "",
        loc: `${r.shipping_country || "US"} \u2022 ${r.shipping_state || ""}`.trim(),
        items: r.items,
        images: r.images || [],
        payment: Number(r.payment_last4) > 0 ? `Paid (Stripe \u2022\u2022\u2022\u2022 ${r.payment_last4})` : (r.payment || "Paid"),
        pid: r.pid || "",
        fulfilment: fulfilCls(r.status),
        total: `$${Number(r.total).toFixed(2)}`,
        highlight: r.status === "pending" || r.status === "Paid",
        initials: initials(r.name),
      })),
      stats: [
        { label: "Awaiting Fulfillment", value: String(stats.rows[0].awaiting), icon: "hourglass_top", cls: "text-error" },
        { label: "Shipped", value: String(stats.rows[0].shipped), icon: "local_shipping", cls: "text-secondary" },
        { label: "In Packing Queue", value: String(stats.rows[0].awaiting > 2 ? 2 : 0), icon: "inventory_2", cls: "text-primary" },
        { label: "Returns Awaiting", value: "0", icon: "assignment_return", cls: "text-tertiary" },
      ],
    });
  } catch (err) { next(err); }
};

exports.getOrder = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.name AS customer_name FROM orders o
       LEFT JOIN users u ON u.id = o.user_id WHERE o.order_number = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Order not found" });
    const o = result.rows[0];
    const items = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [o.id]);
    res.json({ order: { ...o, items: items.rows } });
  } catch (err) { next(err); }
};

exports.fulfilOrder = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE orders SET fulfillment_status = CASE
         WHEN fulfillment_status IN ('pending','Paid','processing') THEN 'shipped'
         WHEN fulfillment_status = 'shipped' THEN 'delivered'
         ELSE fulfillment_status END,
       updated_at = NOW()
       WHERE order_number = $1 RETURNING order_number, fulfillment_status`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Order not found" });
    res.json({ order: result.rows[0] });
  } catch (err) { next(err); }
};

// ─── Categories (admin) ─────────────────────────────────────

exports.listCategories = async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.id::text AS id, c.name, c.slug, c.description, c.image,
              (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id AND p.is_active = true) AS products
       FROM categories c WHERE c.parent_id IS NULL ORDER BY c.sort_order, c.id`
    );
    const categories = [];
    for (const cat of result.rows) {
      const children = await pool.query(
        `SELECT child.id::text AS id, child.name, child.slug, child.description, child.image,
                child.feature_menu AS "featureMenu",
                (SELECT COUNT(*)::int FROM products p WHERE p.category_id = child.id AND p.is_active = true) AS items
         FROM categories child WHERE child.parent_id = $1 ORDER BY child.sort_order, child.id`,
        [cat.id]
      );
      categories.push({
        ...cat,
        status: "Active",
        badge: "bg-secondary-fixed text-on-secondary-fixed-variant",
        children: children.rows,
      });
    }
    res.json({ categories });
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug, parent_id, description, image } = req.body;
    if (!name || !slug) return res.status(400).json({ error: "name and slug are required" });
    const result = await pool.query(
      `INSERT INTO categories (name, slug, parent_id, description, image)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, slug, parent_id||null, description||"", image||""]
    );
    res.status(201).json({ category: result.rows[0] });
  } catch (err) { next(err); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { name, slug, description, image } = req.body;
    const result = await pool.query(
      `UPDATE categories SET name=COALESCE($1,name), slug=COALESCE($2,slug),
       description=COALESCE($3,description), image=COALESCE($4,image)
       WHERE id=$5 RETURNING *`,
      [name, slug, description, image, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Category not found" });
    res.json({ category: result.rows[0] });
  } catch (err) { next(err); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM categories WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Category not found" });
    res.json({ deleted: true });
  } catch (err) { next(err); }
};
