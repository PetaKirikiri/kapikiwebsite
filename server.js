const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const serviceAccount = require("./service-account.json");

const app = express();
app.use(cors());
app.use(express.json());

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];
const TARGET_EMAIL = "kiaora@kapiki.co.nz";

// Initialize the JWT client
const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  SCOPES,
  TARGET_EMAIL
);

app.post("/api/token", async (req, res) => {
  try {
    const tokens = await jwtClient.authorize();
    res.json({ access_token: tokens.access_token });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
