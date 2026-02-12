const fs = require("fs");

const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || "PASTE_SUPABASE_URL_HERE";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLIC_ANON_KEY || process.env.SUPABASE_ROLE_ANON_KEY || "PASTE_SUPABASE_ANON_KEY_HERE";

const content = `const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseKey)};
`;

fs.writeFileSync("config.js", content, "utf8");
