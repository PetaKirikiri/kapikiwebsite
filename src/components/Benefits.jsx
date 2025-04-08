import React from 'react';
import '../styles/benefits.css';

const Benefits = () => {
  return (
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
  );
};

export default Benefits; 