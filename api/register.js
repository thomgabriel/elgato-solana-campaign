function parseBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  return req.body;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

let sqlClient = null;

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL_NOT_CONFIGURED");
  }

  if (!sqlClient) {
    const { neon } = require("@neondatabase/serverless");
    sqlClient = neon(databaseUrl);
  }

  return sqlClient;
}

function validatePayload(body) {
  const requiredFields = [
    "name",
    "email",
    "whatsapp",
    "profile",
    "colosseumHandle",
  ];

  for (const field of requiredFields) {
    if (!body[field] || typeof body[field] !== "string" || !body[field].trim()) {
      return `Campo obrigatorio ausente: ${field}.`;
    }
  }

  if (!body.discordJoined) {
    return "Discord precisa estar confirmado.";
  }

  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    getSqlClient();
  } catch (error) {
    return sendJson(res, 500, {
      error: "Backend nao configurado. Defina DATABASE_URL ou POSTGRES_URL.",
      details: error instanceof Error ? error.message : "unknown_error",
    });
  }

  let body;

  try {
    body = parseBody(req);
  } catch {
    return sendJson(res, 400, { error: "JSON invalido." });
  }

  const validationError = validatePayload(body);
  if (validationError) {
    return sendJson(res, 400, { error: validationError });
  }

  const payload = {
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    whatsapp: body.whatsapp.trim(),
    profile: body.profile.trim(),
    colosseum_handle: body.colosseumHandle.trim(),
    discord_joined: Boolean(body.discordJoined),
    source: body.source || "elgato-solana-campaign",
    submitted_at: new Date().toISOString(),
    user_agent: req.headers["user-agent"] || null,
  };

  try {
    const sql = getSqlClient();
    const data = await sql`
      insert into public.hackathon_signups (
        name,
        email,
        whatsapp,
        profile,
        colosseum_handle,
        discord_joined,
        source,
        submitted_at,
        user_agent
      )
      values (
        ${payload.name},
        ${payload.email},
        ${payload.whatsapp},
        ${payload.profile},
        ${payload.colosseum_handle},
        ${payload.discord_joined},
        ${payload.source},
        ${payload.submitted_at},
        ${payload.user_agent}
      )
      returning id
    `;

    return sendJson(res, 200, {
      ok: true,
      id: data[0]?.id ?? null,
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: "Erro inesperado ao conectar com o banco.",
      details: error instanceof Error ? error.message : "unknown_error",
    });
  }
};
