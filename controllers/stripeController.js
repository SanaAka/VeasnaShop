const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const pool = require("../config/db");

exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { amount, currency, lineItems, customer, shipping, saveInfo } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "A valid amount (in cents) is required" });
    }

    const intentParams = {
      amount,
      currency: currency || "usd",
      automatic_payment_methods: { enabled: true },
    };

    if (customer) {
      intentParams.receipt_email = customer.email;
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    next(err);
  }
};

const DISTINCT_ORDER_NUMBER = async (pool) => {
  for (let i = 0; i < 10; i++) {
    const num = `VSN-${100000 + Math.floor(Math.random() * 900000)}`;
    const existing = await pool.query("SELECT 1 FROM orders WHERE order_number = $1", [num]);
    if (existing.rows.length === 0) return num;
  }
  return `VSN-${Date.now()}${Math.floor(Math.random() * 90)}`;
};

exports.createOrder = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      paymentIntentId,
      billing,
      shipping,
      lineItems,
      totals,
      promoCode,
    } = req.body;

    if (!paymentIntentId || !lineItems || lineItems.length === 0) {
      return res.status(400).json({ error: "paymentIntentId and lineItems are required" });
    }

    // Verify the PaymentIntent succeeded via Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (_) {
      return res.status(400).json({ error: "Invalid payment intent id" });
    }

    if (paymentIntent.status !== "succeeded") {
      return res.status(422).json({ error: `Payment not completed (status: ${paymentIntent.status})` });
    }

    const last4 = paymentIntent.payment_method
      ? (await stripe.paymentMethods.retrieve(paymentIntent.payment_method)).card?.last4 || ""
      : "";

    const displayPayment = last4 ? `Stripe •••• ${last4}` : "";

    const orderNumber = await DISTINCT_ORDER_NUMBER(client);
    const t = totals || {};
    const total = t.total || Number(paymentIntent.amount) / 100;

    await client.query("BEGIN");

    const orderResult = await client.query(
      `INSERT INTO orders (
        user_id, order_number, total_amount, subtotal, wrap_fee,
        shipping_cost, tax, discount, promo_code,
        fulfillment_status, payment_method, payment_last4, shipping_method,
        billing_name, billing_email, billing_phone,
        shipping_line1, shipping_line2, shipping_city,
        shipping_state, shipping_zip, shipping_country
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        'Paid', $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21
      ) RETURNING id, order_number, created_at`,
      [
        req.user ? req.user.id : null,
        orderNumber,
        total,
        t.subtotal || 0,
        t.wrapFee || 0,
        t.shipping || 0,
        t.tax || 0,
        t.discount || 0,
        promoCode || null,
        displayPayment,
        last4,
        t.shippingMethod || "Eco-Standard — Carbon Neutral",
        billing?.name  || "",
        billing?.email || "",
        billing?.phone || "",
        shipping?.line1 || "",
        shipping?.line2 || "",
        shipping?.city  || "",
        shipping?.state || "",
        shipping?.zip   || "",
        shipping?.country || "US",
      ]
    );

    const order = orderResult.rows[0];

    let itemCount = 0;
    for (const item of lineItems) {
      const price = item.price / 100;
      let variantId = item.variantId ? Number(item.variantId) : null;
      if (!variantId && item.productId) {
        const firstVariant = await client.query(
          "SELECT id FROM product_variants WHERE product_id = $1 ORDER BY id LIMIT 1",
          [Number(item.productId)]
        );
        variantId = firstVariant.rows.length > 0 ? firstVariant.rows[0].id : null;
      }
      await client.query(
        `INSERT INTO order_items (order_id, variant_id, product_id, quantity, unit_price, name, sku, image, variant_label)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id,
          variantId,
          item.productId || 0,
          item.qty || 1,
          price,
          item.name || "",
          item.sku || "",
          item.image || "",
          item.variant || "",
        ]
      );
      itemCount += item.qty || 1;

      if (variantId) {
        await client.query(
          `UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
          [item.qty || 1, variantId]
        );
      }
    }

    await client.query(
      `INSERT INTO stripe_transactions (order_id, stripe_session_id, stripe_payment_intent_id, amount, status)
       VALUES ($1, $2, $3, $4, 'succeeded')`,
      [order.id, paymentIntentId, paymentIntentId, total]
    );

    await client.query("COMMIT");

    const createdDate = new Date(order.created_at);
    const deliveryStart = new Date(createdDate);
    deliveryStart.setDate(deliveryStart.getDate() + 3);
    const deliveryEnd = new Date(createdDate);
    deliveryEnd.setDate(deliveryEnd.getDate() + 5);

    const fmt = (d) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    res.status(201).json({
      order: {
        id: order.order_number,
        status: "Paid",
        date: fmt(createdDate),
        estimatedDelivery: `${fmt(deliveryStart)}–${fmt(deliveryEnd).split(",")[0]}, ${deliveryEnd.getFullYear()}`,
        payment: displayPayment || `Stripe •••• ${last4}`,
        shippingMethod: t.shippingMethod || "Eco-Standard — Carbon Neutral",
        total,
        items: itemCount,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

exports.webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE stripe_transactions SET status = 'succeeded', stripe_payment_intent_id = $1
         WHERE stripe_session_id = $2`,
        [session.payment_intent, session.id]
      );
      const orderResult = await client.query(
        `SELECT o.id FROM orders o
         JOIN stripe_transactions st ON st.order_id = o.id
         WHERE st.stripe_session_id = $1`,
        [session.id]
      );
      if (orderResult.rows.length > 0) {
        const orderId = orderResult.rows[0].id;
        await client.query(
          `UPDATE orders SET fulfillment_status = 'processing' WHERE id = $1`,
          [orderId]
        );
        const items = await client.query(
          "SELECT variant_id, quantity FROM order_items WHERE order_id = $1",
          [orderId]
        );
        for (const item of items.rows) {
          await client.query(
            `UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
            [item.quantity, item.variant_id]
          );
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Webhook processing error:", err.message);
    } finally {
      client.release();
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    await pool.query(
      `UPDATE orders SET fulfillment_status = 'Paid'
       WHERE id IN (SELECT order_id FROM stripe_transactions WHERE stripe_payment_intent_id = $1)
         AND fulfillment_status = 'pending'`,
      [pi.id]
    );
    await pool.query(
      `UPDATE stripe_transactions SET status = 'succeeded'
       WHERE stripe_payment_intent_id = $1`,
      [pi.id]
    );
  }

  res.json({ received: true });
};
