const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { corsHeaders, getUser, getUserProfile, supabase } = require("./utils/db");

const PRICE_MAP = {
  standard: process.env.STRIPE_PRICE_STANDARD,
  unlimited: process.env.STRIPE_PRICE_UNLIMITED,
  lifetime: process.env.STRIPE_PRICE_LIFETIME,
};

const PLAN_RANK = { free: 0, standard: 1, unlimited: 2, lifetime: 3 };

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const user = await getUser(event.headers.authorization);
    if (!user) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };

    const { plan } = JSON.parse(event.body || "{}");
    const priceId = PRICE_MAP[plan];
    if (!priceId) {
      console.error("Invalid plan or missing price ID:", plan, "PRICE_MAP:", JSON.stringify(PRICE_MAP));
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid plan: " + plan }) };
    }

    const profile = await getUserProfile(user.id);
    const currentPlan = profile?.plan || "free";
    const origin = event.headers.origin || event.headers.referer || "https://linesnipes.com";

    console.log("Checkout:", { userId: user.id, plan, currentPlan, priceId });

    // ─── UPGRADE: swap subscription with proration ───
    if (profile?.stripe_subscription_id && PLAN_RANK[plan] > PLAN_RANK[currentPlan] && plan !== "lifetime") {
      try {
        const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        if (sub && sub.status === "active") {
          await stripe.subscriptions.update(profile.stripe_subscription_id, {
            items: [{ id: sub.items.data[0].id, price: priceId }],
            proration_behavior: "always_invoice",
            metadata: { user_id: user.id, plan },
          });

          await supabase.from("profiles").update({
            plan,
            fetches_used: 0,
          }).eq("id", user.id);

          return {
            statusCode: 200, headers: corsHeaders,
            body: JSON.stringify({ upgraded: true, from: currentPlan, to: plan }),
          };
        }
      } catch (err) {
        console.error("Upgrade error:", err.message);
      }
    }

    // ─── NEW SUBSCRIPTION or LIFETIME ───
    const isLifetime = plan === "lifetime";

    const sessionOpts = {
      mode: isLifetime ? "payment" : "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/#/app?checkout=success`,
      cancel_url: `${origin}/#/pricing?checkout=cancel`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan },
      allow_promotion_codes: true,
    };

    if (profile?.stripe_customer_id) {
      sessionOpts.customer = profile.stripe_customer_id;
    } else {
      sessionOpts.customer_email = user.email;
    }

    console.log("Creating checkout session:", JSON.stringify(sessionOpts));
    const session = await stripe.checkout.sessions.create(sessionOpts);
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error("Checkout error:", err.message, err.stack);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
