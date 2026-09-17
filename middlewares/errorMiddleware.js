const errorMiddleware = (err, _req, res, _next) => {
  console.error(err.stack || err.message || err);

  // PostgreSQL unique-violation
  if (err.code === "23505") {
    const constraint = err.constraint || "";
    let message = "A record with that value already exists";
    if (/categories|products/.test(constraint))  message = "A record with that slug already exists";
    if (constraint.includes("newsletters"))     message = "That email is already subscribed";
    if (constraint.includes("users"))           message = "An account with that email already exists";
    if (constraint.includes("wishlists"))       message = "That item is already in your wishlist";
    if (constraint.includes("pairings"))        message = "That pairing already exists";
    if (constraint.includes("variants"))        message = "A variant with that SKU already exists";
    return res.status(422).json({ error: message });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    error: message,
  });
};

module.exports = errorMiddleware;
