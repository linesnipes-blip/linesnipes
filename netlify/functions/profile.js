const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { corsHeaders, getUser, getUserProfile } = require("./utils/db");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

  try {
    const user = await getUser(event.headers.authorization);
    if (!user) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };

    const profile = await getUserProfile(user.id);
    if (!profile) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: "Profile not found" }) };

    const plan = profile.plan || "free";
    const used = profile.fetches_used || 0;
    const limit = plan === "free" ? 10 : plan === "standard" ? 300 : null;

    const result = {
      email: user.email,
      plan,
      fetches_used: used,
      fetches_limit: limit,
      plan_started_at: profile.plan_started_at,
    };

    // If they have a Stripe customer, generate portal link for managing subscription
    if (event.httpMethod === "POST" && profile.stripe_customer_id) {
      const origin = event.headers.origin || "https://linesnipes.com";
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${origin}/#/settings`,
      });
      result.portal_url = portalSession.url;
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
