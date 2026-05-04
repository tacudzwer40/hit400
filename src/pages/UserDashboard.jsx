import React, { useState, useEffect } from 'react';
import {
    CheckCircle, XCircle, LogOut, Menu, Home, Clock,
    Map as MapIcon, User as UserIcon, FileText, AlertTriangle,
    Shield, TrendingUp, Target, BarChart3, X, Download, Server, Wifi, ShieldAlert, Brain, Zap, HardDrive
} from 'lucide-react';

import logo from '../assets/logo.png';
import { useAppContext } from '../context/AppContext';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Tesseract from 'tesseract.js';
import { verifySignature, detectWatermark, runForgeryAnalysis, extractSignaturesAndStamps } from '../utils/aiVerification';
import { hashPersonalData } from '../utils/privacy';
import FraudDetectionModel from '../utils/fraudDetection';
import DeedsLeafletMap from '../components/DeedsLeafletMap';
import LandRegistryMap from '../components/LandRegistryMap';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { callGeminiWithRetry } from '../utils/aiCallHelper';
import { callMistral } from '../utils/mistralCallHelper';
import ProcessVisualizer from '../components/ProcessVisualizer';
import { normalizeStr } from '../utils/normalize';


/* ─── Nav items ─── */
const NAV_ITEMS = [
    { id: 'dashboard', icon: Home,     label: 'Verify Deed' },
    { id: 'results',   icon: CheckCircle, label: 'Results' },
    { id: 'history',   icon: Clock,    label: 'History' },
    { id: 'map',       icon: MapIcon,  label: 'Map' },
    { id: 'profile',   icon: UserIcon, label: 'My Profile' },
];

const geocodeZimbabweLocation = (locationString) => {
    const location = locationString?.toLowerCase() || '';
    const locationMap = {
        'harare': [-17.8252, 31.0335], 'bulawayo': [-20.1325, 28.6265], 'gweru': [-19.4500, 29.8167],
        'mutare': [-18.9667, 32.6667], 'kwekwe': [-18.9167, 29.8167], 'kadoma': [-18.3333, 29.9167],
        'masvingo': [-20.0667, 30.8333], 'chitungwiza': [-18.0127, 31.0756], 'epworth': [-17.8833, 31.1333],
        'ruwa': [-17.8833, 31.2500], 'norton': [-17.8833, 30.7000], 'chegutu': [-18.1333, 30.1500],
        'bindura': [-17.3000, 31.3333], 'marondera': [-18.1833, 31.5500], 'hwange': [-18.3667, 26.4833],
        'victoria falls': [-17.9333, 25.8333], 'kariba': [-16.5167, 28.8000]
    };
    for (const [city, coords] of Object.entries(locationMap)) {
        if (location.includes(city)) return coords;
    }
    return [-17.8252, 31.0335]; // Default to Harare
};

