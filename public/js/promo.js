const { corsHeaders, getUser, supabase } = require("./utils/db");

const PROMO_CODES = {
  'JMOPLUMPSCOTS': { plan: 'lifetime' },
  'BETATESTER': { plan: 'unlimited' },
  'FOUNDER': { plan: 'lifetime' },
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const user = await getUser(event.headers.authorization);
    if (!user) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };

    const { code } = JSON.parse(event.body || "{}");
    const c = (code || "").trim().toUpperCase();
    const promo = PROMO_CODES[c];

    if (!promo) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid promo code." }) };
    }

    // Update user profile in Supabase
    const { error } = await supabase
      .from("profiles")
      .update({ plan: promo.plan, fetches_used: 0 })
      .eq("id", user.id);

    if (error) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Failed to apply promo." }) };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, plan: promo.plan, message: "Promo applied! You now have " + promo.plan + " access." }),
    };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
