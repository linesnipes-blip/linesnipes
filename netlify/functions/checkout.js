const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { corsHeaders, getUser } = require("./utils/db");

const PRICE_MAP = {
  standard: process.env.STRIPE_PRICE_STANDARD,
  unlimited: process.env.STRIPE_PRICE_UNLIMITED,
  lifetime: process.env.STRIPE_PRICE_LIFETIME,
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const user = await getUser(event.headers.authorization);
    if (!user) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };

    const { plan } = JSON.parse(event.body || "{}");
    const priceId = PRICE_MAP[plan];
    if (!priceId) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid plan" }) };

    const isLifetime = plan === "lifetime";
    const origin = event.headers.origin || event.headers.referer || "https://linesnipes.com";

    const session = await stripe.checkout.sessions.create({
      mode: isLifetime ? "payment" : "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/#/app?checkout=success`,
      cancel_url: `${origin}/#/pricing?checkout=cancel`,
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { user_id: user.id, plan },
    });

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
