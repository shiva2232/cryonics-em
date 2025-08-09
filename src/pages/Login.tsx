import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../contexts/firebase";
import "../assets/css/login.css";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
    const navigate = useNavigate()
    const handleGoogleAuth = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            if (result.user) {
                navigate("/select-device")
            }
        } catch (error) {
            console.error("Google authentication failed:", error);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="auth-title">Welcome to Device Control</h1>
                <p className="auth-subtitle">
                    Sign in or Sign up with your Google account to continue.
                </p>
                <button className="google-auth-btn" onClick={handleGoogleAuth}>
                    <img
                        src="https://developers.google.com/identity/images/g-logo.png"
                        alt="Google logo"
                    />
                    Continue with Google
                </button>
            </div>
        </div>
    );
};

export default Login;
