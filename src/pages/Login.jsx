import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { requestNotificationPermission } from '../firebase';
import { User, Lock, Chrome, Shield, CreditCard } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [error, setError] = useState('');
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [loadingGoogle, setLoadingGoogle] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    
    const { user, login, loginWithGoogle, completeProfile, logout } = useAppContext();
    const navigate = useNavigate();

    const requiresProfileCompletion = user && user.role === 'user' && (!user.nationalId || !user.username);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoadingEmail(true);
        try {
            await login(email, password);
            await requestNotificationPermission();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingEmail(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoadingGoogle(true);
        try {
            await loginWithGoogle();
            await requestNotificationPermission();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingGoogle(false);
        }
    };

    const handleCompleteProfile = async (e) => {
        e.preventDefault();
        setError('');
        setLoadingProfile(true);
        try {
            await completeProfile(fullName, nationalId);
            navigate('/user', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingProfile(false);
        }
    };

    return (
        <div className="flex-center" style={{ minHeight: '100vh', padding: 'var(--space-6)' }}>
            <div className="animate-fade-in" style={{ width: '100%', maxWidth: '420px' }}>

                {/* Brand header above card */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <div className="flex-center" style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{
                            width: 72,
                            height: 72,
                            borderRadius: 'var(--radius-xl)',
                            background: 'rgba(0, 100, 0, 0.12)',
                            border: '1px solid rgba(0, 100, 0, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 20px var(--primary-glow)'
                        }}>
                            <img
                                src={logo}
                                alt="DeedGuard"
                                style={{ width: 44, height: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                            />
                        </div>
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '2rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, var(--color-success), var(--zim-gold))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginBottom: 'var(--space-1)'
                    }}>
                        DeedGuard
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
                        {requiresProfileCompletion ? 'Complete Your Citizen Profile' : 'Zimbabwe Land Authentication System'}
                    </p>
                </div>

                {/* Login Card */}
                <div className="glass-card" style={{ padding: 'var(--space-8)' }}>
                    {!requiresProfileCompletion ? (
                        <>
                            <form onSubmit={handleLogin}>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="email">Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <User
                                            size={16}
                                            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}
                                        />
                                        <input
                                            id="email"
                                            type="email"
                                            className="form-input"
                                            style={{ paddingLeft: '2.5rem' }}
                                            placeholder="your.email@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
                                    <label className="input-label" htmlFor="password">Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock
                                            size={16}
                                            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}
                                        />
                                        <input
                                            id="password"
                                            type="password"
                                            className="form-input"
                                            style={{ paddingLeft: '2.5rem' }}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div style={{
                                        marginBottom: 'var(--space-4)',
                                        padding: 'var(--space-3) var(--space-4)',
                                        background: 'var(--color-danger-bg)',
                                        border: '1px solid var(--color-danger-border)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.875rem',
                                        color: 'var(--color-danger)'
                                    }}>
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', height: '48px', fontSize: '1rem' }}
                                    disabled={loadingEmail || loadingGoogle}
                                >
                                    {loadingEmail ? <span className="loader" /> : 'Sign In Securely'}
                                </button>
                            </form>

                            {/* Divider */}
                            <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--space-5) 0' }}>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                                <span style={{ padding: '0 var(--space-4)', fontSize: '0.8125rem', color: 'var(--text-faint)' }}>or</span>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="btn btn-secondary"
                                style={{ width: '100%', height: '48px', fontSize: '0.9375rem' }}
                                disabled={loadingEmail || loadingGoogle}
                            >
                                {loadingGoogle ? <span className="loader" /> : (
                                    <>
                                        <Chrome size={18} />
                                        Continue with Google
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleCompleteProfile}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-5)', textAlign: 'center' }}>
                                Welcome! Please provide your full name and National ID to access the citizen portal.
                            </p>
                            <div className="input-group">
                                <label className="input-label" htmlFor="fullName">Full Legal Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                                    <input
                                        id="fullName" type="text" className="form-input" style={{ paddingLeft: '2.5rem' }}
                                        placeholder="e.g. John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                                    />
                                </div>
                            </div>
                            <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
                                <label className="input-label" htmlFor="nationalId">National ID Number</label>
                                <div style={{ position: 'relative' }}>
                                    <CreditCard size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                                    <input
                                        id="nationalId" type="text" className="form-input" style={{ paddingLeft: '2.5rem' }}
                                        placeholder="e.g. 12-345678X90" value={nationalId} onChange={(e) => setNationalId(e.target.value)} required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-danger)' }}>
                                    {error}
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px', fontSize: '1rem', marginBottom: '1rem' }} disabled={loadingProfile}>
                                {loadingProfile ? <span className="loader" /> : 'Complete Registration'}
                            </button>

                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                style={{ width: '100%', height: '48px', fontSize: '0.9rem', background: 'transparent', color: '#94a3b8', border: '1px solid #334155' }} 
                                onClick={async () => {
                                    await logout();
                                    window.location.reload();
                                }}
                            >
                                Not you? Sign in as another user
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer note */}
                <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }} className="flex-center flex-gap-2">
                    <Shield size={13} style={{ color: 'var(--text-faint)' }} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-faint)' }}>
                        Secured by Blockchain &amp; AI Technology
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Login;
