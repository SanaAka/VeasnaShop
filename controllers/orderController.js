const pool = require("../config/db");

const STATUS_MAP = {
  pending: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Fulfilled",
  cancelled: "Cancelled",
};

exports.listOrders = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.order_number AS id,
              u.name AS customer,
              u.email,
              to_char(o.created_at, 'Mon DD, YYYY') AS date,
              o.total_amount AS total,
              o.fulfillment_status AS status_raw,
              o.payment_method AS payment,
              (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.user_id = $1
       ORDER BY o.id DESC`,
      [req.user.id]
    );

    // Map fulfillment_status to the frontend-display string
    const orders = result.rows.map((r) => ({
      id: r.id,
      customer: r.customer || "",
      email: r.email || "",
      date: r.date,
      total: Number(r.total),
      status: STATUS_MAP[r.status_raw] || r.status_raw,
      payment: r.payment || "",
      items: r.items,
    }));

    res.json({ orders });
  } catch (err) {
    next(err);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(
      `SELECT o.*
       FROM orders o
       WHERE o.order_number = $1 AND o.user_id = $2`,
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const o = orderResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT oi.name, oi.quantity AS qty, oi.unit_price AS price, oi.sku,
              oi.image, oi.variant_label AS variant
       FROM order_items oi
       WHERE oi.order_id = $1`,
      [o.id]
    );

    res.json({
      order: {
        id: o.order_number,
        status: STATUS_MAP[o.fulfillment_status] || o.fulfillment_status,
        date: new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        payment: o.payment_method || "",
        tracking: {
          carrier: o.tracking_carrier || "",
          number: o.tracking_number || "",
        },
        items: itemsResult.rows,
        totals: {
          subtotal: Number(o.subtotal),
          wrapFee: Number(o.wrap_fee),
          shipping: Number(o.shipping_cost),
          tax: Number(o.tax),
          discount: Number(o.discount),
          total: Number(o.total_amount),
        },
        addresses: {
          billing: {
            name: o.billing_name,
            email: o.billing_email,
            phone: o.billing_phone,
            line1: o.shipping_line1,
            line2: o.shipping_line2,
            city: o.shipping_city,
            state: o.shipping_state,
            zip: o.shipping_zip,
            country: o.shipping_country,
          },
          shipping: {
            line1: o.shipping_line1,
            line2: o.shipping_line2,
            city: o.shipping_city,
            state: o.shipping_state,
            zip: o.shipping_zip,
            country: o.shipping_country,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
