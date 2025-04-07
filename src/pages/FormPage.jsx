import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Airtable from 'airtable';
import '../styles/dashboard.css';

// Debug environment variables at the top level
console.log('Top Level Environment Variables:', {
  SERPAPI_KEY: process.env.REACT_APP_SERPAPI_KEY,
  NODE_ENV: process.env.NODE_ENV,
  PUBLIC_URL: process.env.PUBLIC_URL
});

// Define source type options exactly as they appear in Airtable
const SOURCE_TYPE_OPTIONS = [
  'Website',
  'Referral',
  'Social Media',
  'Email',
  'Other'
];

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.REACT_APP_AIRTABLE_API_KEY
}).base(process.env.REACT_APP_AIRTABLE_BASE_ID);

// Table and View IDs
const CLIENTS_TABLE_ID = 'tblY7oFqsMB7nYorj';
const CLIENTS_VIEW_ID = 'viwXaXxc30vOprTcd';

const FormPage = () => {
  const [formData, setFormData] = useState({
    OrganizationName: '',
    ContactName: '',
    Email: '',
    SourceType: [],
    WebsiteURL: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedLeads, setSuggestedLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('https://api.airtable.com/v0/appXrH3hxXQvQJQ8C/Leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            OrganizationName: formData.OrganizationName,
            ContactName: formData.ContactName,
            Email: formData.Email,
            SourceType: formData.SourceType,
            WebsiteURL: formData.WebsiteURL
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add client');
      }

      setSubmitSuccess(true);
      setFormData({
        OrganizationName: '',
        ContactName: '',
        Email: '',
        SourceType: [],
        WebsiteURL: ''
      });
      setAiSuggestion(null);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIAssist = async () => {
    if (!formData.WebsiteURL) return;

    setIsProcessing(true);
    // Simulated AI response - replace with actual API call
    setTimeout(() => {
      setAiSuggestion({
        organizationName: "Example Corp",
        contactName: "John Smith",
        email: "john@example.com"
      });
      setIsProcessing(false);
    }, 1500);
  };

  const acceptSuggestion = () => {
    if (!aiSuggestion) return;

    setFormData(prev => ({
      ...prev,
      OrganizationName: aiSuggestion.organizationName,
      ContactName: aiSuggestion.contactName,
      Email: aiSuggestion.email
    }));
    setAiSuggestion(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLeadSelect = (leadId) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const handleFindLeads = async () => {
    if (!searchQuery) {
      setError("Please enter a search query");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        api_key: process.env.REACT_APP_SERPAPI_KEY,
        engine: "google",
        num: 10,
        gl: "nz",
        hl: "en"
      });

      const response = await fetch(`https://serpapi.com/search.json?${params}`, {
        method: "GET",
        mode: "cors"
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Raw API response:", data);

      const leadsData = data.organic_results.map((result, index) => ({
        id: index,
        organizationName: result.title,
        website: result.link,
        contactName: "",
        email: ""
      }));

      console.log("Processed leads:", leadsData);
      setSuggestedLeads(leadsData);
      setSuccess("Leads found successfully!");
    } catch (error) {
      console.error("Error finding leads:", error);
      setError("Failed to find leads: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSelected = async () => {
    // TODO: Implement API call to add selected leads to Airtable
    const selectedLeadData = suggestedLeads.filter(lead => selectedLeads.has(lead.id));
    console.log('Selected leads:', selectedLeadData);
  };

  const handleAddClient = async () => {
    if (!websiteUrl) {
      setError("Please enter a website URL");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const record = await base(CLIENTS_TABLE_ID).create([
        {
          fields: {
            WebsiteURL: websiteUrl,
            Status: "New"
          }
        }
      ]);

      setSuccess("Client added successfully!");
      setWebsiteUrl("");
    } catch (error) {
      console.error("Error adding client:", error);
      setError("Failed to add client: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Navigation />
      
      {/* Manual Insertion Section */}
      <div className="container">
        <h2>Manual Insertion</h2>
        <form onSubmit={handleSubmit} className="modern-form">
          {submitSuccess && (
            <div className="success-message">
              Client added successfully!
            </div>
          )}
          {submitError && (
            <div className="error-message">
              {submitError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Organization Name</label>
            <input
              type="text"
              name="OrganizationName"
              value={formData.OrganizationName}
              onChange={handleChange}
              required
              className="form-input"
              disabled={isSubmitting}
              placeholder="Enter organization name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contact Name</label>
            <input
              type="text"
              name="ContactName"
              value={formData.ContactName}
              onChange={handleChange}
              required
              className="form-input"
              disabled={isSubmitting}
              placeholder="Enter contact name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="Email"
              value={formData.Email}
              onChange={handleChange}
              required
              className="form-input"
              disabled={isSubmitting}
              placeholder="Enter email address"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Source Type</label>
            <select
              name="SourceType"
              value={formData.SourceType[0] || ''}
              onChange={(e) => {
                setFormData(prev => ({
                  ...prev,
                  SourceType: [e.target.value]
                }));
              }}
              className="form-select"
              disabled={isSubmitting}
            >
              <option value="">Select a source</option>
              {SOURCE_TYPE_OPTIONS.map(source => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group full-width">
            <label className="form-label">Website URL</label>
            <div className="website-url-group">
              <input
                type="text"
                name="WebsiteURL"
                value={formData.WebsiteURL}
                onChange={handleChange}
                className="form-input"
                disabled={isSubmitting}
                placeholder="Enter website URL"
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* AI Assist Section */}
      <div className="container" style={{ marginTop: '2rem' }}>
        <h2>AI-Powered Lead Finder</h2>
        <div className="modern-form">
          <div className="form-group full-width">
            <label className="form-label">Search Query</label>
            <div className="search-query-group">
              <input
                type="text"
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Primary Schools in Wellington"
              />
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleFindLeads}
              >
                Find Leads
              </button>
            </div>
          </div>
        </div>

        {suggestedLeads.length > 0 && (
          <>
            <div className="modern-table-container" style={{ marginTop: '1.5rem' }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Organization</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Website</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestedLeads.map(lead => (
                    <tr key={lead.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead.id)}
                          onChange={() => handleLeadSelect(lead.id)}
                        />
                      </td>
                      <td>{lead.organizationName}</td>
                      <td>{lead.contactName}</td>
                      <td>{lead.email}</td>
                      <td>{lead.website}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAcceptSelected}
              style={{ marginTop: '1rem' }}
              disabled={selectedLeads.size === 0}
            >
              Add Selected to Database
            </button>
          </>
        )}
      </div>

      {/* Add Client Section */}
      <div className="container" style={{ marginTop: '2rem' }}>
        <h2>Add Client</h2>
        <div className="form-group">
          <input
            type="text"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="Enter website URL"
            className="form-control"
          />
          <button
            className="btn btn-primary"
            onClick={handleAddClient}
            disabled={isLoading}
          >
            {isLoading ? "Adding..." : "Add Client"}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
    </div>
  );
};

export default FormPage; 