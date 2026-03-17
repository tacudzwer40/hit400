import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { requestNotificationPermission } from '../firebase';
import { User, Lock, Chrome } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, loginWithGoogle } = useAppContext();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            await requestNotificationPermission();
            // Navigation will be handled by auth state change
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            await requestNotificationPermission();
            // Navigation will be handled by auth state change
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="flex-center" style={{ minHeight: '100vh', padding: '2rem' }}>
            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="flex-center" style={{ marginBottom: '1rem' }}>
                        <img src={logo} alt="DeedGuard Logo" style={{
                            width: '80px',
                            height: 'auto',
                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                        }} />
                    </div>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, var(--zimbabwe-green), var(--zimbabwe-yellow))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginBottom: '0.5rem',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        DeedGuard
                    </h1>
                    <p style={{
                        color: 'var(--zimbabwe-white)',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}>
                        Zimbabwe Land Authentication
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label className="input-label" htmlFor="email">Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                id="email"
                                type="email"
                                className="form-input"
                                style={{ paddingLeft: '2.75rem' }}
                                placeholder="your.email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="password">Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                id="password"
                                type="password"
                                className="form-input"
                                style={{ paddingLeft: '2.75rem' }}
                                placeholder="••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && <p style={{ color: 'red', fontSize: '0.875rem' }}>{error}</p>}

                    <button type="submit" className="btn btn-primary" style={{
                        width: '100%',
                        marginTop: '1rem',
                        background: 'var(--zimbabwe-green)',
                        color: 'var(--zimbabwe-white)',
                        border: '2px solid var(--zimbabwe-yellow)',
                        fontWeight: 600,
                        fontSize: '1rem',
                        padding: '1rem',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s ease'
                    }}>
                        Sign In Securely
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', opacity: 0.6 }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                        <span style={{ padding: '0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>or</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="btn"
                        style={{
                            width: '100%',
                            background: 'var(--zimbabwe-yellow)',
                            color: 'var(--zimbabwe-black)',
                            border: '2px solid var(--zimbabwe-green)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontWeight: 600,
                            fontSize: '1rem',
                            padding: '1rem',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <Chrome size={20} />
                        Continue with Google
                    </button>

                    <p style={{
                        textAlign: 'center',
                        marginTop: '1.5rem',
                        fontSize: '0.875rem',
                        color: 'var(--zimbabwe-yellow)',
                        fontWeight: 600,
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}>
                        Secured by Blockchain Technology
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
