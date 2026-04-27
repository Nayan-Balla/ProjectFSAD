import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import { verifyOtp, resendOtp, loginUser } from "../api/api";
import "../assets/styles/auth.css";

const PENDING_SIGNUP_KEY = "sms_pending_signup";
const PENDING_VERIFICATION_EMAIL_KEY = "sms_pending_verification_email";
const POST_VERIFY_MESSAGE_KEY = "sms_post_verify_message";

function OtpVerification() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [pendingSignup, setPendingSignup] = useState(null);

  useEffect(() => {
    const pendingSignupRaw = localStorage.getItem(PENDING_SIGNUP_KEY);
    const pendingVerificationEmail = localStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);

    if (!pendingSignupRaw && !pendingVerificationEmail) {
      navigate("/signup");
      return;
    }

    if (pendingSignupRaw) {
      try {
        const signupData = JSON.parse(pendingSignupRaw);
        setPendingSignup(signupData);
        setEmail(signupData.email);
        return;
      } catch (err) {
        console.error("Error parsing pending signup data:", err);
      }
    }

    if (pendingVerificationEmail) {
      setEmail(pendingVerificationEmail);
      setPendingSignup(null);
      return;
    }

    navigate("/signup");
  }, [navigate]);

  const handleVerify = async () => {
    if (!email) {
      setError("Email not found. Please sign up again.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await verifyOtp({ email, otp });

      if (!response.success) {
        setError(response.error || "Invalid OTP. Please try again.");
        return;
      }

      if (pendingSignup) {
        try {
          const loginResponse = await loginUser({ email: pendingSignup.email, password: pendingSignup.password });

          if (!loginResponse.success) {
            setError(loginResponse.error || "OTP verified, but login failed. Please sign in.");
            return;
          }

          const loginData = loginResponse.data;
          localStorage.removeItem(PENDING_SIGNUP_KEY);
          localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);

          login({
            id: loginData.id,
            role: loginData.role,
            email: pendingSignup.email,
            name: loginData.name || pendingSignup.name,
            department: pendingSignup.department || "",
            experience: pendingSignup.experience || 0,
            token: loginData.token,
          });

          if (loginData.role === "Student") {
            navigate("/add-submission");
          } else {
            navigate("/marking");
          }
          return;
        } catch (err) {
          setError(err.message || "Login failed after OTP verification.");
          return;
        }
      }

      localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
      localStorage.setItem(POST_VERIFY_MESSAGE_KEY, "Email verified successfully. Please log in.");
      navigate("/login");
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Email not found. Please sign up again.");
      return;
    }

    try {
      setResendLoading(true);
      setError("");
      setResendMessage("");
      const response = await resendOtp({ email });

      if (response.success) {
        setResendMessage("OTP resent successfully! Check your email.");
        setOtp("");
      } else {
        setError(response.error || "Failed to resend OTP. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Error resending OTP");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="auth-container">
        <div className="auth-box">
          <div className="otp-verification">
            <h2>Verify Email</h2>
            <p className="auth-desc">
              We&apos;ve sent a 6-digit OTP to <strong>{email}</strong>
            </p>

            <div className="form-group">
              <label htmlFor="otp-input">Enter OTP</label>
              <input
                id="otp-input"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(value);
                  setError("");
                }}
                maxLength="6"
                autoComplete="off"
                style={{ fontSize: "20px", letterSpacing: "10px", textAlign: "center" }}
              />
            </div>

            {error && <p className="error-message" style={{ color: "red", marginBottom: "10px" }}>{error}</p>}
            {resendMessage && <p className="success-message" style={{ color: "green", marginBottom: "10px" }}>{resendMessage}</p>}

            <button
              onClick={handleVerify}
              className="button-primary"
              disabled={isLoading || otp.length !== 6}
              style={{ marginBottom: "10px" }}
            >
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>

            <p style={{ textAlign: "center", marginTop: "15px" }}>
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                style={{
                  background: "none",
                  border: "none",
                  color: "#007bff",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "14px"
                }}
              >
                {resendLoading ? "Sending..." : "Resend OTP"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default OtpVerification;
