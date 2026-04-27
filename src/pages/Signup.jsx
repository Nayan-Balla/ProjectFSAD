import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { DEPARTMENTS } from "../constants/departments";
import SimpleCaptcha from "../components/SimpleCaptcha";
import { registerUser } from "../api/api";
import "../assets/styles/auth.css";

const PENDING_SIGNUP_KEY = "sms_pending_signup";

function Signup() {
  const navigate = useNavigate();
  const [role, setRole] = useState("Student");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [experience, setExperience] = useState(0);
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const captchaCodeRef = useRef("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCaptchaError("");
    setError("");
    
    const code = captchaCodeRef.current || captchaCode;
    const valid = (captchaInput || "").trim().toLowerCase() === (code || "").toLowerCase();
    if (!valid) {
      setCaptchaError("Invalid code. Please enter the code shown above.");
      return;
    }

    const form = e.target;
    const name = form.querySelector("#signup-name")?.value ?? "";
    const email = form.querySelector("#signup-email")?.value ?? "";
    const password = form.querySelector("#signup-password")?.value ?? "";
    const confirmPassword = form.querySelector("#signup-confirm")?.value ?? "";
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const dept = form.querySelector("#signup-department")?.value ?? department;
    const exp = role === "Admin" ? parseInt(form.querySelector("#signup-experience")?.value ?? "0", 10) : 0;

    setIsLoading(true);
    try {
      // Call the local registration function
      const response = await registerUser({
        name,
        email,
        password,
        role,
        department: dept,
        experience: exp
      });

      if (response.success) {
        // Persist signup data for OTP verification across refreshes/restarts
        localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify({
          name,
          email,
          password,
          role,
          department: dept,
          experience: exp
        }));
        
        // Redirect to OTP verification
        navigate("/otp-verification");
      } else {
        setError(response.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptchaCodeChange = (newCode) => {
    captchaCodeRef.current = newCode;
    setCaptchaCode(newCode);
  };

  return (
    <MainLayout>
      <div className="auth-container">
        <div className="auth-box">
          <h2>Sign up</h2>
          <p className="auth-desc">Create an account to access the platform.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                type="text"
                placeholder="Enter your full name"
                required
                autoComplete="name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-confirm">Confirm password</label>
              <input
                id="signup-confirm"
                type="password"
                placeholder="Re-enter your password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-role">Register as</label>
              <select
                id="signup-role"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Student">Student</option>
                <option value="Admin">Admin (Faculty)</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="signup-department">Department</label>
              <select
                id="signup-department"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            {role === "Admin" && (
              <div className="form-group">
                <label htmlFor="signup-experience">Experience (years)</label>
                <input
                  id="signup-experience"
                  type="number"
                  placeholder="Enter years of experience"
                  min="0"
                  max="50"
                  value={experience}
                  onChange={(e) => setExperience(parseInt(e.target.value, 10) || 0)}
                  required
                />
              </div>
            )}
            <div className="form-group form-group--captcha">
              <SimpleCaptcha
                onCodeChange={handleCaptchaCodeChange}
                value={captchaInput}
                onChange={setCaptchaInput}
                inputId="signup-captcha"
              />
              {captchaError && <p className="captcha-error">{captchaError}</p>}
            </div>
            
            {error && <p className="error-message" style={{ color: "red", marginBottom: "10px" }}>{error}</p>}
            
            <button type="submit" className="button-primary" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

export default Signup;
