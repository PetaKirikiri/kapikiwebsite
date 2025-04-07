// Import the credentials directly
import credentials from "../client_secret_811771021125-37nptsve9d17qjgecm2kb8rrm387ieeh.apps.googleusercontent.com.json";

// We'll cache the OAuth credentials
let oauthCredentials = credentials;

// Get the base URL considering the basename
const getBaseUrl = () => {
  const isLocal = window.location.hostname === "localhost";
  // For local development, use the exact URI that's registered in Google Cloud Console
  return isLocal ? "/kapikiwebsite" : "/Ka-Piki";
};

// Use the base URL for the redirect URI
const OAUTH_REDIRECT_URI =
  window.location.origin + getBaseUrl() + "/oauth-callback";
console.log("Configured OAuth Redirect URI:", OAUTH_REDIRECT_URI);

// Store the configured URIs for reference
const AUTHORIZED_REDIRECT_URIS = [
  "http://localhost:3000/kapikiwebsite/oauth-callback",
  "https://petakirikiri.github.io/Ka-Piki/oauth-callback",
];
console.log("Authorized Redirect URIs:", AUTHORIZED_REDIRECT_URIS);
console.log(
  "Current Redirect URI matches authorized?",
  AUTHORIZED_REDIRECT_URIS.includes(OAUTH_REDIRECT_URI)
);

const SENDER_EMAIL = "peta@kapiki.co.nz";

async function loadOAuthCredentials() {
  return oauthCredentials;
}

// Function to start the OAuth flow
export async function startOAuthFlow() {
  console.log("Starting OAuth flow");
  const credentials = await loadOAuthCredentials();

  // Store current path for return after auth
  const currentPath =
    window.location.pathname.replace(getBaseUrl(), "") || "/clients";
  console.log("Storing return path:", currentPath);
  localStorage.setItem("emailAuthReturnTo", currentPath);

  // Build the OAuth URL
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.append("client_id", credentials.web.client_id);
  authUrl.searchParams.append("redirect_uri", OAUTH_REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append(
    "scope",
    "https://www.googleapis.com/auth/gmail.send"
  );
  authUrl.searchParams.append("access_type", "offline");
  authUrl.searchParams.append("prompt", "consent");

  console.log("Redirecting to OAuth URL:", authUrl.toString());
  window.location.href = authUrl.toString();
}

// Function to get access token using the refresh token
async function getAccessToken() {
  const refreshToken = localStorage.getItem("gmail_refresh_token");
  if (!refreshToken) {
    console.log("No refresh token found, starting OAuth flow");
    startOAuthFlow();
    return null;
  }

  console.log("Getting access token with refresh token");
  const credentials = await loadOAuthCredentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: credentials.web.client_id,
      client_secret: credentials.web.client_secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    console.log("Refresh token invalid, starting new OAuth flow");
    localStorage.removeItem("gmail_refresh_token");
    startOAuthFlow();
    return null;
  }

  const data = await response.json();
  console.log("Successfully got new access token");
  return data.access_token;
}

export async function handleAuthCallback(code) {
  console.log("handleAuthCallback: Starting to exchange code for tokens");
  try {
    const credentials = await loadOAuthCredentials();
    console.log("handleAuthCallback: Loaded credentials successfully");

    console.log("handleAuthCallback: About to make token exchange request");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: credentials.web.client_id,
        client_secret: credentials.web.client_secret,
        redirect_uri: OAUTH_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    console.log(
      "handleAuthCallback: Token exchange response status:",
      response.status
    );
    const responseText = await response.text();
    console.log(
      "handleAuthCallback: Token exchange raw response:",
      responseText
    );

    let data;
    try {
      data = JSON.parse(responseText);
      console.log("handleAuthCallback: Parsed response data:", {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
      });
    } catch (e) {
      console.error("handleAuthCallback: Failed to parse response:", e);
      throw new Error("Failed to parse token response");
    }

    if (!response.ok) {
      console.error(
        "handleAuthCallback: Token exchange failed:",
        data.error_description || data.error
      );
      throw new Error(
        data.error_description || data.error || "Token exchange failed"
      );
    }

    if (!data.refresh_token) {
      console.warn("handleAuthCallback: No refresh token in response");
    } else {
      console.log("handleAuthCallback: Storing refresh token in localStorage");
      localStorage.setItem("gmail_refresh_token", data.refresh_token);
    }

    return data.access_token;
  } catch (error) {
    console.error("handleAuthCallback: Error during token exchange:", error);
    throw error;
  }
}

// Export the hasValidCredentials function
export async function hasValidCredentials() {
  try {
    const refreshToken = localStorage.getItem("gmail_refresh_token");
    if (!refreshToken) {
      console.log("No refresh token found in localStorage");
      return false;
    }

    // Try to get an access token with the refresh token
    const accessToken = await getAccessToken();
    console.log("Refresh token is valid:", !!accessToken);
    return !!accessToken;
  } catch (error) {
    console.error("Error checking credentials:", error);
    return false;
  }
}

// Export the sendEmail function
export async function sendEmail(to, subject, body) {
  try {
    // First check if we have valid credentials
    const hasCredentials = await hasValidCredentials();
    if (!hasCredentials) {
      console.log("No valid credentials found, starting OAuth flow");
      await startOAuthFlow();
      return; // The page will redirect to Google OAuth
    }

    // If we have credentials, proceed with sending email
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error("Could not get access token - authentication required");
    }

    // Log the raw data we received
    console.log("Raw email data:", {
      to: to,
      subject: subject,
      message: body,
    });

    // Create email message
    const message = createMessage(to, subject, body);

    // Log the formatted message before encoding
    const decodedMessage = atob(message);
    console.log("Formatted email before sending:", decodedMessage);

    // Send email using Gmail API with your email address
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(
        SENDER_EMAIL
      )}/messages/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: message }),
      }
    );

    const responseText = await response.text();
    console.log("Gmail API response:", response.status, responseText);

    if (!response.ok) {
      console.error("Gmail API error response:", responseText);
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.error?.message || "Failed to send email");
      } catch (e) {
        throw new Error("Failed to send email: " + responseText);
      }
    }

    // Only return success if we get a message ID back
    try {
      const responseData = JSON.parse(responseText);
      if (!responseData.id) {
        throw new Error("No message ID in response");
      }
      return {
        success: true,
        messageId: responseData.id,
        message: "Email sent successfully and confirmed by Gmail",
      };
    } catch (e) {
      throw new Error("Could not confirm email was sent: " + responseText);
    }
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

function createMessage(recipientEmails, subject, messageText) {
  // Format the email headers properly
  const headers = {
    "MIME-Version": "1.0",
    "Content-Type": 'text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding": "7bit",
    From: SENDER_EMAIL,
    To: recipientEmails.join(","),
    Subject: subject,
  };

  // Build the email with proper headers
  const email =
    Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\r\n") +
    "\r\n\r\n" +
    messageText;

  // Base64URL encode the email
  const base64Email = btoa(email)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  console.log("Created email:", {
    headers,
    messageText,
    encodedLength: base64Email.length,
  });

  return base64Email;
}
