import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

// Function to send email using Firebase Function
export const sendEmail = async (to, subject, body) => {
  console.log("Starting email send process...");
  console.log("Recipients:", to);
  console.log("Subject:", subject);
  console.log("Body length:", body.length);

  if (!functions) {
    console.error("Firebase Functions not initialized");
    throw new Error("Firebase Functions not initialized");
  }

  try {
    console.log("Initializing sendEmail function...");
    const sendEmailFunction = httpsCallable(functions, "sendEmail");

    // Ensure to is an array
    const recipients = Array.isArray(to) ? to : [to];
    console.log("Prepared recipients:", recipients);

    console.log("Calling Firebase Function...");
    const result = await sendEmailFunction({
      to: recipients,
      subject,
      body,
    });

    console.log("Function call completed. Response:", result);

    if (!result || !result.data) {
      console.error("No response data received from server");
      throw new Error("No response from server");
    }

    if (result.data.success === false) {
      console.error("Function returned error:", result.data.error);
      throw new Error(result.data.error?.message || "Failed to send email");
    }

    console.log("Email sent successfully");
    return result.data;
  } catch (error) {
    console.error("Error in sendEmail:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details,
    });
    throw error;
  }
};

// Function to start OAuth flow (not needed anymore since we're using Firebase Functions)
export const startOAuthFlow = async () => {
  // No need to start OAuth flow since we're using Firebase Functions
  return true;
};

// Function to handle OAuth callback (not needed anymore since we're using Firebase Functions)
export const handleAuthCallback = async (code) => {
  // No need to handle OAuth callback since we're using Firebase Functions
  return true;
};
