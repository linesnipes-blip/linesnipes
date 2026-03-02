const { corsHeaders, getUser } = require("./utils/db");

// In-memory cache for sports list
let sportsCache = null;
let sportsCacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

  try {
    // Auth check (even free users must be logged in)
    const user = await getUser(event.headers.authorization);
    if (!user) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };

    // Check cache
    const now = Date.now();
    if (sportsCache && now - sportsCacheTime < CACHE_TTL) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(sportsCache) };
    }

    // Fetch from The Odds API
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/?apiKey=${process.env.ODDS_API_KEY}`
    );
    if (!res.ok) throw new Error(`Odds API returned ${res.status}`);
    const data = await res.json();

    // Group by category
    const grouped = {};
    for (const sport of data) {
      if (!sport.active) continue;
      const group = sport.group || "Other";
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push({
        key: sport.key,
        title: sport.title,
        description: sport.description,
        active: sport.active,
        has_outrights: sport.has_outrights,
      });
    }

    sportsCache = grouped;
    sportsCacheTime = now;

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(grouped) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
