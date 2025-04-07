import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { table } from '../config/airtable';
import Navigation from './Navigation';
import { findOrganizations } from '../services/scraperService';
import '../styles/form.css';

// Define source type options exactly as they appear in Airtable
const SOURCE_TYPE_OPTIONS = ['Website', 'LinkedIn', 'Referral'];

const FormPage = () => {
  const [formData, setFormData] = useState({
    OrganizationName: '',
    ContactName: '',
    Email: '',
    WebsiteURL: '',
    SourceType: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const organizations = await findOrganizations(searchQuery);
      if (organizations && organizations.length > 0) {
        // Take the first result
        const org = organizations[0];
        setFormData(prev => ({
          ...prev,
          OrganizationName: org.organizationName || '',
          ContactName: org.contactName || '',
          Email: org.email || '',
          WebsiteURL: org.websiteUrl || '',
          SourceType: ['Website'] // Default to Website as source
        }));
      }
    } catch (error) {
      console.error('Error searching organizations:', error);
      setSubmitError('Failed to search organizations');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      await table.create([
        {
          fields: {
            OrganizationName: formData.OrganizationName,
            ContactName: formData.ContactName,
            Email: formData.Email,
            WebsiteURL: formData.WebsiteURL,
            SourceType: formData.SourceType
          }
        }
      ]);

      setSubmitSuccess(true);
      setFormData({
        OrganizationName: '',
        ContactName: '',
        Email: '',
        WebsiteURL: '',
        SourceType: []
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(error.message || 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="form-container">
      <Navigation />
      <div className="form-header">
        <button
          onClick={handleLogout}
          className="logout-button"
        >
          Logout
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        {submitSuccess && (
          <div className="success-message">
            Form submitted successfully!
          </div>
        )}
        {submitError && (
          <div className="error-message">
            {submitError}
          </div>
        )}

        <div className="form-group search-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for organization (e.g., 'schools in wellington')"
            className="form-input"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="search-button"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

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
          />
        </div>

        <div className="form-group">
          <label className="form-label">Website URL</label>
          <input
            type="text"
            name="WebsiteURL"
            value={formData.WebsiteURL}
            onChange={handleChange}
            className="form-input"
            disabled={isSubmitting}
            placeholder="Enter website URL"
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
            className="select-input"
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

        <button 
          type="submit" 
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
};

export default FormPage; 