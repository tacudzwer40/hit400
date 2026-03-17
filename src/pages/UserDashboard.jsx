import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, LogOut, Menu, Home, Clock, Map as MapIcon, User as UserIcon, Upload, FileText, AlertTriangle, Shield, TrendingUp, Target, BarChart3 } from 'lucide-react';
import logo from '../assets/logo.png';
import { useAppContext } from '../context/AppContext';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Tesseract from 'tesseract.js';
import { verifySignature, detectWatermark, runForgeryAnalysis, extractSignaturesAndStamps } from '../utils/aiVerification';
import FraudDetectionModel from '../utils/fraudDetection';
import DeedsLeafletMap from '../components/DeedsLeafletMap';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const UserDashboard = () => {
    const { user, deeds, logout, forgetUser, userHistory, addToHistory, isOffline, predictFraudScore } = useAppContext();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Fraud detection
    const [fraudModel] = useState(new FraudDetectionModel());
    const [riskScores, setRiskScores] = useState({});
    const [suspiciousPatterns, setSuspiciousPatterns] = useState([]);
    const [fraudStats, setFraudStats] = useState({
        highRiskCount: 0,
        averageRisk: 0,
        patternDetections: 0,
        verifiedCount: 0,
        riskDistribution: [0, 0, 0, 0, 0], // 0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0
        suspiciousPatterns: []
    });

    // Scan State
    const [file, setFile] = useState([]);
    const [preview, setPreview] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);
    const [currentScanIdx, setCurrentScanIdx] = useState(0);
    const [result, setResult] = useState(null);
    const [processStatus, setProcessStatus] = useState("");
    const [extractedLogs, setExtractedLogs] = useState("");

    // Analyze deeds for fraud patterns when deeds change
    useEffect(() => {
        const analyzeDeeds = async () => {
            if (deeds.length > 0) {
                // Calculate risk scores for each deed
                const scores = {};
                for (const deed of deeds) {
                    const riskScore = await fraudModel.predictFraudRisk(deed);
                    scores[deed.id] = riskScore;
                }
                setRiskScores(scores);

                // Detect suspicious patterns
                const rawPatterns = fraudModel.detectSuspiciousPatterns(deeds);
                setSuspiciousPatterns(rawPatterns);

                // Transform patterns for UI display
                const uiPatterns = rawPatterns.map(pattern => ({
                    type: pattern.type.replace(/_/g, ' ').toUpperCase(),
                    risk: pattern.risk,
                    description: pattern.description,
                    affectedDeeds: pattern.affectedDeeds
                }));

                // Calculate fraud statistics
                const riskValues = Object.values(scores);
                const highRiskCount = riskValues.filter(score => score > 0.7).length;
                const averageRisk = riskValues.length > 0 ? riskValues.reduce((a, b) => a + b, 0) / riskValues.length : 0;
                const verifiedCount = riskValues.filter(score => score < 0.3).length;

                // Risk distribution (buckets: 0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0)
                const distribution = [0, 0, 0, 0, 0];
                riskValues.forEach(score => {
                    const bucket = Math.min(Math.floor(score * 5), 4);
                    distribution[bucket]++;
                });

                setFraudStats({
                    highRiskCount,
                    averageRisk,
                    patternDetections: uiPatterns.length,
                    verifiedCount,
                    riskDistribution: distribution,
                    suspiciousPatterns: uiPatterns
                });
            }
        };

        analyzeDeeds();
    }, [deeds, fraudModel]);

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        if (selected.length > 0) {
            setFile(selected);
            const urls = selected.map(f => URL.createObjectURL(f));
            setPreview(urls);
            setResult(null); // reset result
        }
    };

    const processVerification = async () => {
        if (!file || file.length === 0) {
            alert("Please upload the deed document pages (6 pages expected).");
            return;
        }

        if (file.length !== 6) {
            if (!window.confirm(`A typical Zimbabwe Land Deed has 6 pages. You have uploaded ${file.length} page(s). Continue anyway?`)) {
                return;
            }
        }

        setIsProcessing(true);
        setShowScanModal(true);
        setResult(null);
        setProcessStatus("Initializing AI Verification Engine...");
        setExtractedLogs("");

        if (isOffline) {
            try {
                let fullText = "";
                for (let i = 0; i < file.length; i++) {
                    setCurrentScanIdx(i);
                    setProcessStatus(`Offline OCR processing page ${i + 1} of ${file.length}...`);
                    const { data: { text } } = await Tesseract.recognize(file[i], 'eng');
                    fullText += text + " ";
                    setExtractedLogs(prev => prev + `\n[Page ${i + 1} Extracted Text]:\n${text}\n`);
                }

                setProcessStatus("Cross-referencing OCR data with offline ledger...");

                // Normalization helper for offline matching
                const normalizeStr = (str) => (str || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                const normalizedText = normalizeStr(fullText);

                let matchedDeed = null;
                for (let d of deeds) {
                    if (normalizeStr(d.deedNumber) && normalizedText.includes(normalizeStr(d.deedNumber))) {
                        matchedDeed = d;
                        break;
                    }
                }

                // Run local edge AI analysis if available (signature, watermark, forgery, fraud scoring)
                const signatureResult = await verifySignature(file[0]);
                const watermarkResult = await detectWatermark(file[0]);
                const forgeryResult = await runForgeryAnalysis(file[0]);
                const signatureStampResult = await extractSignaturesAndStamps(file);

                const fraudRisk = matchedDeed ? await predictFraudScore(matchedDeed) : 0.5;

                const commonAnalysis = {
                    signatureConfidence: signatureResult?.confidence ?? 0.5,
                    watermarkConfidence: watermarkResult?.confidence ?? 0.5,
                    forgeryRisk: forgeryResult?.riskScore ?? 0.5,
                    fraudRisk,
                    signatureAnalysis: signatureResult?.reason,
                    watermarkAnalysis: watermarkResult?.reason,
                    forgeryAnalysis: forgeryResult?.reason,
                    signaturesFound: signatureStampResult.signatures.length,
                    stampsFound: signatureStampResult.stamps.length,
                    signatureStampAnalysis: signatureStampResult.analysis
                };

                // Privacy-preserving comparison using hashes (ZK-friendly)
                const extractedOwnerHash = hashPersonalData(matchedDeed?.owner ?? '');
                const extractedLocationHash = hashPersonalData(matchedDeed?.location ?? '');

                let verificationResult = {};
                if (!matchedDeed) {
                    verificationResult = {
                        status: 'NOT_FOUND',
                        message: 'Offline OCR: Could not find any registered Deed Number in this document compared to local ledger.',
                        extracted: { deedNumber: "Unknown" },
                        ...commonAnalysis
                    };
                } else {
                    const ownerOk = matchedDeed.ownerHash ? (matchedDeed.ownerHash === extractedOwnerHash) : true;
                    const locationOk = matchedDeed.locationHash ? (matchedDeed.locationHash === extractedLocationHash) : true;

                    if (ownerOk && locationOk) {
                        verificationResult = {
                            status: 'AUTHENTIC',
                            message: 'Offline Hash Match! Document owner/location hashes align with the offline ledger. (Plain text not exposed).',
                            extracted: {
                                deedNumber: matchedDeed.deedNumber,
                                ownerHash: matchedDeed.ownerHash,
                                locationHash: matchedDeed.locationHash
                            },
                            ledgerData: matchedDeed,
                            ...commonAnalysis
                        };
                    } else {
                        verificationResult = {
                            status: 'FRAUDULENT',
                            message: 'Offline Forgery Detected! Hashes for owner/location do not match ledger values.',
                            extracted: {
                                deedNumber: matchedDeed.deedNumber,
                                ownerHash: matchedDeed.ownerHash,
                                locationHash: matchedDeed.locationHash
                            },
                            ledgerData: matchedDeed,
                            ...commonAnalysis
                        };
                    }
                }

                setProcessStatus(verificationResult.status === 'AUTHENTIC' ? "Authentic Match Confirmed!" : "Anomaly Detected.");
                await new Promise(r => setTimeout(r, 600));

                setResult(verificationResult);
                addToHistory({
                    date: new Date().toISOString(),
                    ...verificationResult
                });
            } catch (err) {
                console.error(err);
                alert(`Offline Verification failed: ${err.message}`);
            } finally {
                setIsProcessing(false);
                setShowScanModal(false);
            }
            return;
        }

        const defaultKey = "AIzaSyB3_lZ7Im5CSlNLczOlURi9kYF5QZ1KVr4";
        let apiKey = localStorage.getItem('gemini_api_key') || defaultKey;
        if (!apiKey || apiKey.trim() === '') {
            apiKey = prompt("Please enter a Gemini API Key to use the Real AI Verification:");
        }

        if (!apiKey) {
            alert("API Key is required for real AI extraction.");
            setIsProcessing(false);
            setShowScanModal(false);
            return;
        }
        localStorage.setItem('gemini_api_key', apiKey);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const convertToBase64 = (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                        } else {
                            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                        resolve(dataUrl.split(',')[1]);
                    };
                    img.onerror = (err) => reject(err);
                    img.src = e.target.result;
                };
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });

            const imageParts = [];
            for (let i = 0; i < file.length; i++) {
                setCurrentScanIdx(i);
                setProcessStatus(`Converting page ${i + 1} to optimized format...`);
                await new Promise(r => setTimeout(r, 800));
                const base64Data = await convertToBase64(file[i]);
                imageParts.push({
                    inlineData: { data: base64Data, mimeType: 'image/jpeg' }
                });
            }

            setProcessStatus("Securely transmitting to Gemini AI for cryptographic validation...");

            const simplifiedLedger = deeds.map(d => ({ deedNumber: d.deedNumber, owner: d.owner, location: d.location }));
            const promptText = `
                You are a highly capable AI assistant that verifies Zimbabwe Land Deeds for authenticity.
                I am attaching the pages of a submitted Land Deed.

                Here is the true ledger data from the official blockchain registry for you to cross-reference:
                ${JSON.stringify(simplifiedLedger)}

                Please extract the following core data points carefully:
                1. "deedNumber" - The exact Deed Number found.
                2. "owner" - The registered Owner.
                3. "location" - The Address/Location.
                4. "signatures" - Extract and describe all signatures found on the document, including their location, quality, and any notable characteristics.
                5. "stamps" - Extract and describe all official stamps, seals, or embossed markings found on the document.
                6. "signatureAnalysis" - Perform a comprehensive analysis of the document's authenticity including:
                   - Detailed assessment of signature quality, consistency, and authenticity
                   - Analysis of stamp/seal legitimacy and official appearance
                   - Cross-reference the extracted owner and location data against the true ledger data provided above
                   - State clearly if they match perfectly or if there are any discrepancies indicating potential forgery
                   - Assess overall document integrity and authenticity confidence based on signatures and stamps

                Reply ONLY with a strictly formatted JSON object using the keys "deedNumber", "owner", "location", "signatures", "stamps", and "signatureAnalysis". No extra markdown.
            `;

            setProcessStatus("Processing document with AI verification...");
            const result = await model.generateContent([promptText, ...imageParts]);
            const response = await result.response;
            const responseText = response.text();

            setExtractedLogs(responseText);

            setProcessStatus("Parsing analytical results...");

            let extracted;
            try {
                const firstBrace = responseText.indexOf('{');
                const lastBrace = responseText.lastIndexOf('}');
                if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON found in response.");
                extracted = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
            } catch (err) {
                throw new Error("AI returned invalid format: " + err.message);
            }

            // Verification Engine
            // 1. Check if deed number exists in ledger
            const normalizeStr = (str) => (str || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');

            const ledgerMatch = deeds.find(d =>
                normalizeStr(d.deedNumber) === normalizeStr(extracted.deedNumber)
            );

            // Run concurrent AI analyses for signature, watermark, and forgery detection
            const signatureResult = await verifySignature(file[0]);
            const watermarkResult = await detectWatermark(file[0]);
            const forgeryResult = await runForgeryAnalysis(file[0]);
            const signatureStampResult = await extractSignaturesAndStamps(file);

            const fraudRisk = ledgerMatch ? await predictFraudScore(ledgerMatch) : 0.5;

            const commonAnalysis = {
                signatureConfidence: signatureResult?.confidence ?? 0.5,
                watermarkConfidence: watermarkResult?.confidence ?? 0.5,
                forgeryRisk: forgeryResult?.riskScore ?? 0.5,
                fraudRisk,
                signatureAnalysis: signatureResult?.reason,
                watermarkAnalysis: watermarkResult?.reason,
                forgeryAnalysis: forgeryResult?.reason,
                signaturesFound: signatureStampResult.signatures.length,
                stampsFound: signatureStampResult.stamps.length,
                signatureStampAnalysis: signatureStampResult.analysis
            };

            let verificationResult = {};

            if (!ledgerMatch) {
                verificationResult = {
                    status: 'NOT_FOUND',
                    message: 'This Deed Number does not exist in the official blockchain ledger.',
                    extracted,
                    ...commonAnalysis
                };
            } else {
                // Check if matching against fake test data
                const isFakeMatch = ledgerMatch.isFakeData;
                const fakeDataWarning = isFakeMatch ?
                    '⚠️ WARNING: This match is against FAKE TEST DATA, not a real deed!' : '';

                // Determine if owner or location differs materially (allow word-based overlap)
                const getWords = (str) => (str || '').toString().toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1);

                const isMatch = (str1, str2) => {
                    const norm1 = normalizeStr(str1);
                    const norm2 = normalizeStr(str2);
                    if (norm1 && norm2 && (norm1.includes(norm2) || norm2.includes(norm1))) return true;

                    const w1 = getWords(str1);
                    const w2 = getWords(str2);
                    if (w1.length === 0 || w2.length === 0) return false;

                    const intersection = w1.filter(w => w2.includes(w));
                    const matchRatio = intersection.length / Math.min(w1.length, w2.length);
                    // allow match if at least 50% of the shorter string overlaps
                    return matchRatio >= 0.5;
                };

                const isOwnerMatch = isMatch(ledgerMatch.owner, extracted.owner);
                const isLocMatch = isMatch(ledgerMatch.location, extracted.location);

                if (isOwnerMatch && isLocMatch) {
                    verificationResult = {
                        status: 'AUTHENTIC',
                        message: `Cryptographic match confirmed! Ownership and location data aligns perfectly with the blockchain ledger.${fakeDataWarning}`,
                        extracted,
                        ledgerData: ledgerMatch,
                        isFakeDataMatch: isFakeMatch,
                        ...commonAnalysis
                    };
                } else {
                    verificationResult = {
                        status: 'FRAUDULENT',
                        message: `WARNING: Forgery Detected! The Deed Number exists, but the uploaded document shows a counterfeit Owner or Location compared to the immutable ledger.${fakeDataWarning}`,
                        extracted,
                        ledgerData: ledgerMatch,
                        isFakeDataMatch: isFakeMatch,
                        ...commonAnalysis
                    };
                }
            }

            setProcessStatus("Validating with Blockchain Ledger...");
            await new Promise(r => setTimeout(r, 600));

            setProcessStatus(verificationResult.status === 'AUTHENTIC' ? "Document Match Found!" : "Anomaly Detected in Document.");
            await new Promise(r => setTimeout(r, 500));

            setResult(verificationResult);
            addToHistory({
                date: new Date().toISOString(),
                ...verificationResult
            });

            // Navigate to results tab after processing
            setActiveTab('results');

        } catch (err) {
            console.error(err);
            alert(`Verification failed: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setShowScanModal(false);
        }
    };

    const downloadCertificate = async () => {
        if (!result || result.status !== 'AUTHENTIC') return;

        try {
            const doc = new jsPDF();

            // Add a clean border
            doc.setDrawColor(16, 185, 129); // Green border
            doc.setLineWidth(1);
            doc.rect(10, 10, 190, 277);

            // Header
            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42);
            doc.text("DeedGuard Zimbabwe", 105, 30, { align: "center" });

            doc.setFontSize(16);
            doc.setTextColor(16, 185, 129);
            doc.text("OFFICIAL CERTIFICATE OF AUTHENTICITY", 105, 40, { align: "center" });

            doc.setDrawColor(200, 200, 200);
            doc.line(20, 45, 190, 45);

            // Body text
            doc.setFontSize(12);
            doc.setTextColor(50, 50, 50);
            doc.text("This document certifies that the physical land deed scanned on the listed date", 20, 60);
            doc.text("perfectly matches the immutable records held on the official ledger.", 20, 66);

            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            const dateStr = new Date().toLocaleString();
            doc.text(`Verification Date: ${dateStr}`, 20, 80);
            doc.text(`Verified By: ${user?.username || 'Citizen'}`, 20, 86);

            // Deed Details
            doc.setDrawColor(15, 23, 42);
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(20, 95, 170, 70, 3, 3, "F");

            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.setFont("helvetica", "bold");
            doc.text("Property Details:", 25, 105);

            doc.setFont("helvetica", "normal");
            doc.text(`Deed Number:`, 25, 115);
            doc.setFont("helvetica", "bold");
            doc.text(`${result.extracted.deedNumber}`, 60, 115);

            doc.setFont("helvetica", "normal");
            doc.text(`Owner:`, 25, 125);
            doc.setFont("helvetica", "bold");
            doc.text(`${result.extracted.owner}`, 60, 125);

            doc.setFont("helvetica", "normal");
            doc.text(`Location:`, 25, 135);
            doc.setFont("helvetica", "bold");
            const locText = doc.splitTextToSize(`${result.extracted.location}`, 125);
            doc.text(locText, 60, 135);

            doc.setFont("helvetica", "normal");
            doc.text(`Ledger Hash:`, 25, 155);
            doc.setFont("courier", "normal");
            doc.setTextColor(16, 185, 129);
            doc.text(`${result.ledgerData.hash}`, 60, 155);

            // QR Code
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Scan to view ledger record:", 20, 180);

            const qrData = JSON.stringify({
                deed: result.extracted.deedNumber,
                hash: result.ledgerData.hash,
                status: "VERIFIED"
            });
            const qrImageURL = await QRCode.toDataURL(qrData, { width: 150, margin: 1 });
            doc.addImage(qrImageURL, 'PNG', 20, 185, 45, 45);

            // Footer
            doc.setFontSize(10);
            doc.text("DeedGuard is a secure digitization initiative. This certificate is cryptographically", 105, 260, { align: "center" });
            doc.text("backed and immune to tampering.", 105, 265, { align: "center" });

            doc.save(`DeedGuard_Certificate_${result.extracted.deedNumber}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Failed to generate PDF certificate.");
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                            <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1.2 }}>
                                AI Document Verification
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }}>
                                Upload physical scans of the 6-page deed. Our AI will analyze the signatures, stamps, and layout to ensure it perfectly matches the immutable registry.
                            </p>
                        </div>

                        <div className="glass-card" style={{ padding: '2rem' }}>
                            <label className="upload-area" style={{ display: 'block', marginBottom: '1.5rem', cursor: 'pointer' }}>
                                <input type="file" style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,application/pdf" multiple />
                                {preview && preview.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                        {preview.map((p, idx) => (
                                            <img key={idx} src={p} alt={`Page ${idx}`} style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', objectFit: 'cover' }} />
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <FileText className="upload-icon" style={{ margin: '0 auto 1rem auto' }} />
                                        <p style={{ fontWeight: 600 }}>Tap or drag to upload the 6 physical deed pages</p>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>AI extraction & ledger comparison</p>
                                    </>
                                )}
                            </label>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', height: '54px', fontSize: '1.125rem' }}
                                onClick={processVerification}
                                disabled={!file || file.length === 0 || isProcessing}
                            >
                                {isProcessing ? <div className="loader"></div> : 'Start AI Verification'}
                            </button>
                        </div>

                        {result && (
                            <div className="animate-fade-in" style={{ marginTop: '2.5rem' }}>
                                {result.status === 'AUTHENTIC' ? (
                                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        {result.isFakeDataMatch && (
                                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <AlertTriangle color="#EF4444" size={20} />
                                                <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '0.875rem' }}>⚠️ FAKE TEST DATA MATCH - This is not a real deed verification!</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <CheckCircle color="white" size={24} />
                                            </div>
                                            <div>
                                                <h3 style={{ color: '#34D399', fontSize: '1.25rem' }}>Authentic Document Validated</h3>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{result.message}</p>
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
                                            <p><span style={{ color: 'var(--text-muted)' }}>Deed Number:</span> <strong>{result.extracted.deedNumber}</strong></p>
                                            <p><span style={{ color: 'var(--text-muted)' }}>Owner:</span> <strong>{result.extracted.owner ?? `HASH:${result.extracted.ownerHash ?? 'N/A'}`}</strong></p>
                                            <p><span style={{ color: 'var(--text-muted)' }}>Location:</span> <strong>{result.extracted.location ?? `HASH:${result.extracted.locationHash ?? 'N/A'}`}</strong></p>
                                            <p><span style={{ color: 'var(--text-muted)' }}>Security Hash:</span> <code style={{ color: 'var(--primary)' }}>{result.ledgerData.hash}</code></p>
                                            <p><span style={{ color: 'var(--text-muted)' }}>AI Analysis:</span> <span>{result.extracted.signatureAnalysis || 'Document analysis completed'}</span></p>
                                            <p><span style={{ color: 'var(--text-muted)' }}>Signatures Found:</span> <strong>{result.signaturesFound ?? 0}</strong></p>
                                            <p><span style={{ color: 'var(--text-muted)' }}>Stamps Found:</span> <strong>{result.stampsFound ?? 0}</strong></p>
                                            <p><span style={{ color: 'var(--text-muted)' }}>Watermark Confidence:</span> <strong>{(result.watermarkConfidence ?? 0).toFixed(2)}</strong></p>
                                            <p><span style={{ color: 'var(--text-muted)' }}>Forgery Risk:</span> <strong>{(result.forgeryRisk ?? 0).toFixed(2)}</strong></p>
                                            <p><span style={{ color: 'var(--text-muted)' }}>Fraud Score:</span> <strong>{(result.fraudRisk ?? 0).toFixed(2)}</strong></p>
                                            <p><span style={{ color: 'var(--text-muted)' }}>ZK Proof Verified:</span> <strong>{result.zkVerified ? 'Yes' : 'No'}</strong></p>
                                            <p><span style={{ color: 'var(--text-muted)' }}>ZK Status:</span> <strong>{result.zkStatus || 'N/A'}</strong></p>
                                        </div>
                                        <div style={{ marginTop: '1.5rem', height: '250px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            <iframe
                                                title="Scanned Deed Location"
                                                width="100%"
                                                height="100%"
                                                src={`https://maps.google.com/maps?q=${encodeURIComponent(result.extracted.location || "Zimbabwe")}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                                style={{ border: 0 }}
                                            ></iframe>
                                        </div>
                                        <button
                                            onClick={downloadCertificate}
                                            className="btn btn-primary"
                                            style={{ marginTop: '1.5rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: 'var(--primary)' }}
                                        >
                                            <FileText size={20} /> Download PDF Certificate of Authenticity
                                        </button>
                                    </div>
                                ) : result.status === 'FRAUDULENT' ? (
                                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                        {result.isFakeDataMatch && (
                                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <AlertTriangle color="#EF4444" size={20} />
                                                <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '0.875rem' }}>⚠️ FAKE TEST DATA MATCH - This is not a real deed verification!</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #EF4444, #DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <AlertTriangle color="white" size={24} />
                                            </div>
                                            <div>
                                                <h3 style={{ color: '#F87171', fontSize: '1.25rem' }}>Fraudulent Document Detected!</h3>
                                                <p style={{ color: 'rgba(248, 113, 113, 0.8)', fontSize: '0.875rem' }}>{result.message}</p>
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', display: 'flex', gap: '2rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ color: '#F87171', marginBottom: '0.5rem', borderBottom: '1px solid rgba(239,68,68,0.2)', paddingBottom: '0.25rem' }}>Uploaded Document Data</h4>
                                                <p><span style={{ color: 'var(--text-muted)' }}>Owner:</span> <strong>{result.extracted.owner ?? `HASH:${result.extracted.ownerHash ?? 'N/A'}`}</strong></p>
                                                <p><span style={{ color: 'var(--text-muted)' }}>Location:</span> <strong>{result.extracted.location ?? `HASH:${result.extracted.locationHash ?? 'N/A'}`}</strong></p>
                                                <p><span style={{ color: 'var(--text-muted)' }}>AI Analysis:</span> <span>{result.extracted.signatureAnalysis || 'Document analysis completed'}</span></p>
                                                <p><span style={{ color: 'var(--text-muted)' }}>Signatures Found:</span> <strong>{result.signaturesFound ?? 0}</strong></p>
                                                <p><span style={{ color: 'var(--text-muted)' }}>Stamps Found:</span> <strong>{result.stampsFound ?? 0}</strong></p>
                                                <p><span style={{ color: 'var(--text-muted)' }}>Watermark Confidence:</span> <strong>{(result.watermarkConfidence ?? 0).toFixed(2)}</strong></p>
                                                <p><span style={{ color: 'var(--text-muted)' }}>Forgery Risk:</span> <strong>{(result.forgeryRisk ?? 0).toFixed(2)}</strong></p>
                                                <p><span style={{ color: 'var(--text-muted)' }}>Fraud Score:</span> <strong>{(result.fraudRisk ?? 0).toFixed(2)}</strong></p>
                                                <p><span style={{ color: 'var(--text-muted)' }}>ZK Proof Verified:</span> <strong>{result.zkVerified ? 'Yes' : 'No'}</strong></p>
                                                <p><span style={{ color: 'var(--text-muted)' }}>ZK Status:</span> <strong>{result.zkStatus || 'N/A'}</strong></p>
                                            </div>
                                            <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
                                                <h4 style={{ color: '#34D399', marginBottom: '0.5rem', borderBottom: '1px solid rgba(52,211,153,0.2)', paddingBottom: '0.25rem' }}>True Ledger Data</h4>
                                                <p><span style={{ color: 'var(--text-muted)' }}>Owner:</span> <strong>{result.ledgerData.owner}</strong></p>
                                                <p><span style={{ color: 'var(--text-muted)' }}>Location:</span> <strong>{result.ledgerData.location}</strong></p>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '1.5rem', height: '250px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            <iframe
                                                title="Scanned Deed Location"
                                                width="100%"
                                                height="100%"
                                                src={`https://maps.google.com/maps?q=${encodeURIComponent(result.extracted.location || "Zimbabwe")}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                                style={{ border: 0 }}
                                            ></iframe>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
                                        {result.isFakeDataMatch && (
                                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                <AlertTriangle color="#EF4444" size={20} />
                                                <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '0.875rem' }}>⚠️ FAKE TEST DATA MATCH - This is not a real deed verification!</span>
                                            </div>
                                        )}
                                        <XCircle color="#EF4444" size={48} style={{ margin: '0 auto 1rem auto' }} />
                                        <h3 style={{ color: '#F87171', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Deed Not Found In Ledger</h3>
                                        <p style={{ color: 'var(--text-muted)' }}>
                                            The Deed Number ({result.extracted?.deedNumber}) does not exist in the official blockchain registry. This document is unauthorized.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            case 'results':
                return (
                    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <h1 style={{ color: '#22C55E', fontSize: '2.5rem', marginBottom: '1rem' }}>
                                Verification Results
                            </h1>
                            <p style={{ color: '#16A34A', fontSize: '1.125rem' }}>AI-powered document authentication results</p>
                        </div>

                        {!result ? (
                            <div style={{ textAlign: 'center', padding: '3rem', background: '#F8FAFC', borderRadius: '12px', border: '2px dashed #E2E8F0' }}>
                                <CheckCircle size={48} style={{ color: '#22C55E', margin: '0 auto 1rem auto' }} />
                                <h3 style={{ color: '#22C55E', marginBottom: '0.5rem' }}>No Results Yet</h3>
                                <p style={{ color: '#16A34A' }}>Upload and verify a deed document to see results here.</p>
                            </div>
                        ) : result.status === 'AUTHENTIC' ? (
                            <div style={{ background: '#F0FDF4', borderRadius: '16px', padding: '2rem', border: '2px solid #BBF7D0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircle color="white" size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ color: '#16A34A', fontSize: '1.25rem' }}>Authentic Document Validated</h3>
                                        <p style={{ color: '#15803D', fontSize: '0.875rem' }}>{result.message}</p>
                                    </div>
                                </div>
                                <div style={{ background: '#ECFDF5', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', border: '1px solid #BBF7D0' }}>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>Deed Number:</span> <strong style={{ color: '#15803D' }}>{result.extracted.deedNumber}</strong></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>Owner:</span> <strong style={{ color: '#15803D' }}>{result.extracted.owner ?? `HASH:${result.extracted.ownerHash ?? 'N/A'}`}</strong></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>Location:</span> <strong style={{ color: '#15803D' }}>{result.extracted.location ?? `HASH:${result.extracted.locationHash ?? 'N/A'}`}</strong></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>Security Hash:</span> <code style={{ color: '#22C55E', background: '#DCFCE7', padding: '2px 4px', borderRadius: '4px' }}>{result.ledgerData.hash}</code></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>Signatures Found:</span> <span style={{ color: '#15803D' }}>{result.signaturesFound ?? 0}</span></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>Stamps Found:</span> <span style={{ color: '#15803D' }}>{result.stampsFound ?? 0}</span></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>Signature & Stamp Analysis:</span> <span style={{ color: '#15803D' }}>{result.signatureStampAnalysis || 'Analysis completed'}</span></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>Signature Confidence:</span> <strong style={{ color: '#15803D' }}>{(result.signatureConfidence ?? 0).toFixed(2)}</strong></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>Watermark Confidence:</span> <strong style={{ color: '#15803D' }}>{(result.watermarkConfidence ?? 0).toFixed(2)}</strong></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>Forgery Risk:</span> <strong style={{ color: '#15803D' }}>{(result.forgeryRisk ?? 0).toFixed(2)}</strong></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>Fraud Score:</span> <strong style={{ color: '#15803D' }}>{(result.fraudRisk ?? 0).toFixed(2)}</strong></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>ZK Proof Verified:</span> <strong style={{ color: '#15803D' }}>{result.zkVerified ? 'Yes' : 'No'}</strong></p>
                                    <p><span style={{ color: '#16A34A', fontWeight: 'bold' }}>ZK Status:</span> <strong style={{ color: '#15803D' }}>{result.zkStatus || 'N/A'}</strong></p>
                                </div>
                                <div style={{ marginTop: '1.5rem', height: '250px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #E2E8F0' }}>
                                    <iframe
                                        title="Scanned Deed Location"
                                        width="100%"
                                        height="100%"
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(result.extracted.location || "Zimbabwe")}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                        style={{ border: 0 }}
                                    ></iframe>
                                </div>
                                <button
                                    onClick={downloadCertificate}
                                    className="btn btn-primary"
                                    style={{ marginTop: '1.5rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: '#22C55E', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '1rem', fontWeight: 'bold' }}
                                >
                                    <FileText size={20} /> Download PDF Certificate of Authenticity
                                </button>
                            </div>
                        ) : result.status === 'FRAUDULENT' ? (
                            <div style={{ background: '#FEF2F2', borderRadius: '16px', padding: '2rem', border: '2px solid #FECACA' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <AlertTriangle color="white" size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ color: '#DC2626', fontSize: '1.25rem' }}>Fraudulent Document Detected!</h3>
                                        <p style={{ color: '#B91C1C', fontSize: '0.875rem' }}>{result.message}</p>
                                    </div>
                                </div>
                                <div style={{ background: '#FEF2F2', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', border: '1px solid #FECACA' }}>
                                    <div style={{ display: 'flex', gap: '2rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ color: '#DC2626', marginBottom: '0.5rem', borderBottom: '1px solid #FECACA', paddingBottom: '0.25rem' }}>Uploaded Document Data</h4>
                                            <p><span style={{ color: '#B91C1C' }}>Owner:</span> <strong>{result.extracted.owner ?? `HASH:${result.extracted.ownerHash ?? 'N/A'}`}</strong></p>
                                            <p><span style={{ color: '#B91C1C' }}>Location:</span> <strong>{result.extracted.location ?? `HASH:${result.extracted.locationHash ?? 'N/A'}`}</strong></p>
                                            <p><span style={{ color: '#B91C1C' }}>AI Analysis:</span> <span>{result.extracted.signatureAnalysis || 'Document analysis indicates potential irregularities'}</span></p>
                                            <p><span style={{ color: '#B91C1C' }}>Signature Confidence:</span> <strong>{(result.signatureConfidence ?? 0).toFixed(2)}</strong></p>
                                            <p><span style={{ color: '#B91C1C' }}>Watermark Confidence:</span> <strong>{(result.watermarkConfidence ?? 0).toFixed(2)}</strong></p>
                                            <p><span style={{ color: '#B91C1C' }}>Forgery Risk:</span> <strong>{(result.forgeryRisk ?? 0).toFixed(2)}</strong></p>
                                            <p><span style={{ color: '#B91C1C' }}>Fraud Score:</span> <strong>{(result.fraudRisk ?? 0).toFixed(2)}</strong></p>
                                            <p><span style={{ color: '#B91C1C' }}>ZK Proof Verified:</span> <strong>{result.zkVerified ? 'Yes' : 'No'}</strong></p>
                                            <p><span style={{ color: '#B91C1C' }}>ZK Status:</span> <strong>{result.zkStatus || 'N/A'}</strong></p>
                                        </div>
                                        <div style={{ flex: 1, borderLeft: '1px solid #FECACA', paddingLeft: '2rem' }}>
                                            <h4 style={{ color: '#16A34A', marginBottom: '0.5rem', borderBottom: '1px solid #BBF7D0', paddingBottom: '0.25rem' }}>True Ledger Data</h4>
                                            <p><span style={{ color: '#15803D' }}>Owner:</span> <strong>{result.ledgerData.owner}</strong></p>
                                            <p><span style={{ color: '#15803D' }}>Location:</span> <strong>{result.ledgerData.location}</strong></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: '#FEF3C7', borderRadius: '16px', padding: '2rem', border: '2px solid #FCD34D', textAlign: 'center' }}>
                                <XCircle color="#F59E0B" size={48} style={{ margin: '0 auto 1rem auto' }} />
                                <h3 style={{ color: '#D97706', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Deed Not Found In Ledger</h3>
                                <p style={{ color: '#B45309' }}>
                                    The Deed Number ({result.extracted?.deedNumber}) does not exist in the official blockchain registry. This document is unauthorized.
                                </p>
                            </div>
                        )}
                    </div>
                );
            case 'fraud':
                return (
                    <div className="animate-fade-in glass-card" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield className="text-gradient" size={24} /> AI Fraud Analysis
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                            Real-time fraud detection powered by TensorFlow.js machine learning model. Analyze deed patterns and risk scores across the entire registry.
                        </p>

                        {/* Fraud Statistics Overview */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <AlertTriangle color="#F87171" size={20} />
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>High Risk Deeds</span>
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#F87171' }}>
                                    {fraudStats.highRiskCount}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <TrendingUp color="#F59E0B" size={20} />
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Average Risk Score</span>
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#F59E0B' }}>
                                    {(fraudStats.averageRisk * 100).toFixed(1)}%
                                </div>
                            </div>
                            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <Target color="#10B981" size={20} />
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pattern Detections</span>
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10B981' }}>
                                    {fraudStats.patternDetections}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <CheckCircle color="#34D399" size={20} />
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Verified Clean</span>
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#34D399' }}>
                                    {fraudStats.verifiedCount}
                                </div>
                            </div>
                        </div>

                        {/* Risk Distribution Chart */}
                        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BarChart3 size={20} /> Risk Score Distribution
                            </h3>
                            <div style={{ height: '300px', display: 'flex', alignItems: 'end', justifyContent: 'space-around', gap: '0.5rem' }}>
                                {fraudStats.riskDistribution.map((count, index) => {
                                    const riskLevel = index * 0.2; // 0.0, 0.2, 0.4, 0.6, 0.8
                                    const height = (count / Math.max(...fraudStats.riskDistribution)) * 250;
                                    const color = riskLevel < 0.4 ? '#10B981' : riskLevel < 0.7 ? '#F59E0B' : '#EF4444';
                                    return (
                                        <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                            <div style={{
                                                height: `${height}px`,
                                                width: '100%',
                                                background: color,
                                                borderRadius: '4px 4px 0 0',
                                                transition: 'all 0.3s ease',
                                                marginBottom: '0.5rem'
                                            }}></div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(riskLevel * 100).toFixed(0)}%</span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '12px', height: '12px', background: '#10B981', borderRadius: '2px' }}></div>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Low Risk (0-40%)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '12px', height: '12px', background: '#F59E0B', borderRadius: '2px' }}></div>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Medium Risk (40-70%)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '12px', height: '12px', background: '#EF4444', borderRadius: '2px' }}></div>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>High Risk (70-100%)</span>
                                </div>
                            </div>
                        </div>

                        {/* Suspicious Patterns Detected */}
                        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={20} /> Suspicious Patterns Detected
                            </h3>
                            {fraudStats.suspiciousPatterns.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No suspicious patterns detected in recent analysis.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {fraudStats.suspiciousPatterns.map((pattern, idx) => (
                                        <div key={idx} style={{ padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <strong style={{ color: '#F87171' }}>{pattern.type}</strong>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Risk: {(pattern.risk * 100).toFixed(1)}%</span>
                                            </div>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{pattern.description}</p>
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Affected Deeds: {pattern.affectedDeeds.join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'history':
                return (
                    <div className="animate-fade-in glass-card" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock className="text-gradient" size={24} /> Verification History
                        </h2>
                        {userHistory.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No deeds verified yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div key={idx} style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(15, 23, 42, 0.5)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <div>
                                                <strong style={{ display: 'block', fontSize: '1.125rem' }}>{hist.extracted?.deedNumber || 'Unknown Deed'}</strong>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{new Date(hist.date).toLocaleString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {hist.status === 'AUTHENTIC' ? (
                                                    <span className="status-badge status-verified">Verified Valid</span>
                                                ) : hist.status === 'FRAUDULENT' ? (
                                                    <span className="status-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171' }}>Flagged Forgery</span>
                                                ) : (
                                                    <span className="status-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171' }}>Flagged Not Found</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                            <div><strong>Signatures:</strong> {hist.signaturesFound ?? 0}</div>
                                            <div><strong>Stamps:</strong> {hist.stampsFound ?? 0}</div>
                                            <div><strong>Confidence:</strong> {((hist.signatureConfidence ?? 0) * 100).toFixed(0)}%</div>
                                            <div><strong>Fraud Risk:</strong> {((hist.fraudRisk ?? 0) * 100).toFixed(0)}%</div>
                                        </div>
                                        {hist.signatureStampAnalysis && (
                                            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {hist.signatureStampAnalysis}
                                            </div>
                                        )}
                                    </div>
                            </div>
                        )}
                    </div>
                );
            case 'map':
                return (
                    <div className="animate-fade-in glass-card" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapIcon className="text-gradient" size={24} /> Verified Deeds Map
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Geographic location of all scanned deeds. Valid deeds are marked in green, while suspected forgeries are flagged in red.</p>
                        <div style={{ width: '100%', height: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', zIndex: 1 }}>
                            <DeedsLeafletMap deeds={deeds} />
                        </div>
                    </div>
                );
            case 'profile':
                return (
                    <div className="animate-fade-in glass-card" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <UserIcon className="text-gradient" size={24} /> Citizen Profile
                        </h2>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <UserIcon color="#fff" size={40} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.5rem' }}>{user?.username || 'Citizen'}</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Verified Identity</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '1.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '1.5rem', borderRadius: '12px' }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Full Legal Name</span>
                                <div style={{ fontSize: '1.125rem', fontWeight: 500 }}>{user?.username || 'John Doe'}</div>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>National ID</span>
                                <div style={{ fontSize: '1.125rem', fontWeight: 500, fontFamily: 'monospace' }}>{user?.nationalId || 'Not provided'}</div>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Email Address</span>
                                <div style={{ fontSize: '1.125rem', fontWeight: 500 }}>{user?.email || 'Not provided'}</div>
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex' }}>
            {/* Sidebar Overlay */}
            {isMenuOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside style={{
                position: 'fixed', left: 0, top: 0, bottom: 0, width: '280px',
                background: 'linear-gradient(135deg, var(--zimbabwe-green) 0%, var(--zimbabwe-black) 100%)',
                borderRight: '3px solid var(--zimbabwe-yellow)',
                boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
                zIndex: 50,
                transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s ease',
                display: 'flex', flexDirection: 'column'
            }}>
                <div style={{
                    padding: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    borderBottom: '2px solid var(--zimbabwe-yellow)',
                    background: 'rgba(0, 0, 0, 0.2)'
                }}>
                    <img src={logo} alt="Logo" style={{ width: '40px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                    <h2 style={{
                        fontSize: '1.25rem',
                        fontFamily: 'Outfit',
                        fontWeight: 700,
                        color: 'var(--zimbabwe-white)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.7)'
                    }}>
                        DeedGuard<br />
                        <span style={{
                            fontSize: '0.875rem',
                            color: 'var(--zimbabwe-yellow)',
                            fontWeight: 600,
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }}>
                            Zimbabwe
                        </span>
                    </h2>
                </div>

                <nav style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {[
                        { id: 'dashboard', icon: Home, label: 'Dashboard' },
                        { id: 'results', icon: CheckCircle, label: 'Verification Results' },
                        { id: 'fraud', icon: Shield, label: 'Fraud Analysis' },
                        { id: 'history', icon: Clock, label: 'Verification History' },
                        { id: 'map', icon: MapIcon, label: 'Geographical Map' },
                        { id: 'profile', icon: UserIcon, label: 'My Identity Profile' },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                                borderRadius: '12px',
                                background: activeTab === item.id ? 'var(--zimbabwe-yellow)' : 'rgba(255, 255, 255, 0.1)',
                                color: activeTab === item.id ? 'var(--zimbabwe-black)' : 'var(--zimbabwe-white)',
                                border: activeTab === item.id ? '2px solid var(--zimbabwe-red)' : '1px solid rgba(255, 255, 255, 0.2)',
                                cursor: 'pointer', textAlign: 'left',
                                transition: 'all 0.3s ease', fontWeight: 600,
                                fontSize: '1rem',
                                boxShadow: activeTab === item.id ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                                textShadow: activeTab === item.id ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                            }}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div style={{
                    padding: '1.5rem',
                    borderTop: '2px solid var(--zimbabwe-yellow)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)'
                }}>
                    <button onClick={forgetUser} className="btn" style={{
                        width: '100%',
                        background: 'var(--zimbabwe-red)',
                        color: 'var(--zimbabwe-white)',
                        border: '2px solid var(--zimbabwe-yellow)',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}>
                        <LogOut size={18} /> Forget & Remove My Data
                    </button>
                    <button onClick={logout} className="btn" style={{
                        width: '100%',
                        background: 'var(--zimbabwe-red)',
                        color: 'var(--zimbabwe-white)',
                        border: '2px solid var(--zimbabwe-yellow)',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}>
                        <LogOut size={18} /> Sign Out Securely
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', transition: 'padding-left 0.3s ease' }}>
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.5rem 2rem',
                    borderBottom: '2px solid var(--zimbabwe-yellow)',
                    background: 'rgba(0, 50, 0, 0.9)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => setIsMenuOpen(true)} style={{
                            background: 'var(--zimbabwe-yellow)',
                            border: '2px solid var(--zimbabwe-black)',
                            color: 'var(--zimbabwe-black)',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            fontWeight: 600
                        }}>
                            <Menu size={28} />
                        </button>
                        {!isMenuOpen && <img src={logo} alt="Logo" style={{ width: '32px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />}
                        {!isMenuOpen && <span style={{
                            fontWeight: 'bold',
                            fontSize: '1.25rem',
                            fontFamily: 'Outfit',
                            color: 'var(--zimbabwe-white)',
                            textShadow: '0 2px 4px rgba(0,0,0,0.7)'
                        }}>
                            DeedGuard Zimbabwe
                        </span>}
                    </div>
                </header>

                <main style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
                    {renderContent()}
                </main>
            </div>

            {/* Scanning Popup Modal */}
            {showScanModal && (
                <div className="modal-overlay" style={{ zIndex: 100 }}>
                    <div className="modal-content glass-card animate-fade-in" style={{ padding: '2rem', textAlign: 'center', width: '90%', maxWidth: '500px' }}>
                        <h3 className="text-gradient" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                            Verifying Page {currentScanIdx + 1} of {file.length}...
                        </h3>

                        <div className="scanner-container">
                            <img
                                src={preview[currentScanIdx]}
                                alt={`Scanning Page ${currentScanIdx + 1}`}
                                className="scanner-image"
                            />
                            <div className="laser-line"></div>
                            <div className="scanner-overlay"></div>
                        </div>

                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'left', minHeight: '120px', maxHeight: '180px', overflowY: 'auto' }}>
                            <p style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                Process: {processStatus}
                            </p>
                            <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                                {extractedLogs || "Awaiting extraction..."}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
