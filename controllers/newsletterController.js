const pool = require("../config/db");

exports.subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    await pool.query(
      `INSERT INTO newsletters (email, subscribed) VALUES ($1, true)
       ON CONFLICT (email) DO UPDATE SET subscribed = true, created_at = NOW()`,
      [email]
    );

    res.json({ subscribed: true });
  } catch (err) {
    next(err);
  }
};
