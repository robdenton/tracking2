const DSN = "https://api33.unipile.com:16394";
const API_KEY = "ML2GAOYq.71uJ1Y9UR0vkWSFbnBI1buKrvdchqD4R9+z1Z0CHZRo=";
const ACCOUNT_ID = "6keswHDGQ7CRL8WgRlnkjA"; // Rob's Unipile account

async function tryLookup(label, url, method = "GET", body = null) {
  console.log(`\n--- ${label} ---`);
  const opts = {
    method,
    headers: { "X-API-KEY": API_KEY, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) {
    console.log("FAILED:", res.status, JSON.stringify(data).slice(0, 300));
    return null;
  }
  console.log("SUCCESS:", JSON.stringify(data).slice(0, 500));
  return data;
}

async function main() {
  // Try to get company profile by LinkedIn URL
  await tryLookup("Get company by LinkedIn URL",
    `${DSN}/api/v1/users/${ACCOUNT_ID}/company?linkedin_url=${encodeURIComponent("https://www.linkedin.com/company/1586")}`);

  // Try LinkedIn profile endpoint with company ID
  await tryLookup("Get LinkedIn profile for company",
    `${DSN}/api/v1/linkedin/profile?account_id=${ACCOUNT_ID}&linkedin_url=${encodeURIComponent("https://www.linkedin.com/company/1586")}`);

  // Try search for company by ID
  await tryLookup("Search company by ID",
    `${DSN}/api/v1/linkedin/search?account_id=${ACCOUNT_ID}`, "POST", {
      api: "classic",
      category: "companies",
      keywords: "1586",
    });

  // Try the user profile endpoint with company URL
  await tryLookup("User profile with company URL",
    `${DSN}/api/v1/users/profile?account_id=${ACCOUNT_ID}&provider_id=1586&provider=LINKEDIN`);
}

main().catch(e => { console.error(e); process.exit(1); });
