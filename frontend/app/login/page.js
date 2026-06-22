"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiClient } from "../api-client";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("admin");
  const [email, setEmail] = useState("admin@smartcampus.edu");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [admissionSuccess, setAdmissionSuccess] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({
    name: "", email: "", phone: "", department: "MCA", guardian: "", guardianPhone: ""
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const demoCredentials = {
    admin: { email: "admin@smartcampus.edu", password: "admin123", label: "Administrator" },
    faculty: { email: "alan.turing@university.edu", password: "faculty123", label: "Faculty" },
    student: { email: "niveditha.g@gmu.edu", password: "student123", label: "Student" },
    parent: { email: "parent@smartcampus.edu", password: "parent123", label: "Parent" },
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setEmail(demoCredentials[tab].email);
    setPassword(demoCredentials[tab].password);
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await ApiClient.login(email, password);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdmissionSubmit = async (e) => {
    e.preventDefault();
    try {
      await ApiClient.submitAdmission(admissionForm);
      setAdmissionSuccess(true);
      setTimeout(() => {
        setShowAdmissionForm(false);
        setAdmissionSuccess(false);
        setAdmissionForm({ name: "", email: "", phone: "", department: "MCA", guardian: "", guardianPhone: "" });
      }, 3000);
    } catch (err) {
      setError("Failed to submit admission application");
    }
  };

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg-shapes">
        <div className="login-shape shape-1"></div>
        <div className="login-shape shape-2"></div>
        <div className="login-shape shape-3"></div>
        <div className="login-shape shape-4"></div>
        <div className="login-shape shape-5"></div>
      </div>

      {/* Floating particles */}
      <div className="login-particles">
        {mounted && [...Array(20)].map((_, i) => (
          <span key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`
          }}></span>
        ))}
      </div>

      <div className="login-container">
        {/* Left side — branding panel */}
        <div className="login-branding">
          <div className="brand-content">
            <div className="brand-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="64" rx="16" fill="url(#brandGrad)" />
                <path d="M20 44V28L32 20L44 28V44" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M26 44V34H38V44" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="32" cy="28" r="3" fill="white" opacity="0.7" />
                <path d="M14 28L32 16L50 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                <defs>
                  <linearGradient id="brandGrad" x1="0" y1="0" x2="64" y2="64">
                    <stop offset="0%" stopColor="#6C5CE7" />
                    <stop offset="100%" stopColor="#0984E3" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="brand-title">SmartCampus</h1>
            <p className="brand-subtitle">ERP Solutions</p>
            <div className="brand-divider"></div>
            <p className="brand-desc">
              Next-generation institutional management platform for academic, administrative, and financial operations.
            </p>
            <div className="brand-features">
              <div className="brand-feature"><span className="feature-dot"></span>Student Management</div>
              <div className="brand-feature"><span className="feature-dot"></span>Faculty Dashboard</div>
              <div className="brand-feature"><span className="feature-dot"></span>Financial Tracking</div>
              <div className="brand-feature"><span className="feature-dot"></span>AI-Based Analytics</div>
            </div>
            <div className="brand-footer-text">GMU Davanagere &bull; MCA Program</div>
          </div>
        </div>

        {/* Right side — login form */}
        <div className="login-form-panel">
          {!showAdmissionForm ? (
            <>
              <div className="login-header">
                <h2>Welcome Back</h2>
                <p>Sign in to your SmartCampus account</p>
              </div>

              {/* Role tabs */}
              <div className="role-tabs">
                {Object.entries(demoCredentials).map(([key, val]) => (
                  <button
                    key={key}
                    className={`role-tab ${activeTab === key ? "active" : ""}`}
                    onClick={() => handleTabSwitch(key)}
                  >
                    <span className="role-icon">
                      {key === "admin" && "🛡️"}
                      {key === "faculty" && "🎓"}
                      {key === "student" && "📚"}
                      {key === "parent" && "👨‍👩‍👧"}
                    </span>
                    <span className="role-label">{val.label}</span>
                  </button>
                ))}
              </div>

              <form className="login-form" onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="login-email">Email Address</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="login-error">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className={`login-btn ${loading ? "loading" : ""}`}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="btn-spinner"></span>
                  ) : (
                    <>
                      Sign In
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </>
                  )}
                </button>

                <div className="demo-hint">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  <span>Demo mode — credentials auto-filled for <strong>{demoCredentials[activeTab].label}</strong> role</span>
                </div>
              </form>

              <div className="login-footer-link">
                <span>New Student?</span>
                <button onClick={() => setShowAdmissionForm(true)}>Apply for Admission →</button>
              </div>
            </>
          ) : (
            <>
              <div className="login-header">
                <h2>Apply for Admission</h2>
                <p>Submit your application to SmartCampus</p>
              </div>

              {admissionSuccess ? (
                <div className="admission-success">
                  <div className="success-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <h3>Application Submitted!</h3>
                  <p>Your admission application has been received. The admin team will review it shortly.</p>
                </div>
              ) : (
                <form className="login-form admission-form" onSubmit={handleAdmissionSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="adm-name">Full Name *</label>
                      <input id="adm-name" type="text" value={admissionForm.name} onChange={(e) => setAdmissionForm({...admissionForm, name: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="adm-email">Email *</label>
                      <input id="adm-email" type="email" value={admissionForm.email} onChange={(e) => setAdmissionForm({...admissionForm, email: e.target.value})} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="adm-phone">Phone *</label>
                      <input id="adm-phone" type="tel" value={admissionForm.phone} onChange={(e) => setAdmissionForm({...admissionForm, phone: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="adm-dept">Department *</label>
                      <select id="adm-dept" value={admissionForm.department} onChange={(e) => setAdmissionForm({...admissionForm, department: e.target.value})}>
                        <option value="MCA">MCA</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Civil Engineering">Civil Engineering</option>
                        <option value="Mechanical">Mechanical</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="adm-guardian">Guardian Name *</label>
                      <input id="adm-guardian" type="text" value={admissionForm.guardian} onChange={(e) => setAdmissionForm({...admissionForm, guardian: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="adm-guardian-phone">Guardian Phone</label>
                      <input id="adm-guardian-phone" type="tel" value={admissionForm.guardianPhone} onChange={(e) => setAdmissionForm({...admissionForm, guardianPhone: e.target.value})} />
                    </div>
                  </div>

                  <button type="submit" className="login-btn">
                    Submit Application
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </form>
              )}

              <div className="login-footer-link">
                <span>Already have an account?</span>
                <button onClick={() => { setShowAdmissionForm(false); setAdmissionSuccess(false); }}>← Back to Login</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
