import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendEmail, hasValidCredentials, startOAuthFlow } from "../services/emailService";
import { useAuth } from "../contexts/AuthContext";
import Navigation from "../components/Navigation";
import Airtable from "airtable";
import '../styles/spinner.css';

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
  const [selectedClients, setSelectedClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const checkCredentials = async () => {
      try {
        const isValid = await hasValidCredentials();
        console.log("Gmail credentials status:", isValid ? "Valid" : "Not valid");
        
        if (!isValid) {
          await startOAuthFlow();
          return;
        }
        
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
          setEmailTemplate({
            subject: template.fields.Subject || "",
            body: template.fields.Body || "",
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

  const handleSendEmail = async () => {
    if (!emailTemplate || selectedClients.length === 0) return;

    setIsSending(true);
    setError("");
    setSuccess("");

    try {
      // Get all selected client emails
      const selectedEmails = selectedClients.map(clientId => {
        const client = clients.find(c => c.id === clientId);
        return client ? client.email : null;
      }).filter(Boolean); // Remove any null values

      // Send to all selected emails at once
      await sendEmail(
        selectedEmails,
        emailTemplate.subject,
        emailTemplate.body
      );

      setSuccess("Emails sent successfully!");
      setSelectedClients([]);
    } catch (error) {
      console.error("Error sending email:", error);
      setError(error.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const toggleClient = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '1rem', color: '#666' }}>Checking Gmail credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Navigation />
      <h1>Clients</h1>
      
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: '10px' }}>{success}</div>}

      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <table style={{ 
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'white'
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Organization</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Contact</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr 
                key={client.id} 
                style={{ 
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: selectedClients.includes(client.id) ? '#f3f4f6' : 'white'
                }}
              >
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={() => toggleClient(client.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    {client.organizationName}
                  </div>
                </td>
                <td style={{ padding: '12px' }}>{client.contactName}</td>
                <td style={{ padding: '12px' }}>{client.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <button
          onClick={handleSendEmail}
          disabled={isSending || selectedClients.length === 0}
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: (isSending || selectedClients.length === 0) ? 0.5 : 1
          }}
        >
          Send Email Template
        </button>
      </div>
    </div>
  );
} 