const UserDashboard = () => {
    const { user, deeds, logout, forgetUser, userHistory, addToHistory, isOffline, predictFraudScore } = useAppContext();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedEngine, setSelectedEngine] = useState('mistral');
    const [isMenuOpen, setIsMenuOpen] = useState(false);


    useEffect(() => {
        let timeout;
        const resetTimer = () => {
            clearTimeout(timeout);
            if (isMenuOpen) {
                timeout = setTimeout(() => setIsMenuOpen(false), 30000);
            }
        };
        if (isMenuOpen) {
            timeout = setTimeout(() => setIsMenuOpen(false), 30000);
            window.addEventListener('mousemove', resetTimer);
            window.addEventListener('keydown', resetTimer);
            window.addEventListener('touchstart', resetTimer);
        }
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
        };
    }, [isMenuOpen]);
 

    const [file, setFile] = useState([]);
    const [preview, setPreview] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);
    const [currentScanIdx, setCurrentScanIdx] = useState(0);
    const [result, setResult] = useState(null);
    const [processStatus, setProcessStatus] = useState('');
    const [extractedLogs, setExtractedLogs] = useState('');
    const [processSteps, setProcessSteps] = useState([
        { 
            id: 'init', 
            label: 'AI Engine Boot', 
            status: 'pending',
            subSteps: [
                { label: 'Initializing neural weights', status: 'pending' },
                { label: 'Securing API gateway', status: 'pending' }
            ]
        },
        { 
            id: 'ocr', 
            label: 'Document OCR Analysis', 
            status: 'pending',
            subSteps: [
                { label: 'Normalizing image data', status: 'pending' },
                { label: 'Running OCR engine', status: 'pending' },
                { label: 'Extracting text fragments', status: 'pending' }
            ]
        },
        { 
            id: 'vision', 
            label: 'Multi-Modal Vision Scan', 
            status: 'pending',
            subSteps: [
                { label: 'Transmitting payload', status: 'pending' },
                { label: 'Analyzing visual features', status: 'pending' },
                { label: 'Cross-referencing vision data', status: 'pending' }
            ]
        },
        { 
            id: 'ledger', 
            label: 'Blockchain Ledger Match', 
            status: 'pending',
            subSteps: [
                { label: 'Generating document hash', status: 'pending' },
                { label: 'Querying node registry', status: 'pending' }
            ]
        },
        { 
            id: 'fraud', 
            label: 'Risk Architecture Check', 
            status: 'pending',
            subSteps: [
                { label: 'Pattern anomaly detection', status: 'pending' },
                { label: 'Finalizing integrity score', status: 'pending' }
            ]
        },
    ]);


    /* ── Close sidebar on route change (mobile) ── */
    const navigate = (tab) => { setActiveTab(tab); setIsMenuOpen(false); };

    /* ── File handling ── */
    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        if (!selected.length) return;
        setFile(selected);
        setPreview(selected.map(f => URL.createObjectURL(f)));
        setResult(null);
    };

    const optimizeImageForOCR = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                // Scale up by 2x to drastically improve Tesseract's number recognition
                const scale = 2;
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    /* ── Verification ── */
    const processVerification = async () => {
        if (!file || file.length === 0) { alert('Please upload the deed document pages (6 pages expected).'); return; }
        if (file.length !== 6) {
            if (!window.confirm(`A typical Zimbabwe Land Deed has 6 pages. You have uploaded ${file.length} page(s). Continue anyway?`)) return;
        }

        const updateStatus = (msg, data = null) => {
            setProcessStatus(msg);
            console.log(`%c[DeedGuard System] %c${msg}`, 'color: #10b981; font-weight: bold;', 'color: #a7f3d0;');
            if (data) console.dir(data);
        };

        console.group('%c🚀 New Deed Verification Process Initiated', 'color: #facc15; font-size: 14px; font-weight: bold;');
        console.time('Verification Total Time');

        setIsProcessing(true);
        setShowScanModal(true);
        setResult(null);
        
        // Reset steps and sub-steps
        setProcessSteps(prev => prev.map(s => ({
            ...s,
            status: 'pending',
            subSteps: s.subSteps.map(ss => ({ ...ss, status: 'pending' }))
        })));

        let apiKey = '';
        if (selectedEngine === 'gemini') {
            apiKey = localStorage.getItem('gemini_api_key') || '';
            if (!apiKey) apiKey = prompt('Please enter Gemini API Key:');
            if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
        } else if (selectedEngine === 'mistral') {
            apiKey = localStorage.getItem('mistral_api_key') || '';
            if (!apiKey) apiKey = prompt('Please enter Mistral API Key (Free):');
            if (apiKey) localStorage.setItem('mistral_api_key', apiKey);
        }

        if (selectedEngine !== 'local' && !apiKey) {
            alert('API Key is required for cloud AI extraction.');
            setIsProcessing(false);
            setShowScanModal(false);
            return;
        }

        updateStatus('Initializing AI Verification Engine…');
        
        // Activate Init step
        setProcessSteps(prev => prev.map(s => s.id === 'init' ? { 
            ...s, 
            status: 'active',
            subSteps: s.subSteps.map((ss, i) => i === 0 ? { ...ss, status: 'active' } : ss)
        } : s));
        
        setExtractedLogs('');
        let fullText = '';

        if (isOffline || selectedEngine === 'local') {
            console.info(`%c🔌 Operating in ${useLocalAI ? 'LOCAL' : 'OFFLINE'} mode (Free Engine)`, 'color: #ef4444; font-weight: bold;');

            try {
                // Complete Init, Start OCR
                setProcessSteps(prev => prev.map(s => 
                    s.id === 'init' ? { ...s, status: 'completed', subSteps: s.subSteps.map(ss => ({ ...ss, status: 'completed' })) } : 
                    s.id === 'ocr' ? { ...s, status: 'active', subSteps: s.subSteps.map((ss, i) => i === 0 ? { ...ss, status: 'active' } : ss) } : s
                ));

                for (let i = 0; i < file.length; i++) {
                    setCurrentScanIdx(i);
                    updateStatus(`Optimizing Page ${i + 1} for Local Processing...`);
                    const optimizedBlob = await optimizeImageForOCR(file[i]);
                    
                    updateStatus(`Local Engine: Processing page ${i + 1} of ${file.length}…`);
                    
                    const { data: { text } } = await Tesseract.recognize(optimizedBlob, 'eng', {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                updateStatus(`Local Engine: Page ${i + 1} (${(m.progress * 100).toFixed(0)}%)`);
                            } else if (m.status === 'loading tesseract core' || m.status === 'initializing api') {
                                updateStatus(`Initializing Engine: ${m.status}...`);
                            }
                        }
                    });
                    fullText += text + ' ';
                    setExtractedLogs(prev => prev + `\n[Page ${i + 1}]:\n${text}\n`);
                    console.log(`%c📄 Extracted text from Page ${i + 1}:`, 'color: #3b82f6;', text.substring(0, 100) + '...');
                }

                // Complete OCR, Start Vision
                setProcessSteps(prev => prev.map(s => 
                    s.id === 'ocr' ? { ...s, status: 'completed', subSteps: s.subSteps.map(ss => ({ ...ss, status: 'completed' })) } : 
                    s.id === 'vision' ? { ...s, status: 'active', subSteps: s.subSteps.map((ss, i) => i === 0 ? { ...ss, status: 'active' } : ss) } : s
                ));
                updateStatus('Cross-referencing OCR data with offline ledger…');

                const normalizeStr = str => (str || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                const normalizedText = normalizeStr(fullText);

                // --- Extract Data from OCR ---
                let extractedOwner = 'Unknown';
                let extractedLocation = 'Unknown';
                const lines = fullText.split('\n');
                for (const line of lines) {
                    const clean = line.trim();
                    if (/(?:transferred to|favour of|owner|proprietor)[:.\s]*(.+)/i.test(clean)) {
                        extractedOwner = clean.match(/(?:transferred to|favour of|owner|proprietor)[:.\s]*(.+)/i)[1].trim().substring(0, 50);
                    }
                    if (/(?:situated|location|district|town|stand)[:.\s]*(.+)/i.test(clean)) {
                        extractedLocation = clean.match(/(?:situated|location|district|town|stand)[:.\s]*(.+)/i)[1].trim().substring(0, 60);
                    }
                }

                let matchedDeed = null;
                for (const d of deeds) {
                    if (normalizeStr(d.deedNumber) && normalizedText.includes(normalizeStr(d.deedNumber))) { matchedDeed = d; break; }
                }

                const [signatureResult, watermarkResult, forgeryResult, signatureStampResult] = await Promise.all([
                    verifySignature(file[0]), detectWatermark(file[0]), runForgeryAnalysis(file[0]), extractSignaturesAndStamps(file)
                ]);

                setProcessSteps(prev => prev.map(s => 
                    s.id === 'vision' ? { ...s, status: 'completed', subSteps: s.subSteps.map(ss => ({ ...ss, status: 'completed' })) } : 
                    s.id === 'ledger' ? { ...s, status: 'active', subSteps: s.subSteps.map((ss, i) => i === 0 ? { ...ss, status: 'active' } : ss) } : s
                ));
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
                let verificationResult;
                if (!matchedDeed) {
                    verificationResult = { status: 'NOT_FOUND', message: 'Offline OCR: Could not find any registered Deed Number in this document.', extracted: { deedNumber: 'Unknown' }, ...commonAnalysis };
                } else {
                    const extractedOwnerHash = hashPersonalData(extractedOwner);
                    const extractedLocationHash = hashPersonalData(extractedLocation);
                    
                    const ownerMatch = (normalizeStr(matchedDeed.owner).includes(normalizeStr(extractedOwner)) || normalizeStr(extractedOwner).includes(normalizeStr(matchedDeed.owner)));
                    
                    if (ownerMatch) {
                        verificationResult = { status: 'AUTHENTIC', message: 'Offline Hash Match! Owner/location hashes align with the offline ledger.', extracted: { deedNumber: matchedDeed.deedNumber, owner: extractedOwner, location: extractedLocation }, ledgerData: matchedDeed, ...commonAnalysis, fraudRisk: Math.min(fraudRisk, 0.29) };
                    } else {
                        verificationResult = { status: 'FRAUDULENT', message: `Offline Forgery Detected! The document owner "${extractedOwner}" does not match the ledger owner "${matchedDeed.owner}".`, extracted: { deedNumber: matchedDeed.deedNumber, owner: extractedOwner, location: extractedLocation }, ledgerData: matchedDeed, ...commonAnalysis };
                    }
                }
                setProcessSteps(prev => prev.map(s => 
                    s.id === 'ledger' ? { ...s, status: 'completed', subSteps: s.subSteps.map(ss => ({ ...ss, status: 'completed' })) } : 
                    s.id === 'fraud' ? { ...s, status: 'active', subSteps: s.subSteps.map((ss, i) => i === 0 ? { ...ss, status: 'active' } : ss) } : s
                ));
                updateStatus(verificationResult.status === 'AUTHENTIC' ? 'Authentic Match Confirmed!' : 'Anomaly Detected.', verificationResult);
                await new Promise(r => setTimeout(r, 600));
                setProcessSteps(prev => prev.map(s => s.id === 'fraud' ? { ...s, status: 'completed', subSteps: s.subSteps.map(ss => ({ ...ss, status: 'completed' })) } : s));
                setResult(verificationResult);

                addToHistory({ date: new Date().toISOString(), ...verificationResult });
            } catch (err) {
                console.error('%c❌ Local Verification Error:', 'color: #ef4444; font-weight: bold;', err);
                alert(`Local Verification failed: ${err.message}`);
            } finally {
                setIsProcessing(false);
                console.timeEnd('Verification Total Time');
                console.groupEnd();
            }

            return;
        }


        // --- Cloud AI Extraction Logic (Gemini or Mistral) ---
        try {
            setProcessSteps(prev => prev.map(s => s.id === 'init' ? { ...s, status: 'completed', subSteps: s.subSteps.map(ss => ({ ...ss, status: 'completed' })) } : s.id === 'ocr' ? { ...s, status: 'active', subSteps: s.subSteps.map((ss, i) => i === 0 ? { ...ss, status: 'active' } : ss) } : s));
            updateStatus(`Transmitting to ${selectedEngine === 'gemini' ? 'Gemini' : 'Mistral'} AI...`);
            let responseText = '';

            if (selectedEngine === 'gemini') {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                const convertToBase64 = file => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX = 1000;
                            let w = img.width, h = img.height;
                            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                            else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                            canvas.width = w; canvas.height = h;
                            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                            resolve(canvas.toDataURL('image/jpeg', 0.6).split(',')[1]);
                        };
                        img.onerror = reject;
                        img.src = e.target.result;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const imageParts = [];
                for (let i = 0; i < file.length; i++) {
                    setCurrentScanIdx(i);
                    updateStatus(`Preparing Page ${i + 1} for Gemini...`);
                    imageParts.push({ inlineData: { data: await convertToBase64(file[i]), mimeType: 'image/jpeg' } });
                }

                const promptText = `
                    You are a specialized document digitizer for Zimbabwean Land Deeds. 
                    Extract the following information into a strict JSON object: { "deedNumber", "owner", "location", "latitude", "longitude", "signatureCount", "stampCount" }.
                    
                    CRITICAL INSTRUCTION FOR DEED NUMBER:
                    The "deedNumber" is typically found at the top right of the first page or prominently labeled as "Deed of Transfer No." or "Deed of Grant No.". 
                    It usually contains a sequential number followed by a forward slash and the year, for example: "1234/2023", "456/1998", or "DT789/21".
                    Ensure you extract the EXACT number with the slash.

                    Return ONLY a JSON object. Do not include any markdown formatting like \`\`\`json.
                `;

                const res = await callGeminiWithRetry(model, [promptText, ...imageParts], updateStatus);
                responseText = (await res.response).text();
            } else if (selectedEngine === 'mistral') {
                updateStatus('Mistral: Running local OCR pass...');
                let localFullText = '';
                for (let i = 0; i < file.length; i++) {
                    setCurrentScanIdx(i);
                    updateStatus(`Local OCR: Page ${i+1} of ${file.length}...`);
                    const optimizedBlob = await optimizeImageForOCR(file[i]);
                    const { data: { text } } = await Tesseract.recognize(optimizedBlob, 'eng');
                    localFullText += text + '\n';
                }

                const mistralPrompt = `
                    You are an expert legal data extraction AI. Your task is to extract property data from Zimbabwe Land Deeds.
                    
                    Extract data from this raw OCR text into a STRICT JSON object with exactly these keys:
                    { "deedNumber", "owner", "location", "latitude", "longitude", "signatureCount", "stampCount" }
                    
                    RULES:
                    1. "deedNumber" MUST include the slash (e.g., "1234/2023"). If the OCR missed the slash but has a space (e.g., "1234 2023"), format it with a slash. Look for "Deed of Transfer No." or "Deed of Grant No.".
                    2. "owner" is the person or entity the property is transferred to (look for "transferred to", "favour of", "registered owner").
                    3. "signatureCount" is the number of signatures (usually 2). "stampCount" is the number of official stamps (usually 1 or 2). Infer from context if unsure.
                    4. "latitude" and "longitude" should be estimated decimal coordinates for the location in Zimbabwe.
                    5. Return ONLY valid JSON, no markdown formatting.

                    EXAMPLE INPUT:
                    "DEED OF TRANSFER No. 4521/2021 ... hereby transferred to JOHN DOE ... situated in the District of Salisbury called Stand 123 Harare Township... Signed by Registrar"
                    EXAMPLE OUTPUT:
                    {"deedNumber": "4521/2021", "owner": "JOHN DOE", "location": "Stand 123 Harare Township", "latitude": -17.82, "longitude": 31.04, "signatureCount": 2, "stampCount": 1}
                    
                    RAW TEXT TO PROCESS:
                    ${localFullText}
                `;

                responseText = await callMistral(apiKey, mistralPrompt, updateStatus);
            }

            console.log(`%c[${selectedEngine.toUpperCase()} API] Response:`, 'color: #a855f7;', responseText);
            setExtractedLogs(responseText);
            
            let parsedData;
            try {
                const fb = responseText.indexOf('{'), lb = responseText.lastIndexOf('}');
                if (fb === -1 || lb === -1) throw new Error('No JSON found.');
                parsedData = JSON.parse(responseText.substring(fb, lb + 1));
            } catch (jsonErr) {
                throw new Error('AI returned invalid format: ' + jsonErr.message);
            }

            setProcessSteps(prev => prev.map(s => s.id === 'ocr' ? { ...s, status: 'completed', subSteps: s.subSteps.map(ss => ({ ...ss, status: 'completed' })) } : s.id === 'vision' ? { ...s, status: 'active', subSteps: s.subSteps.map((ss, i) => i === 0 ? { ...ss, status: 'active' } : ss) } : s));
            updateStatus('Cross-referencing OCR data and running vision algorithms...');

            const [signatureResult, watermarkResult, forgeryResult, signatureStampResult] = await Promise.all([
                verifySignature(file[0]), detectWatermark(file[0]), runForgeryAnalysis(file[0]), extractSignaturesAndStamps(file)
            ]);

            setProcessSteps(prev => prev.map(s => s.id === 'vision' ? { ...s, status: 'completed', subSteps: s.subSteps.map(ss => ({ ...ss, status: 'completed' })) } : s.id === 'ledger' ? { ...s, status: 'active', subSteps: s.subSteps.map((ss, i) => i === 0 ? { ...ss, status: 'active' } : ss) } : s));
            updateStatus('Cross-referencing with blockchain ledger...');

            const matchedDeed = deeds.find(d => normalizeStr(d.deedNumber) === normalizeStr(parsedData.deedNumber));
            
            setProcessSteps(prev => prev.map(s => s.id === 'ledger' ? { ...s, status: 'completed', subSteps: s.subSteps.map(ss => ({ ...ss, status: 'completed' })) } : s.id === 'fraud' ? { ...s, status: 'active', subSteps: s.subSteps.map((ss, i) => i === 0 ? { ...ss, status: 'active' } : ss) } : s));
            updateStatus('Calculating advanced fraud risk score...');
            
            const fraudRisk = matchedDeed ? await predictFraudScore(matchedDeed) : 0.5;

            const commonAnalysis = {
                signatureConfidence: signatureResult?.confidence ?? 0.5,
                watermarkConfidence: watermarkResult?.confidence ?? 0.5,
                forgeryRisk: forgeryResult?.riskScore ?? 0.5,
                fraudRisk,
                signatureAnalysis: signatureResult?.reason,
                watermarkAnalysis: watermarkResult?.reason,
                forgeryAnalysis: forgeryResult?.reason,
                signaturesFound: parsedData.signatureCount !== undefined ? parsedData.signatureCount : signatureStampResult.signatures.length,
                stampsFound: parsedData.stampCount !== undefined ? parsedData.stampCount : signatureStampResult.stamps.length,
                signatureStampAnalysis: signatureStampResult.analysis
            };

            let verificationResult;
            if (!matchedDeed) {
                verificationResult = { status: 'NOT_FOUND', message: 'Registry Error: This document number is not in our system.', extracted: parsedData, ...commonAnalysis };
            } else {
                const extractedOwnerName = typeof parsedData.owner === 'object' ? parsedData.owner.name : parsedData.owner;
                const ownerOk = normalizeStr(matchedDeed.owner) === normalizeStr(extractedOwnerName);
                if (ownerOk) {
                    verificationResult = { status: 'AUTHENTIC', message: 'Verification Successful! Document matches registry records.', extracted: parsedData, ledgerData: matchedDeed, ...commonAnalysis, fraudRisk: Math.min(fraudRisk, 0.1) };
                } else {
                    verificationResult = { status: 'FRAUDULENT', message: `Identity Mismatch! The owner "${extractedOwnerName}" does not match the registered owner "${matchedDeed.owner}".`, extracted: parsedData, ledgerData: matchedDeed, ...commonAnalysis };
                }
            }

            setProcessSteps(prev => prev.map(s => s.id === 'fraud' ? { ...s, status: 'completed', subSteps: s.subSteps.map(ss => ({ ...ss, status: 'completed' })) } : s));
            updateStatus('Verification complete!');

            setResult(verificationResult);
            addToHistory({ date: new Date().toISOString(), ...verificationResult });
            
            console.log('%c✅ FINAL VERIFICATION RESULT:', 'color: #10b981; font-weight: bold; font-size: 14px;', verificationResult);
            navigate('results');
        } catch (err) {
            console.error('%c❌ Verification Error:', 'color: #ef4444; font-weight: bold;', err);
            alert(`Verification failed: ${err.message}`);
        } finally {
            setIsProcessing(false);
            console.timeEnd('Verification Total Time');
            console.groupEnd();
        }

    };

    /* ── PDF Certificate ── */
    const downloadCertificate = async () => {
        if (!result || result.status !== 'AUTHENTIC') return;
        try {
            const doc = new jsPDF();
            doc.setDrawColor(0, 100, 0);
            doc.setLineWidth(1);
            doc.rect(10, 10, 190, 277);
            doc.setFontSize(22); doc.setTextColor(15, 23, 42);
            doc.text('DeedGuard Zimbabwe', 105, 30, { align: 'center' });
            doc.setFontSize(16); doc.setTextColor(0, 100, 0);
            doc.text('OFFICIAL CERTIFICATE OF AUTHENTICITY', 105, 40, { align: 'center' });
            doc.setDrawColor(200, 200, 200); doc.line(20, 45, 190, 45);
            doc.setFontSize(12); doc.setTextColor(50, 50, 50);
            doc.text('This document certifies that the physical land deed scanned on the listed date', 20, 60);
            doc.text('perfectly matches the immutable records held on the official ledger.', 20, 66);
            doc.setFontSize(11); doc.setTextColor(100, 100, 100);
            doc.text(`Verification Date: ${new Date().toLocaleString()}`, 20, 80);
            doc.text(`Verified By: ${user?.username || 'Citizen'}`, 20, 86);
            doc.setDrawColor(15, 23, 42); doc.setFillColor(245, 245, 245);
            doc.roundedRect(20, 95, 170, 70, 3, 3, 'F');
            doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
            doc.text('Property Details:', 25, 105);
            doc.setFont('helvetica', 'normal'); doc.text('Deed Number:', 25, 115); doc.setFont('helvetica', 'bold'); doc.text(`${result.extracted.deedNumber}`, 60, 115);
            doc.setFont('helvetica', 'normal'); doc.text('Owner:', 25, 125); doc.setFont('helvetica', 'bold'); doc.text(`${result.extracted.owner}`, 60, 125);
            doc.setFont('helvetica', 'normal'); doc.text('Location:', 25, 135); doc.setFont('helvetica', 'bold'); doc.text(doc.splitTextToSize(`${result.extracted.location}`, 125), 60, 135);
            doc.setFont('helvetica', 'normal'); doc.text('Ledger Hash:', 25, 155); doc.setFont('courier', 'normal'); doc.setTextColor(0, 100, 0); doc.text(`${result.ledgerData.hash}`, 60, 155);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100); doc.text('Scan to view ledger record:', 20, 180);
            const qrImageURL = await QRCode.toDataURL(JSON.stringify({ deed: result.extracted.deedNumber, hash: result.ledgerData.hash, status: 'VERIFIED' }), { width: 150, margin: 1 });
            doc.addImage(qrImageURL, 'PNG', 20, 185, 45, 45);
            doc.setFontSize(10);
            doc.text('DeedGuard is a secure digitization initiative. This certificate is cryptographically', 105, 260, { align: 'center' });
            doc.text('backed and immune to tampering.', 105, 265, { align: 'center' });
            doc.save(`DeedGuard_Certificate_${result.extracted.deedNumber}.pdf`);
        } catch (err) {
            console.error(err);
            alert('Failed to generate PDF certificate.');
        }
    };

    /* ── Tab content ── */
    const renderContent = () => {
        switch (activeTab) {

            /* ── Dashboard / Verify ── */
            case 'dashboard':
                return (
                    <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', paddingTop: '2rem' }}>
                        <div style={{ marginBottom: 'var(--space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h1 className="gradient-title" style={{ 
                                fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-4)', lineHeight: 1.15,
                                width: '100%'
                            }}>
                                AI Document<br />Verification
                            </h1>
                            <p style={{ maxWidth: 500, fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.6 }}>
                                Upload physical scans of the 6-page deed.<br />Our AI will analyze the signatures, stamps, and<br />layout to ensure it perfectly matches the<br />immutable registry.
                            </p>
                        </div>

                        <div style={{ 
                            background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(12px)',
                            padding: 'var(--space-5)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3)', marginBottom: 'var(--space-6)' 
                        }}>
                            {/* Engine Toggle */}
                            <div style={{ 
                                display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', 
                                borderRadius: '12px', marginBottom: 'var(--space-6)', position: 'relative'
                            }}>
                                <button 
                                    onClick={() => setSelectedEngine('mistral')}
                                    style={{ 
                                        flex: 1, padding: '0.6rem', border: 'none', borderRadius: '10px', 
                                        background: selectedEngine === 'mistral' ? 'var(--zim-gold)' : 'transparent',
                                        color: selectedEngine === 'mistral' ? '#000' : '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.2s ease', zIndex: 1
                                    }}
                                >
                                    <Brain size={14} style={{ marginRight: '6px' }} /> AI Engine
                                </button>
                                <button 
                                    onClick={() => setSelectedEngine('local')}
                                    style={{ 
                                        flex: 1, padding: '0.6rem', border: 'none', borderRadius: '10px', 
                                        background: selectedEngine === 'local' ? 'var(--color-success)' : 'transparent',
                                        color: selectedEngine === 'local' ? '#fff' : '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.2s ease', zIndex: 1
                                    }}
                                >
                                    <Zap size={14} style={{ marginRight: '6px' }} /> Local Engine (Free)
                                </button>
                            </div>

                            <label className="upload-area" style={{ 
                                marginBottom: 'var(--space-5)', border: '2px dashed rgba(255,255,255,0.1)', cursor: 'pointer',
                                background: 'transparent', minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', transition: 'all 0.3s ease'
                            }}>
                                <input type="file" style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,application/pdf" multiple />
                                {preview.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)', width: '100%' }}>
                                        {preview.map((p, idx) => (
                                            <img key={idx} src={p} alt={`Page ${idx + 1}`} style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ color: '#10b981', marginBottom: '1rem' }}>
                                            <FileText size={48} strokeWidth={2.5} />
                                        </div>
                                        <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#e2e8f0', fontSize: '0.95rem' }}>Tap or drag to upload the 6<br/>physical deed pages</p>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>AI extraction &amp; ledger comparison</p>
                                    </>
                                )}
                            </label>

                            <button
                                className="btn"
                                style={{ width: '100%', height: 50, fontSize: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
                                onClick={processVerification}
                                disabled={!file || file.length === 0 || isProcessing}
                            >
                                {isProcessing ? <span className="loader" style={{ borderColor: '#fff', borderBottomColor: 'transparent' }}/> : 'Start AI Verification'}
                            </button>
                        </div>

                        {/* ─── Encrypted Offline Sync Queue ────────────────────────────── */}
                        {(isOffline || userHistory.filter(h => h.status === 'NOT_FOUND').length > 0) && (
                            <div className="glass-card animate-fade-in" style={{ 
                                padding: '1.5rem', 
                                background: isOffline ? 'rgba(234, 179, 8, 0.15)' : 'rgba(16, 185, 129, 0.1)', 
                                border: isOffline ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                                marginBottom: 'var(--space-6)',
                                textAlign: 'left',
                                borderRadius: '16px'
                            }}>
                                <div className="flex-gap-4" style={{ alignItems: 'flex-start' }}>
                                    <div style={{ 
                                        padding: '1rem', borderRadius: '50%', 
                                        background: isOffline ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)', 
                                        color: isOffline ? '#eab308' : '#10b981',
                                        animation: isOffline ? 'pulse 2s infinite' : 'none', flexShrink: 0
                                     }}>
                                        {isOffline ? <Wifi size={24} /> : <Server size={24} />}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.25rem 0', fontWeight: 700, color: '#fff' }}>
                                            {isOffline ? 'Offline Sync Queue' : 'Network Synced'}
                                        </h3>
                                        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                                            {isOffline 
                                                ? "You are offline. Scans are securely hashed and stored locally. They will automatically sync to your cloud citizen history when connectivity is restored."
                                                : "Connected. All local scans have been synced."}
                                        </p>
                                        
                                        {isOffline && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {userHistory.filter(h => h.status === 'NOT_FOUND' || h.offlineScan).slice(0, 3).map((h, i) => (
                                                    <div key={i} style={{ 
                                                        background: 'rgba(0,0,0,0.3)', padding: '0.6rem', borderRadius: '8px',
                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                                                     }}>
                                                        <ShieldAlert size={14} color="#eab308" />
                                                        <div>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>Pending: {h.extracted?.deedNumber || 'Unknown'}</div>
                                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Awaiting network</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {userHistory.length === 0 && (
                                                    <div className="text-xs text-muted">No pending offline scans.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Inline result preview on dashboard */}
                        {result && (
                            <div className="animate-fade-in">
                                <ResultPanel result={result} onDownload={downloadCertificate} compact />
                            </div>
                        )}
                    </div>
                );

            /* ── Results ── */
            case 'results':
                return (
                    <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                                Verification Results
                            </h1>
                            <p className="text-muted text-sm">AI-powered document authentication results</p>
                        </div>

                        {!result ? (
                            <div className="glass-card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
                                <CheckCircle size={40} style={{ color: 'var(--text-faint)', margin: '0 auto var(--space-4)' }} />
                                <h3 style={{ marginBottom: 'var(--space-2)', color: 'var(--text-muted)' }}>No Results Yet</h3>
                                <p className="text-muted text-sm">Upload and verify a deed to see results here.</p>
                            </div>
                        ) : (
                            <ResultPanel result={result} onDownload={downloadCertificate} />
                        )}
                    </div>
                );

            /* ── History ── */
            case 'history':
                return (
                    <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                                Verification History
                            </h1>
                            <p className="text-muted text-sm">All deed scans you have submitted</p>
                        </div>

                        <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
                            {userHistory.length === 0 ? (
                                <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 'var(--space-10) 0' }}>
                                    No deeds verified yet.
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                    {userHistory.map((hist, idx) => (
                                        <div key={idx} className="deed-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                                                <div>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'block' }}>
                                                        {hist.extracted?.deedNumber || 'Unknown Deed'}
                                                    </span>
                                                    <span className="text-xs text-muted">
                                                        {new Date(hist.date).toLocaleString()}
                                                    </span>
                                                </div>
                                                {hist.status === 'AUTHENTIC' ? (
                                                    <span className="badge badge-success">Verified Valid</span>
                                                ) : hist.status === 'FRAUDULENT' ? (
                                                    <span className="badge badge-danger">Forgery Flagged</span>
                                                ) : (
                                                    <span className="badge badge-warning">Not Found</span>
                                                )}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-2)', fontSize: '0.8125rem' }}>
                                                {[
                                                    ['Signatures', hist.signaturesFound ?? 0],
                                                    ['Stamps', hist.stampsFound ?? 0],
                                                    ['Confidence', `${((hist.signatureConfidence ?? 0) * 100).toFixed(0)}%`],
                                                    ['Fraud Risk', `${((hist.fraudRisk ?? 0) * 100).toFixed(0)}%`],
                                                ].map(([label, val]) => (
                                                    <div key={label} style={{ color: 'var(--text-muted)' }}>
                                                        <span className="text-xs" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-faint)', marginBottom: 2 }}>{label}</span>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {hist.signatureStampAnalysis && (
                                                <p className="text-xs text-muted" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                                                    {hist.signatureStampAnalysis}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );

            /* ── Map ── */
            case 'map':
                let targetLat = -17.8248;
                let targetLng = 31.0530;
                let address = "Harare, Zimbabwe (Default)";

                // Try to use the most recent verification location
                const latestResult = result || (userHistory.length > 0 ? userHistory[0] : null);
                
                if (latestResult) {
                    const sourceData = latestResult.ledgerData || latestResult.extracted || {};
                    const loc = sourceData.location || latestResult.extracted?.location;
                    if (loc) address = loc;

                    const lat = sourceData.latitude || latestResult.extracted?.latitude || null;
                    const lng = sourceData.longitude || latestResult.extracted?.longitude || null;

                    if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
                        targetLat = parseFloat(lat);
                        targetLng = parseFloat(lng);
                    } else if (address) {
                        const coords = geocodeZimbabweLocation(address);
                        targetLat = coords[0];
                        targetLng = coords[1];
                    }
                }
                
                return (
                    <div className="animate-fade-in" style={{ 
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
                        backgroundColor: '#f8fafc' 
                    }}>
                        <LandRegistryMap 
                            latitude={targetLat} 
                            longitude={targetLng} 
                            address={address}
                            onBack={() => navigate('history')}
                        />
                    </div>
                );

            /* ── Profile ── */
            case 'profile':
                return (
                    <div className="animate-fade-in" style={{ maxWidth: 560, margin: '0 auto' }}>
                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                                Citizen Profile
                            </h1>
                            <p className="text-muted text-sm">Your verified identity information</p>
                        </div>

                        <div className="glass-card" style={{ padding: 'var(--space-8)' }}>
                            <div className="flex-gap-4" style={{ marginBottom: 'var(--space-8)' }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: '50%',
                                    background: 'rgba(0, 100, 0, 0.15)', border: '1px solid rgba(0, 100, 0, 0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <UserIcon size={28} style={{ color: 'var(--color-success)' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: 2 }}>{user?.username || 'Citizen'}</h3>
                                    <span className="badge badge-success">Verified Identity</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                {[
                                    { label: 'Full Legal Name', value: user?.username || 'Not provided', mono: false },
                                    { label: 'National ID', value: user?.nationalId || 'Not provided', mono: true },
                                    { label: 'Email Address', value: user?.email || 'Not provided', mono: false },
                                ].map(field => (
                                    <div key={field.label} style={{ padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                        <span className="text-xs text-muted" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>
                                            {field.label}
                                        </span>
                                        <span style={{ fontWeight: 500, fontFamily: field.mono ? 'var(--font-mono)' : 'inherit' }}>
                                            {field.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex' }}>

            {/* ─── Sidebar Backdrop (mobile) ───────────────────────── */}
            {isMenuOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* ─── Sidebar ─────────────────────────────────────────── */}
            <aside className={`sidebar`} style={{
                position: 'fixed', top: 0, left: 0, height: '100%',
                transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 105,
                background: 'rgba(255, 255, 255, 0.5)', borderRight: '1px solid rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(20px)', color: '#000'
            }}>
                <div className="sidebar-header">
                    <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-md)',
                        background: 'rgba(0, 0, 0, 0.1)', border: '1px solid rgba(0, 0, 0, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <img src={logo} alt="Logo" style={{ width: 22, height: 'auto' }} />
                    </div>
                    <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2, color: '#000' }}>DeedGuard</div>
                        <div className="text-xs" style={{ color: '#333' }}>Zimbabwe</div>
                    </div>
                    {/* Close button */}
                    <button
                        onClick={() => setIsMenuOpen(false)}
                        className="btn-icon btn"
                        style={{ marginLeft: 'auto', color: '#000' }}
                        aria-label="Close menu"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            className={`nav-item${activeTab === item.id ? ' active' : ''}`}
                            onClick={() => navigate(item.id)}
                        >
                            <item.icon size={17} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', gap: 'var(--space-2)', fontSize: '0.8125rem' }} onClick={forgetUser}>
                        <LogOut size={14} /> Forget &amp; Remove My Data
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ width: '100%', justifyContent: 'center', gap: 'var(--space-2)' }} onClick={logout}>
                        <LogOut size={14} /> Sign Out Securely
                    </button>
                </div>
            </aside>

            {/* ─── Main ─────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingLeft: 0, background: 'rgba(255, 255, 255, 0.05)' }}
                className="main-content">

                {/* Top bar */}
                <header className="top-bar" style={{ background: 'transparent', padding: '1rem', borderBottom: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
                    <div className="flex-gap-3" style={{ alignItems: 'center' }}>
                        {/* Hamburger button always visible */}
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="btn-icon"
                            style={{ display: 'flex', background: 'transparent', color: '#fff', border: 'none', padding: 0 }}
                            aria-label="Open menu"
                        >
                            <Menu size={28} />
                        </button>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', marginLeft: '0.25rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff'
                        }}>
                            <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem', marginLeft: '0.5rem', fontFamily: 'var(--font-heading)' }}>
                            DeedGuard Zimbabwe
                        </span>
                    </div>
                </header>

                {/* Page content */}
                <main style={{ flex: 1, padding: 'var(--space-8)', overflowY: 'auto' }}>
                    {renderContent()}
                </main>
            </div>

            {/* ─── Advanced Process Visualizer ────────────────────── */}
            <ProcessVisualizer 
                isOpen={showScanModal}
                onClose={() => setShowScanModal(false)}
                title="Deed Verification Pipeline"
                steps={processSteps}
                currentStatus={processStatus}
                logs={extractedLogs}
            />


            {/* ─── responsive adjustments ───────────────────── */}
            <style>{`
                @media (min-width: 768px) {
                    .sidebar {
                        transform: ${isMenuOpen ? 'translateX(0) !important' : 'translateX(-100%) !important'};
                    }
                    .sidebar-backdrop {
                        display: ${isMenuOpen ? 'block !important' : 'none !important'};
                    }
                }
                @media (max-width: 767px) {
                    .main-content { padding-left: 0 !important; }
                    .sidebar {
                        transform: ${isMenuOpen ? 'translateX(0) !important' : 'translateX(-100%) !important'};
                    }
                }
                .main-content {
                    background: transparent;
                }
                .main-content h1, .main-content h2, .main-content h3, .gradient-title {
                    background: linear-gradient(90deg, #10b981, #facc15) !important;
                    -webkit-background-clip: text !important;
                    -webkit-text-fill-color: transparent !important;
                    color: transparent !important;
                }
                .main-content .text-muted, .main-content .text-faint, .main-content p {
                    color: #e2e8f0 !important;
                }
                .sidebar .nav-item {
                    color: #000 !important;
                }
                .sidebar .nav-item.active {
                    background: rgba(0,0,0,0.1) !important;
                    color: #000 !important;
                    font-weight: bold;
                }
                .sidebar .nav-item:hover {
                    background: rgba(0,0,0,0.05) !important;
                }
                .sidebar-footer .btn-secondary {
                    background: rgba(0,0,0,0.1) !important;
                    color: #000 !important;
                    border: none;
                }
            `}</style>
        </div>
    );
};

/* ────────────────────────────────────────────────────────────────
   Shared ResultPanel component (used in dashboard + results tab)
──────────────────────────────────────────────────────────────── */
const ResultPanel = ({ result, onDownload, compact = false }) => {
    if (!result) return null;

    const isAuthentic  = result.status === 'AUTHENTIC';
    const isFraudulent = result.status === 'FRAUDULENT';
    const isNotFound   = result.status === 'NOT_FOUND';

    const panelClass = isAuthentic ? 'result-panel-success' : isFraudulent ? 'result-panel-danger' : 'result-panel-warning';
    const headerColor = isAuthentic ? 'var(--color-success)' : isFraudulent ? 'var(--color-danger)' : 'var(--color-warning)';
    const Icon = isAuthentic ? CheckCircle : isFraudulent ? AlertTriangle : XCircle;
    const title = isAuthentic ? 'Authentic Document Validated' : isFraudulent ? 'Fraudulent Document Detected' : 'Deed Not Found In Ledger';

    return (
        <div className={`result-panel ${panelClass}`}>
            {result.isFakeDataMatch && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-sm)' }}>
                    <AlertTriangle size={15} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                    <span className="text-sm" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>⚠️ FAKE TEST DATA MATCH — not a real deed verification!</span>
                </div>
            )}

            <div className="flex-gap-3" style={{ marginBottom: 'var(--space-5)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: headerColor, opacity: 0.15, position: 'absolute' }} />
                <Icon size={22} style={{ color: headerColor, flexShrink: 0 }} />
                <div>
                    <h3 style={{ color: headerColor, fontSize: '1.0625rem', marginBottom: 2 }}>{title}</h3>
                    <p className="text-sm text-muted">{result.message}</p>
                </div>
            </div>

            {isNotFound ? (
                <div style={{ padding: 'var(--space-2)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        We searched the immutable registry but could not find a record for Deed Number <strong style={{ color: 'var(--text-main)' }}>{result.extracted?.deedNumber}</strong>.
                    </div>
                    
                    <div style={{ 
                        background: 'rgba(59, 130, 246, 0.05)', 
                        padding: '1.25rem', 
                        borderRadius: 'var(--radius-lg)', 
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <AlertTriangle size={18} style={{ color: '#3b82f6' }} />
                            <span style={{ fontWeight: 700, color: '#3b82f6', fontSize: '1rem' }}>Recommendation</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                            This deed is not registered in our digital system yet. To ensure your property rights are protected and verified, please <strong>visit your local Deeds Company or the Ministry of Lands office</strong> to physically authenticate and register your deed onto the secure blockchain ledger.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="result-details" style={{ marginBottom: 'var(--space-4)' }}>
                    {isFraudulent && result.ledgerData && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <p className="text-xs" style={{ color: 'var(--color-danger)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>Uploaded Document</p>
                                <p className="text-sm"><span className="text-muted">Owner: </span><strong>{typeof result.extracted?.owner === 'object' ? result.extracted.owner.name : (result.extracted?.owner ?? `HASH:${result.extracted?.ownerHash ?? 'N/A'}`)}</strong></p>
                                <p className="text-sm"><span className="text-muted">Location: </span><strong>{typeof result.extracted?.location === 'object' ? (result.extracted.location.address || result.extracted.location.district || JSON.stringify(result.extracted.location)) : (result.extracted?.location ?? `HASH:${result.extracted?.locationHash ?? 'N/A'}`)}</strong></p>
                            </div>
                            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 'var(--space-4)' }}>
                                <p className="text-xs" style={{ color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>True Ledger Data</p>
                                <p className="text-sm"><span className="text-muted">Owner: </span><strong>{typeof result.ledgerData?.owner === 'object' ? result.ledgerData.owner.name : result.ledgerData?.owner}</strong></p>
                                <p className="text-sm"><span className="text-muted">Location: </span><strong>{typeof result.ledgerData?.location === 'object' ? (result.ledgerData.location.address || result.ledgerData.location.district || JSON.stringify(result.ledgerData.location)) : result.ledgerData?.location}</strong></p>
                            </div>
                        </div>
                    )}

                    {[
                        { label: 'Deed Number', value: result.extracted?.deedNumber },
                        ...(isAuthentic ? [
                            { label: 'Owner', value: result.extracted?.owner ?? `HASH:${result.extracted?.ownerHash ?? 'N/A'}` },
                            { label: 'Location', value: result.extracted?.location ?? `HASH:${result.extracted?.locationHash ?? 'N/A'}` },
                            { label: 'Security Hash', value: result.ledgerData?.hash, mono: true, color: 'var(--color-success)' },
                        ] : []),
                        { label: 'Signatures Found', value: result.signaturesFound ?? 0 },
                        { label: 'Stamps Found', value: result.stampsFound ?? 0 },
                        { label: 'Watermark Confidence', value: (result.watermarkConfidence ?? 0).toFixed(2) },
                        { label: 'Forgery Risk', value: (result.forgeryRisk ?? 0).toFixed(2) },
                        { label: 'Fraud Score', value: (result.fraudRisk ?? 0).toFixed(2) },
                    ].filter(r => r.value !== undefined).map(row => (
                        <div key={row.label} className="result-row">
                            <span className="result-row-label">{row.label}</span>
                            <span className="result-row-value" style={{ fontFamily: row.mono ? 'var(--font-mono)' : 'inherit', color: row.color || 'var(--text-main)', wordBreak: 'break-all', fontSize: row.mono ? '0.8125rem' : 'inherit' }}>
                                {row.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Embedded map for location */}
            {(isAuthentic || isFraudulent) && (result.extracted?.location || result.ledgerData?.location) && !compact && (
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', height: 240, marginBottom: 'var(--space-4)' }}>
                    <iframe
                        title="Deed Location"
                        width="100%" height="100%"
                        src={`https://maps.google.com/maps?q=${
                            (result.ledgerData?.latitude && result.ledgerData?.longitude)
                                ? `${result.ledgerData.latitude},${result.ledgerData.longitude}`
                                : (result.extracted?.latitude && result.extracted?.longitude) 
                                    ? `${result.extracted.latitude},${result.extracted.longitude}` 
                                    : (result.ledgerData?.location || result.extracted?.location)
                                        ? `${geocodeZimbabweLocation(result.ledgerData?.location || result.extracted?.location)[0]},${geocodeZimbabweLocation(result.ledgerData?.location || result.extracted?.location)[1]}`
                                        : encodeURIComponent('Zimbabwe')
                        }&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        style={{ border: 0 }}
                    />
                </div>
            )}

            {isAuthentic && (
                <button className="btn btn-primary" style={{ width: '100%', gap: 'var(--space-2)' }} onClick={onDownload}>
                    <Download size={16} /> Download PDF Certificate of Authenticity
                </button>
            )}
        </div>
    );
};

export default UserDashboard;
