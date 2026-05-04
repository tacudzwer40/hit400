import React, { useState, useEffect, useRef } from 'react';
import { 
    X, CheckCircle, Cpu, ShieldCheck, Database, 
    Zap, Globe, Search, Lock, AlertCircle, ChevronDown, ChevronUp,
    MessageSquare, Send, Download
} from 'lucide-react';

/**
 * ProcessVisualizer Component
 * A premium, 3D-animated UI for visualizing background processes.
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {Function} onClose - Callback to close the modal
 * @param {string} title - Title of the process
 * @param {Array} steps - Array of { id, label, status, subSteps: [{ label, status }] }
 * @param {string} currentStatus - Detailed textual status
 * @param {string} logs - Raw terminal logs if any
 */
const ProcessVisualizer = ({ 
    isOpen, 
    onClose, 
    title = "System Processing", 
    steps = [], 
    currentStatus = "", 
    logs = "" 
}) => {
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [hexStream, setHexStream] = useState("");
    const [metrics, setMetrics] = useState({
        latency: "24ms",
        load: "12%",
        block: "8,492,021",
        node: "ZIM-HRE-01"
    });
    
    const [expandedSteps, setExpandedSteps] = useState({});
    const [apiAnimState, setApiAnimState] = useState('idle'); // 'idle', 'sending', 'receiving'
    const logEndRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        
        let frame;
        const animate = () => {
            setRotation(prev => ({
                x: prev.x + 0.5,
                y: prev.y + 0.8
            }));
            
            if (Math.random() > 0.7) {
                const chars = "0123456789ABCDEF";
                let str = "";
                for(let i=0; i<16; i++) str += chars[Math.floor(Math.random()*16)];
                setHexStream(str);
            }

            if (Math.random() > 0.95) {
                setMetrics({
                    latency: `${Math.floor(Math.random() * 40 + 10)}ms`,
                    load: `${Math.floor(Math.random() * 20 + 5)}%`,
                    block: "8,492," + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
                    node: "ZIM-HRE-01"
                });
            }

            frame = requestAnimationFrame(animate);
        };
        
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [isOpen]);

    // Auto-expand active step and auto-scroll logs
    useEffect(() => {
        const activeStep = steps.find(s => s.status === 'active');
        if (activeStep) {
            setExpandedSteps(prev => ({
                ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
                [activeStep.id]: true
            }));
        }
        
        // Detect API call state based on status message
        if (currentStatus.toLowerCase().includes('sending') || currentStatus.toLowerCase().includes('transmitting')) {
            setApiAnimState('sending');
        } else if (currentStatus.toLowerCase().includes('processing') || currentStatus.toLowerCase().includes('receiving')) {
            setApiAnimState('receiving');
        } else {
            setApiAnimState('idle');
        }

        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [steps, currentStatus]);

    const toggleStep = (id) => {
        setExpandedSteps(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="process-visualizer-overlay" style={styles.overlay}>
            <div className="process-visualizer-container animate-scale-up" style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <div style={styles.pulseDot} />
                        <div>
                            <h3 style={styles.title}>{title}</h3>
                            <div style={styles.subtitle}>SECURE DATA PIPELINE v4.2 // CLUSTER ID: {metrics.node}</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={styles.closeBtn} className="hover-scale">
                        <X size={20} />
                    </button>
                </div>

                <div style={styles.content}>
                    {/* Left Side: 3D Visualization */}
                    <div style={styles.visualArea}>
                        <div style={styles.specsPanel}>
                            <div style={styles.specItem}>
                                <span style={styles.specLabel}>LATENCY:</span>
                                <span style={styles.specValue}>{metrics.latency}</span>
                            </div>
                            <div style={styles.specItem}>
                                <span style={styles.specLabel}>CPU LOAD:</span>
                                <span style={styles.specValue}>{metrics.load}</span>
                            </div>
                            <div style={styles.specItem}>
                                <span style={styles.specLabel}>ALGO:</span>
                                <span style={styles.specValue}>ECDSA-SHA256</span>
                            </div>
                            <div style={styles.specItem}>
                                <span style={styles.specLabel}>BLOCK:</span>
                                <span style={styles.specValue}>{metrics.block}</span>
                            </div>
                        </div>

                        {/* API Call Animation Layer */}
                        {apiAnimState !== 'idle' && (
                            <div style={styles.apiCallOverlay}>
                                <div className="api-signal-container" style={styles.apiSignalContainer}>
                                    <div className="api-node left"><Database size={24} color="#3b82f6" /></div>
                                    <div className="api-stream">
                                        <div className={`stream-packet ${apiAnimState}`}>
                                            {apiAnimState === 'sending' ? <Send size={16} /> : <Download size={16} />}
                                        </div>
                                    </div>
                                    <div className="api-node right"><Brain size={24} color="#a855f7" /></div>
                                </div>
                                <div style={styles.apiCallText}>
                                    {apiAnimState === 'sending' ? 'TRANSMITTING PAYLOAD...' : 'RECEIVING AI INSIGHTS...'}
                                </div>
                            </div>
                        )}

                        <div style={{
                            ...styles.scene,
                            opacity: apiAnimState !== 'idle' ? 0.3 : 1,
                            transition: 'opacity 0.5s'
                        }}>
                            <div style={{
                                ...styles.cube,
                                transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
                            }}>
                                <div style={{...styles.face, ...styles.faceFront}}><Database size={40} color="#10b981" /></div>
                                <div style={{...styles.face, ...styles.faceBack}}><ShieldCheck size={40} color="#3b82f6" /></div>
                                <div style={{...styles.face, ...styles.faceRight}}><Zap size={40} color="#fbbf24" /></div>
                                <div style={{...styles.face, ...styles.faceLeft}}><Globe size={40} color="#8b5cf6" /></div>
                                <div style={{...styles.face, ...styles.faceTop}}><Cpu size={40} color="#ec4899" /></div>
                                <div style={{...styles.face, ...styles.faceBottom}}><Lock size={40} color="#f43f5e" /></div>
                            </div>
                            
                            <div className="orbit-1" style={styles.orbit1} />
                            <div className="orbit-2" style={styles.orbit2} />
                            <div className="ring-inner" style={styles.ringInner} />
                            <div className="ring-outer" style={styles.ringOuter} />
                        </div>
                        
                        <div style={styles.hexStream}>
                            0x{hexStream}
                        </div>

                        <div style={styles.statusBadge}>
                            <Search size={14} style={{ marginRight: 6 }} />
                            <span>{currentStatus || "Analyzing data stream..."}</span>
                        </div>
                    </div>

                    {/* Right Side: Step Tracker & Logs */}
                    <div style={styles.detailsArea}>
                        <div style={styles.processGroupLabel}>PIPELINE EXECUTION STEPS</div>
                        <div style={styles.stepsContainer}>
                            {steps.map((step, idx) => {
                                const isExpanded = expandedSteps[step.id];
                                return (
                                    <div key={step.id || idx} style={styles.stepWrapper}>
                                        <div 
                                            style={{
                                                ...styles.stepItem,
                                                cursor: 'pointer',
                                                backgroundColor: step.status === 'active' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                                borderRadius: '12px',
                                                padding: '8px 12px',
                                                margin: '0 -12px'
                                            }} 
                                            onClick={() => toggleStep(step.id)}
                                        >
                                            <div style={{
                                                ...styles.stepIconContainer,
                                                borderColor: step.status === 'completed' ? '#10b981' : 
                                                            step.status === 'active' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                                                background: step.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 
                                                           step.status === 'active' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                boxShadow: step.status === 'active' ? '0 0 15px rgba(59, 130, 246, 0.3)' : 'none'
                                            }}>
                                                {step.status === 'completed' ? <CheckCircle size={16} color="#10b981" /> :
                                                 step.status === 'active' ? <div className="spinner-small" style={styles.activeSpinner} /> :
                                                 step.status === 'error' ? <AlertCircle size={16} color="#ef4444" /> :
                                                 <div style={styles.pendingDot} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    ...styles.stepLabel,
                                                    color: step.status === 'active' ? '#ffffff' : 
                                                        step.status === 'completed' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                                                    fontWeight: step.status === 'active' ? 700 : 400
                                                }}>
                                                    {step.label}
                                                </div>
                                                {step.status === 'active' && !isExpanded && (
                                                    <div style={styles.stepProgressContainer}>
                                                        <div className="progress-shimmer" style={styles.stepProgressBar} />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.2)' }}>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </div>

                                        {/* Collapsible Sub-steps */}
                                        {isExpanded && step.subSteps && (
                                            <div className="sub-steps-container animate-slide-down" style={styles.subStepsContainer}>
                                                {step.subSteps.map((sub, sIdx) => (
                                                    <div key={sIdx} style={styles.subStepItem}>
                                                        <div style={{
                                                            ...styles.subStepDot,
                                                            backgroundColor: sub.status === 'completed' ? '#10b981' : 
                                                                           sub.status === 'active' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                                                            boxShadow: sub.status === 'active' ? '0 0 8px #3b82f6' : 'none'
                                                        }} />
                                                        <span style={{
                                                            fontSize: '0.8rem',
                                                            color: sub.status === 'active' ? '#3b82f6' : 
                                                                   sub.status === 'completed' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                                                            fontWeight: sub.status === 'active' ? 600 : 400
                                                        }}>
                                                            {sub.label}
                                                        </span>
                                                        {sub.status === 'active' && <div className="spinner-micro" />}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={styles.logContainer}>
                            <div style={styles.logHeader}>
                                <div style={styles.logDot( '#ef4444' )} />
                                <div style={styles.logDot( '#eab308' )} />
                                <div style={styles.logDot( '#22c55e' )} />
                                <span style={styles.logTitle}>NETWORK_VALIDATOR_01 // STDOUT_SYSLOG</span>
                            </div>
                            <pre style={styles.logPre}>
                                {logs || `[SYSTEM] Waiting for initialization...\n[SYSTEM] Establishing handshake with Node 01...\n[SYSTEM] Awaiting multimodal data packets...`}
                                <div ref={logEndRef} />
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Footer / Progress Bar */}
                <div style={styles.footer}>
                    <div style={styles.progressBarWrapper}>
                        <div style={styles.progressBarBg}>
                            <div style={{
                                ...styles.progressBarFill,
                                width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%`
                            }} />
                        </div>
                        <span style={styles.progressPercentage}>
                            {Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100)}%
                        </span>
                    </div>
                    <div style={styles.footerInfo}>
                        {steps.every(s => s.status === 'completed' || s.status === 'error') ? (
                            <button 
                                onClick={onClose} 
                                style={styles.finishBtn}
                                className="hover-pulse"
                            >
                                <CheckCircle size={18} style={{ marginRight: 8 }} />
                                CLOSE PIPELINE INTERFACE
                            </button>
                        ) : (
                            <>
                                <span>ZIMBABWE LAND REGISTER SYSTEM</span>
                                <div style={styles.divider} />
                                <span>QUANTUM RESISTANT ENCRYPTION</span>
                                <div style={styles.divider} />
                                <span>BLOCK {metrics.block}</span>
                            </>
                        )}
                    </div>

                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0% { opacity: 0.4; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.4; transform: scale(0.9); } }
                @keyframes orbit { from { transform: rotate(0deg) translateX(100px) rotate(0deg); } to { transform: rotate(360deg) translateX(100px) rotate(-360deg); } }
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                @keyframes rotate-ring { from { transform: rotateX(70deg) rotateZ(0deg); } to { transform: rotateX(70deg) rotateZ(360deg); } }
                @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.05); opacity: 0.8; } 100% { transform: scale(1); opacity: 0.5; } }
                
                @keyframes packet-send {
                    0% { transform: translateX(-80px); opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateX(80px); opacity: 0; }
                }

                @keyframes packet-receive {
                    0% { transform: translateX(80px) scaleX(-1); opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateX(-80px) scaleX(-1); opacity: 0; }
                }

                .spinner-small {
                    width: 12px;
                    height: 12px;
                    border: 2px solid rgba(59, 130, 246, 0.3);
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                .spinner-micro {
                    width: 8px;
                    height: 8px;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin-left: 8px;
                }

                .stream-packet.sending {
                    animation: packet-send 1s infinite linear;
                    color: #3b82f6;
                }

                .stream-packet.receiving {
                    animation: packet-receive 1s infinite linear;
                    color: #a855f7;
                }

                .orbit-1 {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #10b981, 0 0 20px rgba(16, 185, 129, 0.5);
                    animation: orbit 4s linear infinite;
                }

                .orbit-2 {
                    position: absolute;
                    width: 6px;
                    height: 6px;
                    background: #3b82f6;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #3b82f6, 0 0 20px rgba(59, 130, 246, 0.5);
                    animation: orbit 3s linear reverse infinite;
                }

                .ring-inner {
                    position: absolute;
                    width: 180px;
                    height: 180px;
                    border: 1px dashed rgba(16, 185, 129, 0.2);
                    border-radius: 50%;
                    animation: rotate-ring 10s linear infinite;
                }

                .ring-outer {
                    position: absolute;
                    width: 240px;
                    height: 240px;
                    border: 1px solid rgba(59, 130, 246, 0.1);
                    border-radius: 50%;
                    animation: rotate-ring 15s linear reverse infinite;
                }

                .progress-shimmer {
                    position: relative;
                    overflow: hidden;
                }
                .progress-shimmer::after {
                    content: "";
                    position: absolute;
                    top: 0; left: 0; width: 50%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4), transparent);
                    animation: shimmer 1.5s infinite;
                }

                .hover-scale:hover {
                    transform: scale(1.1);
                }

                .hover-pulse:hover {
                    animation: pulse-ring 2s infinite ease-in-out;
                    background-color: rgba(16, 185, 129, 0.2) !important;
                    box-shadow: 0 0 30px rgba(16, 185, 129, 0.4) !important;
                }

                .animate-scale-up {
                    animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .animate-slide-down {
                    animation: slideDown 0.3s ease-out;
                }

                @keyframes scaleUp {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                @keyframes slideDown {
                    from { height: 0; opacity: 0; transform: translateY(-10px); }
                    to { height: auto; opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
    },
    container: {
        width: '100%',
        maxWidth: '960px',
        background: 'linear-gradient(150deg, rgba(8, 14, 28, 0.98) 0%, rgba(15, 23, 42, 1) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        borderRadius: '32px',
        overflow: 'hidden',
        boxShadow: '0 0 120px rgba(0, 0, 0, 0.8), 0 0 40px rgba(16, 185, 129, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
    },
    header: {
        padding: '28px 36px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    pulseDot: {
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: '#10b981',
        boxShadow: '0 0 15px #10b981',
        animation: 'pulse 2s infinite'
    },
    title: {
        margin: 0,
        fontSize: '1.4rem',
        fontWeight: 800,
        color: '#ffffff',
        letterSpacing: '-0.02em'
    },
    subtitle: {
        fontSize: '0.65rem',
        color: 'rgba(16, 185, 129, 0.8)',
        fontWeight: 700,
        letterSpacing: '2px',
        marginTop: '2px'
    },
    closeBtn: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '50%',
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255, 255, 255, 0.9)',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    content: {
        display: 'grid',
        gridTemplateColumns: '1.4fr 1.6fr',
        gap: '40px',
        padding: '40px',
        minHeight: '520px'
    },
    visualArea: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.05)',
        padding: '30px'
    },
    specsPanel: {
        position: 'absolute',
        top: '20px',
        left: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    specItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    specLabel: {
        fontSize: '0.55rem',
        color: 'rgba(255,255,255,0.6)',
        fontWeight: 700,
        letterSpacing: '1px'
    },
    specValue: {
        fontSize: '0.75rem',
        color: '#3b82f6',
        fontFamily: '"Fira Code", monospace',
        fontWeight: 600
    },
    apiCallOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none'
    },
    apiSignalContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '20px'
    },
    apiCallText: {
        fontSize: '0.75rem',
        color: '#ffffff',
        fontWeight: 800,
        letterSpacing: '3px',
        textShadow: '0 0 10px rgba(59, 130, 246, 0.8)'
    },
    scene: {
        width: '240px',
        height: '240px',
        perspective: '1000px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    cube: {
        width: '100px',
        height: '100px',
        position: 'relative',
        transformStyle: 'preserve-3d',
    },
    face: {
        position: 'absolute',
        width: '100px',
        height: '100px',
        border: '1.5px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(8px)',
        boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.2)'
    },
    faceFront:  { transform: 'rotateY(0deg) translateZ(50px)' },
    faceBack:   { transform: 'rotateY(180deg) translateZ(50px)' },
    faceRight:  { transform: 'rotateY(90deg) translateZ(50px)' },
    faceLeft:   { transform: 'rotateY(-90deg) translateZ(50px)' },
    faceTop:    { transform: 'rotateX(90deg) translateZ(50px)' },
    faceBottom: { transform: 'rotateX(-90deg) translateZ(50px)' },
    
    hexStream: {
        marginTop: '30px',
        fontFamily: '"Fira Code", monospace',
        fontSize: '0.7rem',
        color: 'rgba(59, 130, 246, 0.6)',
        letterSpacing: '3px'
    },
    statusBadge: {
        marginTop: '16px',
        padding: '10px 20px',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '24px',
        color: '#10b981',
        fontSize: '0.85rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        transition: 'all 0.3s'
    },
    detailsArea: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxHeight: '520px',
        overflowY: 'auto',
        paddingRight: '10px'
    },
    processGroupLabel: {
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.6)',
        fontWeight: 800,
        letterSpacing: '1.5px',
        marginBottom: '-8px'
    },
    stepsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    stepWrapper: {
        display: 'flex',
        flexDirection: 'column'
    },
    stepItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        transition: 'all 0.3s'
    },
    stepIconContainer: {
        width: 32,
        height: 32,
        borderRadius: '8px',
        border: '1.5px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s',
        flexShrink: 0
    },
    pendingDot: {
        width: 5,
        height: 5,
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.15)'
    },
    stepLabel: {
        fontSize: '0.95rem',
        transition: 'all 0.3s'
    },
    subStepsContainer: {
        marginLeft: '44px',
        marginTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        borderLeft: '1px dashed rgba(255,255,255,0.1)',
        paddingLeft: '16px',
        overflow: 'hidden'
    },
    subStepItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    subStepDot: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        transition: 'all 0.3s'
    },
    stepProgressContainer: {
        width: '60px',
        height: '2px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '1px',
        overflow: 'hidden',
        marginTop: '4px'
    },
    stepProgressBar: {
        width: '100%',
        height: '100%',
        backgroundColor: '#3b82f6',
        boxShadow: '0 0 8px #3b82f6'
    },
    activeSpinner: {
        width: '14px',
        height: '14px'
    },
    logContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: '"Fira Code", monospace',
        minHeight: '120px',
        maxHeight: '180px',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
    },
    logHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        paddingBottom: '8px'
    },
    logDot: (color) => ({
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: color
    }),
    logTitle: {
        marginLeft: '6px',
        fontSize: '0.6rem',
        color: 'rgba(255, 255, 255, 0.3)',
        letterSpacing: '1px',
        fontWeight: 600
    },
    logPre: {
        margin: 0,
        fontSize: '0.7rem',
        color: '#10b981',
        whiteSpace: 'pre-wrap',
        overflowY: 'auto',
        lineHeight: 1.5,
        opacity: 0.8
    },
    footer: {
        padding: '30px 40px 40px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(0,0,0,0.4)'
    },
    progressBarWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '20px'
    },
    progressBarBg: {
        flex: 1,
        height: '6px',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '3px',
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#10b981',
        boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)',
        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'linear-gradient(90deg, #10b981, #34d399)'
    },
    progressPercentage: {
        fontSize: '1rem',
        fontWeight: 800,
        color: '#10b981',
        fontFamily: '"Fira Code", monospace',
        minWidth: '50px',
        textAlign: 'right'
    },
    footerInfo: {
        fontSize: '0.7rem',
        color: 'rgba(255, 255, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontWeight: 700,
        letterSpacing: '2px'
    },
    divider: {
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.1)'
    },
    finishBtn: {
        padding: '12px 32px',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        border: '1.5px solid #10b981',
        borderRadius: '30px',
        color: '#10b981',
        fontSize: '0.85rem',
        fontWeight: 800,
        letterSpacing: '1px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
    }
};

// Add Missing Icons
const Brain = ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54Z"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54Z"/>
    </svg>
);

export default ProcessVisualizer;
