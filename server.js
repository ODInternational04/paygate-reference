import "dotenv/config";
import express from "express";
import crypto from "crypto";
import axios from "axios";

const app = express();

// Middleware for parsing request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      background: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      border: 1px solid #e0e0e0;
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
      background: #333;
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
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
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
        <label>Member ID</label>
        <input type="text" name="memberId" placeholder="Enter your member ID" required>
      </div>
      
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" placeholder="your@email.com" required>
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

// Home page - landing page with links to both payment forms
app.get("/", (req, res) => {
  res.type("html").send(`<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Gateway</title>
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
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 600px;
      width: 100%;
      padding: 50px 40px;
      text-align: center;
    }
    h1 {
      color: #333;
      font-size: 36px;
      margin-bottom: 15px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 40px;
      font-size: 16px;
    }
    .cards {
      display: grid;
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      padding: 30px;
      text-decoration: none;
      color: white;
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
    }
    .card h2 {
      font-size: 24px;
      margin-bottom: 10px;
    }
    .card p {
      font-size: 14px;
      opacity: 0.9;
    }
    .footer {
      color: #999;
      font-size: 13px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Payment Gateway</h1>
    <p class="subtitle">Select a payment option to continue</p>
    
    <div class="cards">
      <a href="/pay/benefit-a" class="card">
        <h2>Chauffeur Drive</h2>
        <p>Premium chauffeur service payment</p>
      </a>
      
      <a href="/pay/benefit-b" class="card">
        <h2>Luxury African Safari</h2>
        <p>Luxury safari experience payment</p>
      </a>
    </div>
    
    <div class="footer">
      Secure payment powered by PayGate
    </div>
  </div>
</body>
</html>`);
});

