const { supabase, corsHeaders } = require("./utils/db");

const MAX_FREE_SIGNUPS = 2;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const fp = body.fingerprint;
    if (!fp || typeof fp !== "string" || fp.length !== 64) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid fingerprint" }),
      };
    }

    // POST = check if allowed
    if (event.httpMethod === "POST") {
      const { data, error } = await supabase
        .from("device_fingerprints")
        .select("signup_count")
        .eq("fingerprint", fp)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found, which is fine
        console.error("Fingerprint check error:", error);
      }

      const count = data?.signup_count || 0;
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          allowed: count < MAX_FREE_SIGNUPS,
          count,
        }),
      };
    }

    // PUT = record a signup
    if (event.httpMethod === "PUT") {
      // Upsert: increment count or insert with 1
      const { data: existing } = await supabase
        .from("device_fingerprints")
        .select("signup_count")
        .eq("fingerprint", fp)
        .single();

      if (existing) {
        await supabase
          .from("device_fingerprints")
          .update({
            signup_count: existing.signup_count + 1,
            last_signup_at: new Date().toISOString(),
          })
          .eq("fingerprint", fp);
      } else {
        await supabase.from("device_fingerprints").insert({
          fingerprint: fp,
          signup_count: 1,
          last_signup_at: new Date().toISOString(),
        });
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ recorded: true }),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (err) {
    console.error("Fingerprint function error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
