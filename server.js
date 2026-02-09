import "dotenv/config";
import express from "express";
import crypto from "crypto";
import axios from "axios";

const app = express();

const PAYGATE_ID = process.env.PAYGATE_ID;
const PAYGATE_KEY = process.env.PAYGATE_KEY;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const PORT = Number(process.env.PORT || 3000);

if (!PAYGATE_ID || !PAYGATE_KEY) {
  console.error("Missing PAYGATE_ID or PAYGATE_KEY in .env");
  process.exit(1);
}

function md5(s) {
  return crypto.createHash("md5").update(s, "utf8").digest("hex");
}

// Build Initiate payload in PayWeb3 required order.
// Initiate endpoint: https://secure.paygate.co.za/payweb3/initiate.trans
function buildInitiatePayload({ reference, amountCents, email, user1 }) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const transactionDate =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const data = {
    PAYGATE_ID,
    REFERENCE: reference,
    AMOUNT: String(amountCents),     // cents
    CURRENCY: "ZAR",
    RETURN_URL: `${BASE_URL}/pay/return`,
    TRANSACTION_DATE: transactionDate,
    LOCALE: "en-za",
    COUNTRY: "ZAF",
    EMAIL: email || "",
    PAY_METHOD: "",
    PAY_METHOD_DETAIL: "",
    NOTIFY_URL: `${BASE_URL}/pay/notify`,
    USER1: user1 || "",
    USER2: "",
    USER3: "",
    VAULT: "",
    VAULT_ID: ""
  };

  // Concatenate in spec order + secret key, then MD5
  const checksumSource =
    data.PAYGATE_ID +
    data.REFERENCE +
    data.AMOUNT +
    data.CURRENCY +
    data.RETURN_URL +
    data.TRANSACTION_DATE +
    data.LOCALE +
    data.COUNTRY +
    data.EMAIL +
    data.PAY_METHOD +
    data.PAY_METHOD_DETAIL +
    data.NOTIFY_URL +
    data.USER1 +
    data.USER2 +
    data.USER3 +
    data.VAULT +
    data.VAULT_ID +
    PAYGATE_KEY;

  data.CHECKSUM = md5(checksumSource);
  return data;
}

