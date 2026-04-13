const DSN = "https://api33.unipile.com:16394";
const API_KEY = "ML2GAOYq.71uJ1Y9UR0vkWSFbnBI1buKrvdchqD4R9+z1Z0CHZRo=";
const ACCOUNT_ID = "6keswHDGQ7CRL8WgRlnkjA";

async function tryLookup(label, url, method = "GET", body = null) {
  console.log(`\n--- ${label} ---`);
  const opts = {
    method,
    headers: { "X-API-KEY": API_KEY, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    console.log("FAILED:", res.status, typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300));
    return null;
  }
  console.log("SUCCESS:", typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500));
  return data;
}

async function main() {
  // Try fetching profile with company vanity slug
  await tryLookup("Profile by company vanity name (google)",
    `${DSN}/api/v1/users/${ACCOUNT_ID}/profile/google?provider=LINKEDIN`);

  // Try fetching the company profile via Unipile's company endpoint
  await tryLookup("Company profile endpoint",
    `${DSN}/api/v1/linkedin/company/1586?account_id=${ACCOUNT_ID}`);

  // Try the relation endpoint
  await tryLookup("Relation endpoint for company",
    `${DSN}/api/v1/users/${ACCOUNT_ID}/relations?provider_id=1586`);

  // Try viewing a LinkedIn company page
  await tryLookup("View company page",
    `${DSN}/api/v1/linkedin/company?account_id=${ACCOUNT_ID}&company_id=1586`);

  // Test: search for "Google" as company
  const googleSearch = await tryLookup("Search for Google company",
    `${DSN}/api/v1/linkedin/search?account_id=${ACCOUNT_ID}`, "POST", {
      api: "classic",
      category: "companies",
      keywords: "Google",
      limit: 3,
    });

  if (googleSearch && googleSearch.items) {
    for (const item of googleSearch.items.slice(0, 3)) {
      console.log(`  ${item.id} | ${item.name} | ${item.profile_url}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
