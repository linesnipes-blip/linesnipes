const { corsHeaders, getUser, getUserProfile, incrementUsage } = require("./utils/db");

// In-memory cache: { [sportKey]: { data, timestamp } }
const oddsCache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

  try {
    // Auth check
    const user = await getUser(event.headers.authorization);
    if (!user) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };

    // Get user profile for plan & usage
    const profile = await getUserProfile(user.id);
    if (!profile) return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: "No profile found. Please contact support." }) };

    // Check usage limits
    const plan = profile.plan || "free";
    const used = profile.fetches_used || 0;
    const limit = plan === "free" ? 10 : plan === "standard" ? 300 : null; // null = unlimited

    if (limit !== null && used >= limit) {
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Fetch limit reached",
          used,
          limit,
          plan,
          message: plan === "free"
            ? "You've used all 10 free fetches. Upgrade to keep sniping."
            : "You've used all 300 fetches this month. Upgrade to Unlimited for uncapped access.",
        }),
      };
    }

    // Get sport key from query params
    const params = event.queryStringParameters || {};
    const sportKey = params.sport;
    if (!sportKey) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing sport parameter" }) };

    // Optional: specific bookmakers filter
    const bookmakers = params.bookmakers || "pinnacle,betonlineag,bovada,draftkings,fanduel,betmgm,williamhill_us,espnbet,fanatics,betrivers,hardrockbet";
    const markets = params.markets || "h2h,spreads,totals";

    // Increment usage (counts even on cache hit — it's a fetch from user's perspective)
    const { error: usageError } = await incrementUsage(user.id);
    if (usageError) console.error("Usage increment failed:", usageError);

    // Check cache
    const cacheKey = `${sportKey}:${bookmakers}:${markets}`;
    const now = Date.now();
    const cached = oddsCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          odds: cached.data,
          usage: { used: used + 1, limit, plan },
          cached: true,
        }),
      };
    }

    // Fetch from The Odds API
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=us&markets=${markets}&oddsFormat=decimal&bookmakers=${bookmakers}`;
    const res = await fetch(url);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Odds API error ${res.status}: ${errText}`);
    }

    const data = await res.json();

    // Cache it
    oddsCache.set(cacheKey, { data, timestamp: now });

    // Clean old cache entries (prevent memory leak in long-running functions)
    for (const [key, val] of oddsCache) {
      if (now - val.timestamp > CACHE_TTL * 5) oddsCache.delete(key);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        odds: data,
        usage: { used: used + 1, limit, plan },
        cached: false,
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