async function initiatePayWeb3(payload) {
  const body = new URLSearchParams(payload).toString();
  const resp = await axios.post(
    "https://secure.paygate.co.za/payweb3/initiate.trans",
    body,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  // PayGate responds URL-encoded: KEY=VALUE&KEY=VALUE...
  return Object.fromEntries(new URLSearchParams(resp.data));
}

// Redirect step happens in browser with PAY_REQUEST_ID + CHECKSUM
// Action URL: https://secure.paygate.co.za/payweb3/process.trans
function redirectForm(payRequestId, checksum) {
  return `<!doctype html>
<html>
  <body onload="document.forms[0].submit()">
    <form method="post" action="https://secure.paygate.co.za/payweb3/process.trans">
      <input type="hidden" name="PAY_REQUEST_ID" value="${payRequestId}" />
      <input type="hidden" name="CHECKSUM" value="${checksum}" />
      <noscript><button type="submit">Continue</button></noscript>
    </form>
  </body>
</html>`;
}

function paymentForm(benefitType, benefitName) {
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment - ${benefitName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 450px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      color: #333;
      font-size: 28px;
      margin-bottom: 10px;
      text-align: center;
    }
    .subtitle {
      color: #666;
      text-align: center;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      color: #333;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: all 0.3s;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .currency-input {
      position: relative;
    }
    .currency-input::before {
      content: 'R';
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #666;
      font-weight: 600;
      font-size: 16px;
    }
    .currency-input input {
      padding-left: 35px;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    .optional {
      color: #999;
      font-weight: 400;
      font-size: 12px;
    }
    .info {
      background: #f0f0f0;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${benefitName}</h1>
    <p class="subtitle">Enter your payment details</p>
    
    <form action="/pay/${benefitType}" method="GET">
      <div class="form-group">
        <label>Amount (Rands)</label>
        <div class="currency-input">
          <input type="number" name="amount" step="0.01" min="1" required placeholder="0.00" autofocus>
        </div>
      </div>
      
      <div class="form-group">
        <label>Member ID <span class="optional">(optional)</span></label>
        <input type="text" name="memberId" placeholder="Enter your member ID">
      </div>
      
      <div class="form-group">
        <label>Email <span class="optional">(optional)</span></label>
        <input type="email" name="email" placeholder="your@email.com">
      </div>
      
      <button type="submit">Proceed to Payment</button>
    </form>
    
    <div class="info">
      Secure payment powered by PayGate
    </div>
  </div>
</body>
</html>`;
}

// Your two public links
app.get("/pay/benefit-a", async (req, res) => {
  try {
    // If no amount, show payment form
    if (!req.query.amount) {
      return res.type("html").send(paymentForm("benefit-a", "Chauffeur Drive"));
    }
    
    const memberId = (req.query.memberId || "GEN").toString();
    const reference = `CHAUFFEUR-${memberId}-${Date.now()}`;
    const email = (req.query.email || "").toString();
    
    // Get amount from query parameter (in Rands) and convert to cents
    const amountRands = parseFloat(req.query.amount);
    if (isNaN(amountRands) || amountRands <= 0) {
      return res.status(400).send("Error: Please provide a valid amount greater than 0.");
    }
    const amountCents = Math.round(amountRands * 100);

    const payload = buildInitiatePayload({
      reference,
      amountCents,
      email,
      user1: "CHAUFFEUR_DRIVE"
    });

    const init = await initiatePayWeb3(payload);
    if (!init.PAY_REQUEST_ID || !init.CHECKSUM) {
      return res.status(500).send(`Initiate failed: ${JSON.stringify(init)}`);
    }
    res.type("html").send(redirectForm(init.PAY_REQUEST_ID, init.CHECKSUM));
  } catch (e) {
    res.status(500).send(`Error: ${e.message}`);
  }
});

app.get("/pay/benefit-b", async (req, res) => {
  try {
    // If no amount, show payment form
    if (!req.query.amount) {
      return res.type("html").send(paymentForm("benefit-b", "Luxury African Safari"));
    }
    
    const memberId = (req.query.memberId || "GEN").toString();
    const reference = `SAFARI-${memberId}-${Date.now()}`;
    const email = (req.query.email || "").toString();
    
    // Get amount from query parameter (in Rands) and convert to cents
    const amountRands = parseFloat(req.query.amount);
    if (isNaN(amountRands) || amountRands <= 0) {
      return res.status(400).send("Error: Please provide a valid amount greater than 0.");
    }
    const amountCents = Math.round(amountRands * 100);

    const payload = buildInitiatePayload({
      reference,
      amountCents,
      email,
      user1: "LUXURY_SAFARI"
    });

    const init = await initiatePayWeb3(payload);
    if (!init.PAY_REQUEST_ID || !init.CHECKSUM) {
      return res.status(500).send(`Initiate failed: ${JSON.stringify(init)}`);
    }
    res.type("html").send(redirectForm(init.PAY_REQUEST_ID, init.CHECKSUM));
  } catch (e) {
    res.status(500).send(`Error: ${e.message}`);
  }
});

// Minimal return + notify endpoints
app.get("/pay/return", (req, res) => {
  res.send("Returned from PayGate. You still need to query or validate notify to confirm payment.");
});

app.post("/pay/notify", express.urlencoded({ extended: false }), (req, res) => {
  // PayGate will POST transaction results here.
  // Next step: validate checksum and record transaction.
  res.status(200).send("OK");
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Running on ${BASE_URL} (port ${PORT})`));
}

// Export for Vercel
export default app;
