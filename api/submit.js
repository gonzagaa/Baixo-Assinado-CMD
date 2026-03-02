const { google } = require("googleapis");

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function setCors(req, res) {
  // Se quiser travar no seu domínio, troque "*" pelo seu domínio:
  // https://seudominio.com
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

module.exports = async (req, res) => {
  if (setCors(req, res)) return;

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const { nome, telefone, email, cpf } = req.body || {};

    if (!nome || !telefone || !email || !cpf) {
      return json(res, 400, { ok: false, error: "Campos obrigatórios ausentes." });
    }

    // Variáveis de ambiente
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = process.env.SHEET_NAME || "cadastros";
    const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!spreadsheetId || !saJson) {
      return json(res, 500, { ok: false, error: "Env vars não configuradas." });
    }

    // Credenciais (service account)
    const credentials = JSON.parse(saJson);

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const now = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[now, nome, telefone, email, cpf]],
      },
    });

    return json(res, 200, { ok: true });
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: "Falha ao gravar na planilha.",
      detail: err?.message || String(err),
    });
  }
};