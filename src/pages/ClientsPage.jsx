import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendEmail } from "../services/emailService";
import { useAuth } from "../contexts/AuthProvider";
import Navigation from "../components/Navigation";
import Airtable from "airtable";
import '../styles/dashboard.css';

// Debug the environment variables
console.log('Raw env values:', {
  key: process.env.REACT_APP_AIRTABLE_API_KEY,
  base: process.env.REACT_APP_AIRTABLE_BASE_ID
});

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.REACT_APP_AIRTABLE_API_KEY
}).base(process.env.REACT_APP_AIRTABLE_BASE_ID);

// Table and View IDs
const CLIENTS_TABLE_ID = 'tblY7oFqsMB7nYorj';
const CLIENTS_VIEW_ID = 'viwXaXxc30vOprTcd';
const EMAIL_TABLE_ID = 'tblRS46arAPZtfY1R';
const EMAIL_VIEW_ID = 'viwtidKFNeXp0cfkQ';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { } = useAuth();

  useEffect(() => {
    const checkCredentials = async () => {
      try {
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking credentials:", error);
        setIsLoading(false);
      }
    };

    checkCredentials();
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch email template first
        console.log('Fetching email template...');
        const templateRecords = await base(EMAIL_TABLE_ID).select({
          view: EMAIL_VIEW_ID
        }).all();
        
        if (templateRecords && templateRecords.length > 0) {
          const template = templateRecords[0];
          // Get the first field value from the template
          const templateValue = Object.values(template.fields)[0] || "";
          setEmailTemplate({
            subject: templateValue,
            body: templateValue,
          });
        }

        // Fetch clients
        console.log('Fetching clients from Airtable...');
        const records = await base(CLIENTS_TABLE_ID).select({
          view: CLIENTS_VIEW_ID
        }).all();
        
        console.log('Got records:', records);

        const clientsData = records.map(record => ({
          id: record.id,
          organizationName: record.fields.OrganizationName || "",
          contactName: record.fields.ContactName || "",
          email: record.fields.Email || "",
        }));

        setClients(clientsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        console.error("Full error object:", JSON.stringify(error, null, 2));
        setError("Failed to fetch data: " + error.message);
      }
    };

    fetchData();
  }, []);

  const handleClientSelect = (clientId) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const handleSendEmail = async () => {
    if (selectedClients.size === 0) {
      setError("Please select at least one client");
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      setSuccess(null);

      const selectedEmails = clients
        .filter((client) => selectedClients.has(client.id))
        .map((client) => client.email);

      if (selectedEmails.length === 0) {
        setError("No email addresses found for selected clients");
        return;
      }

      if (!emailTemplate?.subject || !emailTemplate?.body) {
        setError("Email template is missing subject or body");
        return;
      }

      const result = await sendEmail(selectedEmails, emailTemplate.subject, emailTemplate.body);
      
      if (result.success) {
        setSuccess("Email sent successfully!");
        setSelectedClients(new Set());
      } else {
        setError(result.error?.message || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      setError("Failed to send email: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Navigation />
      <div className="container">
        <h2>Clients</h2>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="clients-list">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Organization</th>
                    <th>Contact</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedClients.has(client.id)}
                          onChange={() => handleClientSelect(client.id)}
                        />
                      </td>
                      <td>{client.organizationName}</td>
                      <td>{client.contactName}</td>
                      <td>{client.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {emailTemplate && (
              <div className="email-section">
                <h3>Email Template</h3>
                <div className="email-preview">
                  <p><strong>Subject:</strong> {emailTemplate.subject}</p>
                  <p><strong>Body:</strong></p>
                  <div className="email-body">{emailTemplate.body}</div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleSendEmail}
                  disabled={isSending || selectedClients.size === 0}
                >
                  {isSending ? "Sending..." : "Send Email"}
                </button>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
          </>
        )}
      </div>
    </div>
  );
} 