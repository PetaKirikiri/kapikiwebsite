import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/hero.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Don't show anything while loading
  }

  return (
    <div className="app">
      <section className="hero">
        <div className="hero-header">
          <button 
            className="login-button"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
        </div>
        <div className="hero-content">
          <h1>Elevating Māori Language Education</h1>
          <button className="cta-button">Book a Course</button>
        </div>
      </section>

      <section className="benefits">
        <div className="benefits-grid">
          <div className="benefit-card">
            <h3>Expert Instructors</h3>
            <p>Learn from native speakers and qualified Māori language educators.</p>
          </div>
          <div className="benefit-card">
            <h3>Small Class Sizes</h3>
            <p>Personalized attention with intimate learning environments.</p>
          </div>
          <div className="benefit-card">
            <h3>Flexible Learning</h3>
            <p>Online and in-person options to suit your schedule.</p>
          </div>
          <div className="benefit-card">
            <h3>Comprehensive Curriculum</h3>
            <p>Structured learning paths from beginner to advanced levels.</p>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <h2>What Our Students Say</h2>
        <div className="testimonial-grid">
          <div className="testimonial-card">
            <p>"The quality of instruction and cultural insights provided by Ka Piki have been invaluable to my journey in learning te reo Māori."</p>
            <div className="testimonial-author">
              <strong>Student Name</strong>
              <p>Position, Organization</p>
            </div>
          </div>
          <div className="testimonial-card">
            <p>"The quality of instruction and cultural insights provided by Ka Piki have been invaluable to my journey in learning te reo Māori."</p>
            <div className="testimonial-author">
              <strong>Student Name</strong>
              <p>Position, Organization</p>
            </div>
          </div>
          <div className="testimonial-card">
            <p>"The quality of instruction and cultural insights provided by Ka Piki have been invaluable to my journey in learning te reo Māori."</p>
            <div className="testimonial-author">
              <strong>Student Name</strong>
              <p>Position, Organization</p>
            </div>
          </div>
        </div>
      </section>

      <section className="team">
        <h2>Our Team</h2>
        <div className="team-grid">
          <div className="team-member">
            <h3>Team Member</h3>
            <p>Position</p>
          </div>
          <div className="team-member">
            <h3>Team Member</h3>
            <p>Position</p>
          </div>
          <div className="team-member">
            <h3>Team Member</h3>
            <p>Position</p>
          </div>
          <div className="team-member">
            <h3>Team Member</h3>
            <p>Position</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage; 