// Your two public links
app.get("/pay/benefit-a", async (req, res) => {
  try {
    // If no amount, show payment form
    if (!req.query.amount) {
      return res.type("html").send(paymentForm("benefit-a", "Chauffeur Drive"));
    }
    
    const memberId = (req.query.memberId || "GEN").toString();
    const reference = `CHAUFFEUR-DRIVE-${memberId}-${Date.now()}`;
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

// Thank you page after payment
function thankYouPage(status, reference, transactionId) {
  const isApproved = status === "1";
  const isDeclined = status === "2";
  const isPending = status === "0" || status === "4";
  
  let statusTitle, statusMessage, statusColor, statusIcon;
  
  if (isApproved) {
    statusTitle = "Payment Approved!";
    statusMessage = "Your payment has been successfully processed.";
    statusColor = "#10b981";
    statusIcon = "✓";
  } else if (isDeclined) {
    statusTitle = "Payment Declined";
    statusMessage = "Unfortunately, your payment was declined. Please try again or use a different payment method.";
    statusColor = "#ef4444";
    statusIcon = "✗";
  } else {
    statusTitle = "Payment Pending";
    statusMessage = "Your payment is being processed. You will receive a confirmation shortly.";
    statusColor = "#f59e0b";
    statusIcon = "⏱";
  }
  
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusTitle}</title>
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
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      padding: 50px 40px;
      text-align: center;
      animation: slideIn 0.5s ease-out;
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .status-icon {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: ${statusColor};
      color: white;
      font-size: 60px;
      line-height: 100px;
      margin: 0 auto 30px;
      animation: scaleIn 0.5s ease-out 0.2s both;
    }
    @keyframes scaleIn {
      from {
        transform: scale(0);
      }
      to {
        transform: scale(1);
      }
    }
    h1 {
      color: #333;
      font-size: 32px;
      margin-bottom: 15px;
    }
    .message {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .details {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      text-align: left;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #666;
      font-size: 14px;
      font-weight: 600;
    }
    .detail-value {
      color: #333;
      font-size: 14px;
      font-family: monospace;
    }
    .button {
      display: inline-block;
      padding: 14px 40px;
      background: #333;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    }
    .footer {
      margin-top: 30px;
      color: #999;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="status-icon">${statusIcon}</div>
    <h1>${statusTitle}</h1>
    <p class="message">${statusMessage}</p>
    
    ${reference || transactionId ? `
    <div class="details">
      ${reference ? `<div class="detail-row">
        <span class="detail-label">Reference:</span>
        <span class="detail-value">${reference}</span>
      </div>` : ''}
      ${transactionId ? `<div class="detail-row">
        <span class="detail-label">Transaction ID:</span>
        <span class="detail-value">${transactionId}</span>
      </div>` : ''}
      <div class="detail-row">
        <span class="detail-label">Status:</span>
        <span class="detail-value" style="color: ${statusColor}; font-weight: bold;">${isApproved ? 'APPROVED' : isDeclined ? 'DECLINED' : 'PENDING'}</span>
      </div>
    </div>
    ` : ''}
    
    <a href="/" class="button">Return to Home</a>
    
    <div class="footer">
      ${isApproved ? 'You will receive a confirmation email shortly.' : ''}
      ${isDeclined ? 'Please contact support if you need assistance.' : ''}
    </div>
  </div>
</body>
</html>`;
}

// Return endpoint - user gets redirected here after payment
app.get("/pay/return", (req, res) => {
  // PayGate returns these parameters
  const {
    PAY_REQUEST_ID,
    TRANSACTION_STATUS,
    REFERENCE,
    TRANSACTION_ID,
    CHECKSUM
  } = req.query;
  
  // Validate checksum
  if (CHECKSUM) {
    const checksumSource = 
      PAYGATE_ID +
      (PAY_REQUEST_ID || "") +
      (TRANSACTION_STATUS || "") +
      (REFERENCE || "") +
      PAYGATE_KEY;
    const calculatedChecksum = md5(checksumSource);
    
    if (calculatedChecksum !== CHECKSUM) {
      console.error("Invalid checksum on return");
      return res.status(400).send("Invalid transaction data");
    }
  }
  
  res.type("html").send(thankYouPage(
    TRANSACTION_STATUS || "0",
    REFERENCE,
    TRANSACTION_ID
  ));
});

// Notify endpoint - PayGate posts transaction results here
app.post("/pay/notify", (req, res) => {
  // PayGate will POST transaction results here
  const {
    PAYGATE_ID: receivedPaygateId,
    PAY_REQUEST_ID,
    REFERENCE,
    TRANSACTION_STATUS,
    TRANSACTION_ID,
    RESULT_CODE,
    AUTH_CODE,
    AMOUNT,
    RESULT_DESC,
    TRANSACTION_DATE,
    CHECKSUM
  } = req.body;
  
  // Validate checksum
  const checksumSource = 
    (receivedPaygateId || "") +
    (PAY_REQUEST_ID || "") +
    (REFERENCE || "") +
    (TRANSACTION_STATUS || "") +
    (RESULT_CODE || "") +
    (AUTH_CODE || "") +
    (AMOUNT || "") +
    (RESULT_DESC || "") +
    (TRANSACTION_ID || "") +
    (TRANSACTION_DATE || "") +
    PAYGATE_KEY;
  
  const calculatedChecksum = md5(checksumSource);
  
  if (calculatedChecksum !== CHECKSUM) {
    console.error("Invalid checksum on notify");
    return res.status(400).send("ERROR");
  }
  
  // Log transaction details
  console.log("Payment notification received:", {
    reference: REFERENCE,
    status: TRANSACTION_STATUS,
    transactionId: TRANSACTION_ID,
    resultCode: RESULT_CODE,
    amount: AMOUNT,
    resultDesc: RESULT_DESC
  });
  
  // Here you would typically:
  // 1. Store transaction in database
  // 2. Update order status
  // 3. Send confirmation email
  // 4. Trigger any post-payment workflows
  
  res.status(200).send("OK");
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Running on ${BASE_URL} (port ${PORT})`));
}

// Export for Vercel
export default app;
