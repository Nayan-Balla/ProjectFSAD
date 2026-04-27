import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../api/api";
import SimpleCaptcha from "../components/SimpleCaptcha";
import "../assets/styles/auth.css";

const POST_VERIFY_MESSAGE_KEY = "sms_post_verify_message";
const PENDING_VERIFICATION_EMAIL_KEY = "sms_pending_verification_email";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const captchaCodeRef = useRef("");

  useEffect(() => {
    const message = localStorage.getItem(POST_VERIFY_MESSAGE_KEY);
    if (message) {
      setInfoMessage(message);
      localStorage.removeItem(POST_VERIFY_MESSAGE_KEY);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCaptchaError("");
    setLoginError("");
    setInfoMessage("");
    const code = captchaCodeRef.current || captchaCode;
    const valid = (captchaInput || "").trim().toLowerCase() === (code || "").toLowerCase();
    if (!valid) {
      setCaptchaError("Invalid code. Please enter the code shown above.");
      return;
    }

    const form = e.target;
    const email = (form.querySelector("#login-email")?.value ?? "").trim().toLowerCase();
    const password = form.querySelector("#login-password")?.value ?? "";
    setIsLoading(true);

    try {
      const response = await loginUser({ email, password });

      if (!response.success) {
        const message = response.error || "Login failed. Please check your credentials.";
        if (message.toLowerCase().includes("verify your email")) {
          localStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email);
          setLoginError("Your account is not verified yet. Enter the OTP to continue.");
          navigate("/otp-verification");
          return;
        }
        setLoginError(message);
        return;
      }

      const data = response.data;
      if (!data || !data.token) {
        setLoginError("Login failed. Missing authentication token.");
        return;
      }

      login({
        id: data.id,
        role: data.role,
        email: data.email || email,
        name: data.name || email.split("@")[0],
        department: data.department || "",
        experience: data.experience || 0,
        token: data.token,
      });

      if (data.role === "Student") {
        navigate("/add-submission");
      } else {
        navigate("/marking");
      }
    } catch (err) {
      setLoginError(err.message || "Login request failed. Please try again.");
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
          <h2>Login</h2>
          <p className="auth-desc">Sign in with your email and password.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <div className="form-group-header">
                <label htmlFor="login-password">Password</label>
                <Link to="/" className="auth-forgot">Forgot password?</Link>
              </div>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>
            {infoMessage && <p className="success-message">{infoMessage}</p>}
            {loginError && <p className="captcha-error">{loginError}</p>}
            <div className="form-group form-group--captcha">
              <SimpleCaptcha
                onCodeChange={handleCaptchaCodeChange}
                value={captchaInput}
                onChange={setCaptchaInput}
                inputId="login-captcha"
              />
              {captchaError && <p className="captcha-error">{captchaError}</p>}
            </div>
            <button type="submit" className="button-primary" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="auth-switch">
            Don&apos;t have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

export default Login;
