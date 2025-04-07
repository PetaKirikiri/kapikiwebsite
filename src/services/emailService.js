import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export const sendEmail = async (to, subject, body) => {
  if (!functions) {
    throw new Error("Firebase Functions not initialized");
  }

  try {
    console.log("Starting email send process...");
    console.log("Recipients:", to);
    console.log("Subject:", subject);
    console.log("Body length:", body.length);

    const sendEmailFunction = httpsCallable(functions, "sendEmail");
    const recipients = Array.isArray(to) ? to : [to];

    console.log("Initializing sendEmail function...");
    console.log("Prepared recipients:", recipients);
    console.log("Calling Firebase Function...");

    const result = await sendEmailFunction({
      to: recipients,
      subject,
      body,
    });

    console.log("Function call completed. Response:", result);

    if (!result || !result.data) {
      throw new Error("No response from server");
    }

    if (result.data.success === false) {
      console.log("Function returned error:", result.data.error);
      throw new Error(result.data.error?.message || "Failed to send email");
    }

    return result.data;
  } catch (error) {
    console.error("Error in sendEmail:", error);
    throw error;
  }
};
