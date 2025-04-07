/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");
const { google } = require("googleapis");
const serviceAccount = require("./service-account.json");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Initialize the JWT client
const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
  ],
  "kiaora@kapiki.co.nz"
);

// Create Gmail API client
const gmail = google.gmail({ version: "v1", auth: jwtClient });

exports.sendEmail = onCall(
  {
    cors: true, // Allow all origins in development
    maxInstances: 10,
    region: "us-central1",
    memory: "256MiB",
    minInstances: 0,
  },
  async (request) => {
    // Log the incoming request
    logger.info("Email function called", {
      data: request.data,
      auth: request.auth
        ? {
            uid: request.auth.uid,
            token: request.auth.token,
          }
        : "not authenticated",
      headers: request.rawRequest.headers,
      origin: request.rawRequest.headers.origin,
      method: request.rawRequest.method,
    });

    // Check if the user is authenticated
    if (!request.auth) {
      logger.error("Unauthorized access attempt", {
        headers: request.rawRequest.headers,
        origin: request.rawRequest.headers.origin,
      });
      throw new Error("User must be authenticated to send emails.");
    }

    try {
      const { to, subject, body } = request.data;

      // Validate input
      if (!to || !Array.isArray(to) || to.length === 0) {
        logger.error("Invalid recipients", { to });
        throw new Error("Recipients array is required.");
      }
      if (!subject) {
        logger.error("Missing subject");
        throw new Error("Subject is required.");
      }
      if (!body) {
        logger.error("Missing body");
        throw new Error("Email body is required.");
      }

      logger.info("Preparing to send email", {
        to,
        subject,
        bodyLength: body.length,
        auth: request.auth.uid,
      });

      // Create email content
      const emailLines = [
        `To: ${to.join(", ")}`,
        "From: kiaora@kapiki.co.nz",
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${subject}`,
        "",
        body,
      ];

      const email = emailLines.join("\r\n").trim();
      const base64Email = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      logger.info("Sending email via Gmail API");
      // Send email
      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: base64Email,
        },
      });

      logger.info("Email sent successfully", {
        response,
        messageId: response.data.id,
      });
      return { success: true };
    } catch (error) {
      logger.error("Error sending email:", {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code,
          details: error.details,
        },
        request: {
          to: request.data.to,
          subject: request.data.subject,
          bodyLength: request.data.body?.length,
        },
      });
      // Return a more detailed error response
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      };
    }
  }
);
