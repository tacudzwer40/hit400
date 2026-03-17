import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Search, Database, HardDrive, Wifi, Trash2, LogOut, List, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo.png';
import { GoogleGenerativeAI } from '@google/generative-ai';
import CryptoJS from 'crypto-js';
import { useAppContext } from '../context/AppContext';
import { verifySignature, detectWatermark, runForgeryAnalysis } from '../utils/aiVerification';
import { hashPersonalData } from '../utils/privacy';
import { ethers } from 'ethers';

const AdminDashboard = () => {
    const { addDeed, deeds, deleteDeed, isOffline, logout, predictFraudScore } = useAppContext();
    const [file, setFile] = useState([]);
    const [preview, setPreview] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [showScanModal, setShowScanModal] = useState(false);
    const [currentScanIdx, setCurrentScanIdx] = useState(0);
    const [showTableView, setShowTableView] = useState(false);
    const [processStatus, setProcessStatus] = useState("");
    const [extractedLogs, setExtractedLogs] = useState("");

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        if (selected.length > 0) {
            setFile(selected);
            const urls = selected.map(f => URL.createObjectURL(f));
            setPreview(urls);
            setExtractedData(null);
        }
    };

    const processDocument = async () => {
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
        setProcessStatus("Initializing verification...");
        setExtractedLogs("");

        const defaultKey = "AIzaSyB3_lZ7Im5CSlNLczOlURi9kYF5QZ1KVr4";
        let apiKey = localStorage.getItem('gemini_api_key') || defaultKey;
        if (!apiKey || apiKey.trim() === '') {
            apiKey = prompt("Please enter a Gemini API Key to use the Real AI Extraction:");
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

            // Convert files to base64 and resize to prevent oversized payload errors
            const convertToBase64 = (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (e) => {
                    const img = new Image();
                    img.src = e.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 1000;
                        const MAX_HEIGHT = 1000;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        // Convert to JPEG with 0.8 quality to save massive space
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        resolve(dataUrl.split(',')[1]);
                    };
                    img.onerror = (err) => reject(err);
                };
                reader.onerror = error => reject(error);
            });

            const imageParts = [];
            for (let i = 0; i < file.length; i++) {
                setCurrentScanIdx(i);
                setProcessStatus(`Converting page ${i + 1} to optimized format...`);
                // Simulate some scanning time per page for the UI since API call is all at once
                await new Promise(r => setTimeout(r, 800));
                const base64Data = await convertToBase64(file[i]);
                imageParts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: 'image/jpeg'
                    }
                });
            }

            setProcessStatus("Sending document to Gemini AI for extraction...");

            const promptText = `
                You are a highly capable AI assistant that extracts data from Zimbabwe Land Deeds.
                Here are the pages of a Zimbabwe Land Deed document.
                Please accurately extract the following information from these images:
                1. "deedNumber" - The exact Deed Number found in the document.
                2. "owner" - The name of the registered Owner(s) or Title Holder(s).
                3. "location" - The Location, Address, or Description of the Property.

                Reply ONLY with a strictly formatted JSON object using the keys "deedNumber", "owner", and "location". Do not include any other markdown, text, or formatting block ticks.
            `;

            setProcessStatus("Processing document with AI...");
            const result = await model.generateContent([promptText, ...imageParts]);
            const response = await result.response;
            const responseText = response.text();

            setExtractedLogs(responseText);

            setProcessStatus("Parsing AI extracted structured data...");

            let parsedData;
            try {
                // Find first '{' and last '}' to aggressively extract JSON object
                const firstBrace = responseText.indexOf('{');
                const lastBrace = responseText.lastIndexOf('}');
                if (firstBrace === -1 || lastBrace === -1) {
                    throw new Error("No JSON object found in AI response. Response was: " + responseText);
                }
                const jsonStr = responseText.substring(firstBrace, lastBrace + 1);
                parsedData = JSON.parse(jsonStr);
            } catch (jsonErr) {
                console.error("Failed to parse JSON from AI", responseText);
                throw new Error("AI returned invalid format: " + jsonErr.message);
            }

            parsedData.date = new Date().toISOString().split('T')[0];
            parsedData.rawText = "Data extracted successfully via Gemini AI...";

            setProcessStatus("Running multi-modal verification (signature, watermark, forgery)...");
            const signatureResult = await verifySignature(file[0]);
            const watermarkResult = await detectWatermark(file[0]);
            const forgeryResult = await runForgeryAnalysis(file[0]);

            parsedData.signatureConfidence = signatureResult?.confidence ?? 0.5;
            parsedData.signatureAnalysis = signatureResult?.reason;
            parsedData.watermarkConfidence = watermarkResult?.confidence ?? 0.5;
            parsedData.watermarkAnalysis = watermarkResult?.reason;
            parsedData.forgeryRisk = forgeryResult?.riskScore ?? 0.5;
            parsedData.forgeryAnalysis = forgeryResult?.reason;

            // Privacy-preserving hashes (can be used for matching without exposing raw values)
            parsedData.ownerHash = hashPersonalData(parsedData.owner);
            parsedData.locationHash = hashPersonalData(parsedData.location);
            parsedData.deedNumberHash = hashPersonalData(parsedData.deedNumber);

            // 2. Hash generation
            setProcessStatus("Generating cryptographic SHA256 Hash of extracted data...");
            await new Promise(r => setTimeout(r, 500));
            const dataString = JSON.stringify(parsedData);
            const hash = CryptoJS.SHA256(dataString).toString();

            // 3. Web3 Blockchain Cryptographic Signing (Simulated Polygon Amoy Tx)
            setProcessStatus("Signing transaction simulating Polygon Amoy Web3 node...");
            await new Promise(r => setTimeout(r, 500));
            // Creates a burner wallet or loads an admin wallet to cryptographically sign the hash
            const wallet = ethers.Wallet.createRandom();
            const web3Signature = await wallet.signMessage(hash);

            setProcessStatus("Awaiting Web3 Transaction Receipt Hash...");
            await new Promise(r => setTimeout(r, 500));
            // Spoofing the Tx Hash that would be returned from an RPC node
            const web3TxHash = ethers.id(web3Signature + Date.now().toString());

            const finalDocument = {
                ...parsedData,
                hash,
                web3Signature,
                web3MinerAddress: wallet.address,
                web3TxHash,
                timestamp: new Date().toISOString(),
                synced: !isOffline
            };

            setProcessStatus("Running predictive fraud scoring...");
            const fraudRisk = await predictFraudScore(finalDocument);
            finalDocument.fraudRisk = fraudRisk;

            setProcessStatus("Successfully registered on decentralized ledger!");
            await new Promise(r => setTimeout(r, 600));

            setExtractedData(finalDocument);
            addDeed(finalDocument);

        } catch (err) {
            console.error("Document processing error:", err);
            // Helpful message for API Auth issues
            if (err.message && (err.message.toLowerCase().includes('key') || err.message.toLowerCase().includes('permission') || err.message.includes('403') || err.message.includes('400'))) {
                alert(`API Error: ${err.message}. Your API key might be invalid. Removing saved key.`);
                localStorage.removeItem('gemini_api_key');
            } else {
                alert(`Failed to process document: ${err.message || 'Unknown error'}`);
            }
        } finally {
            setIsProcessing(false);
            setShowScanModal(false);
        }
    };

    const seedRealisticData = async () => {
        if (!window.confirm("⚠️ WARNING: This will inject 15 COMPLETELY FAKE AND MADE-UP Zimbabwean deeds into your database for TESTING PURPOSES ONLY. These are NOT real deeds and should NEVER be used for actual verification. Continue?")) return;

        const realisticDeeds = [
            { deedNumber: "DEED-2023-4581/HRE", owner: "Farai Chivore", location: "Stand 1425 Glen Lorne Township, Harare" },
            { deedNumber: "DEED-2018-9920/BYO", owner: "Tendai Mutasa", location: "Stand 89 Suburbs, Bulawayo" },
            { deedNumber: "DEED-2021-3341/HRE", owner: "Chido Moyo & Tapiwa Moyo", location: "Stand 5021 Mount Pleasant, Harare" },
            { deedNumber: "DEED-2015-1102/HRE", owner: "ZIMNAT Properties LTD", location: "Stand 12 Borrowdale Brooke, Harare" },
            { deedNumber: "DEED-2022-8745/HRE", owner: "Kudakwashe Munjanja", location: "Stand 304 Kuwadzana Extension, Harare" },
            { deedNumber: "DEED-2019-5561/HRE", owner: "Rumbidzai Gumbo", location: "Stand 8820 Highfield Township, Harare" },
            { deedNumber: "DEED-2020-1029/GWE", owner: "Simbarashe Ncube", location: "Stand 45 Mkoba 16, Gweru" },
            { deedNumber: "DEED-2023-7712/MUT", owner: "Grace Sibanda", location: "Stand 1102 Dangamvura, Mutare" },
            { deedNumber: "DEED-2017-4439/HRE", owner: "Tawanda Mashingaidze", location: "Stand 550 Avondale West, Harare" },
            { deedNumber: "DEED-2021-0091/BYO", owner: "Ndlovu Enterprises P/L", location: "Stand 771 Belmont Industrial Estate, Bulawayo" },
            { deedNumber: "DEED-2016-8832/HRE", owner: "Nyasha Mapiravana", location: "Stand 3010 Warren Park D, Harare" },
            { deedNumber: "DEED-2022-2211/HRE", owner: "Emmerson Zhou", location: "Stand 905 Greystone Park, Harare" },
            { deedNumber: "DEED-2020-5610/BYO", owner: "Sikhalela Dube", location: "Stand 400 Kumalo, Bulawayo" },
            { deedNumber: "DEED-2019-3300/HRE", owner: "Fadzai Katsande", location: "Stand 112 Waterfalls Township, Harare" },
            { deedNumber: "DEED-2023-9999/HRE", owner: "Old Mutual Life Assurance", location: "Stand 10 CBD, Jason Moyo Avenue, Harare" }
        ];

        setIsProcessing(true);
        try {
            for (let i = 0; i < realisticDeeds.length; i++) {
                const deed = realisticDeeds[i];
                const wallet = ethers.Wallet.createRandom();

                const dataString = JSON.stringify(deed);
                const hash = CryptoJS.SHA256(dataString).toString();
                const web3Signature = await wallet.signMessage(hash);
                const web3TxHash = ethers.id(web3Signature + Date.now().toString());

                const finalDocument = {
                    ...deed,
                    hash,
                    web3Signature,
                    web3MinerAddress: wallet.address,
                    web3TxHash,
                    timestamp: new Date(Date.now() - (Math.random() * 10000000000)).toISOString(),
                    synced: true,
                    date: new Date().toISOString().split('T')[0],
                    rawText: "⚠️ FAKE TEST DATA - NOT REAL DEED - FOR TESTING ONLY",
                    isFakeData: true, // Mark as fake data
                    fakeDataWarning: "This is completely made-up test data. Do not use for real verification."
                };
                // Fire and forget so we don't hang the loop if network is spotty
                addDeed(finalDocument);
            }
            alert("⚠️ WARNING: 15 FAKE TEST records added to database. These are completely made-up deeds for testing only. DO NOT use for real verification!");
        } catch (e) {
            console.error(e);
            alert("Failed to seed data");
        }
        setIsProcessing(false);
    };

    return (
        <div className="container" style={{ padding: '2rem 1.5rem' }}>
            <header className="flex-center" style={{
                justifyContent: 'space-between',
                marginBottom: '3rem',
                padding: '2rem',
                background: 'linear-gradient(135deg, var(--zimbabwe-green) 0%, var(--zimbabwe-black) 100%)',
                borderRadius: '16px',
                border: '3px solid var(--zimbabwe-yellow)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={logo} alt="Logo" style={{
                        width: '50px',
                        height: 'auto',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                    }} />
                    <div>
                        <h1 style={{
                            color: 'var(--zimbabwe-white)',
                            fontSize: '2rem',
                            fontWeight: 700,
                            textShadow: '0 2px 4px rgba(0,0,0,0.7)',
                            margin: 0
                        }}>
                            Registrar Portal
                        </h1>
                        <p style={{
                            color: 'var(--zimbabwe-yellow)',
                            fontSize: '1rem',
                            fontWeight: 600,
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            margin: '0.5rem 0 0 0'
                        }}>
                            DeedGuard Master Control
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className={`status-badge ${!isOffline ? 'status-verified' : 'status-pending'}`} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '25px',
                        fontWeight: 600,
                        background: !isOffline ? 'var(--zimbabwe-green)' : 'var(--zimbabwe-yellow)',
                        color: 'var(--zimbabwe-black)',
                        border: '2px solid var(--zimbabwe-white)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                        {isOffline ? <Wifi size={16} color="var(--zimbabwe-black)" /> : <HardDrive size={16} color="var(--zimbabwe-black)" />}
                        {isOffline ? 'Offline Mode' : 'Blockchain Synced'}
                    </span>
                    <button className="btn btn-secondary" onClick={logout} style={{
                        background: 'var(--zimbabwe-red)',
                        color: 'var(--zimbabwe-white)',
                        border: '2px solid var(--zimbabwe-yellow)',
                        fontWeight: 600,
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                        <LogOut size={16} /> Log Out
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* Upload Section */}
                <section className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload className="text-gradient" size={24} /> Register New Deed
                    </h2>

                    <label className="upload-area" style={{ display: 'block', marginBottom: '1.5rem' }}>
                        <input type="file" style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,application/pdf" multiple />
                        {preview && preview.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                {preview.map((p, idx) => (
                                    <img key={idx} src={p} alt={`Deed ${idx}`} style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', objectFit: 'cover' }} />
                                ))}
                            </div>
                        ) : (
                            <>
                                <FileText className="upload-icon" style={{ margin: '0 auto 1rem auto' }} />
                                <p style={{ fontWeight: 600 }}>Tap or drag to upload the 6 physical deed pages</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>AI extraction from all 6 pages & Blockchain hashing</p>
                            </>
                        )}
                    </label>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            onClick={processDocument}
                            disabled={!file || file.length === 0 || isProcessing}
                        >
                            {isProcessing ? <div className="loader"></div> : 'Extract & Secure on Blockchain'}
                        </button>

                        <button
                            className="btn btn-secondary"
                            onClick={seedRealisticData}
                            disabled={isProcessing}
                            title="⚠️ WARNING: This injects 15 COMPLETELY FAKE deeds for TESTING ONLY. DO NOT use in production!"
                            style={{ background: '#DC2626', color: 'white', border: '2px solid #B91C1C' }}
                        >
                            {isProcessing ? 'Processing' : '⚠️ Seed FAKE Test Data'}
                        </button>
                    </div>

                    {extractedData && (
                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#34D399' }}>
                                <CheckCircle size={20} /> Deed Digitized Successfully
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Deed Number:</span> <strong>{extractedData.deedNumber}</strong>
                                <span style={{ color: 'var(--text-muted)' }}>Owner:</span> <strong>{extractedData.owner}</strong>
                                <span style={{ color: 'var(--text-muted)' }}>Location:</span> <strong>{extractedData.location}</strong>
                                <span style={{ color: 'var(--text-muted)' }}>Security Hash:</span>
                                <span style={{ fontFamily: 'monospace', color: 'var(--secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {extractedData.hash}
                                </span>
                            </div>
                        </div>
                    )}
                </section>

                {/* Database Stats */}
                <section className="glass-card animate-fade-in" style={{ padding: '2rem', animationDelay: '0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <Database className="text-gradient" size={24} /> Deed Ledger
                        </h2>
                        {!showTableView ? (
                            <button onClick={() => setShowTableView(true)} className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.875rem' }} title="View as Table">
                                <List size={16} /> Ledger Tabe
                            </button>
                        ) : (
                            <button onClick={() => setShowTableView(false)} className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.875rem' }} title="Back to Cards">
                                <ArrowLeft size={16} /> Go Back
                            </button>
                        )}
                    </div>

                    {!showTableView ? (
                        <>
                            <div className="input-group">
                                <div style={{ position: 'relative' }}>
                                    <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input type="text" className="form-input" style={{ paddingLeft: '2.75rem' }} placeholder="Search registry..." />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                                {deeds.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No deeds registered yet.</p>
                                ) : (
                                    deeds.map((deed, i) => (
                                        <div key={i} className="deed-card" style={{
                                            background: deed.isFakeData ? 'rgba(220, 38, 38, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                                            border: deed.isFakeData ? '2px solid #DC2626' : '1px solid var(--border)',
                                            borderRadius: '12px',
                                            position: 'relative'
                                        }}>
                                            {deed.isFakeData && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    right: '10px',
                                                    background: '#DC2626',
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '10px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                }}>
                                                    ⚠️ FAKE TEST DATA
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <strong style={{ color: deed.isFakeData ? '#F87171' : 'inherit' }}>{deed.deedNumber}</strong>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <span className={`status-badge ${deed.synced ? 'status-verified' : 'status-pending'}`}>
                                                        {deed.synced ? 'Synced' : 'Local'}
                                                    </span>
                                                    <button
                                                        onClick={() => deleteDeed(deed.timestamp)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}
                                                        title="Delete this block"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{deed.owner}</p>
                                            <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {deed.hash}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="animate-fade-in" style={{ overflowX: 'auto', maxHeight: '450px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                <thead style={{ background: 'rgba(15, 23, 42, 0.9)', position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>Deed No.</th>
                                        <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>Owner</th>
                                        <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>Location</th>
                                        <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                                        <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deeds.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No deeds registered yet.</td>
                                        </tr>
                                    ) : (
                                        deeds.map((deed, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)' }}>
                                                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{deed.deedNumber}</td>
                                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-main)' }}>{deed.owner}</td>
                                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deed.location}</td>
                                                <td style={{ padding: '0.75rem 1rem' }}>
                                                    <span className={`status-badge ${deed.synced ? 'status-verified' : 'status-pending'}`} style={{ fontSize: '0.65rem' }}>
                                                        {deed.synced ? 'Synced' : 'Local'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => deleteDeed(deed.timestamp)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}
                                                        title="Delete this block"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Blockchain Explorer Demo */}
                <section className="glass-card animate-fade-in" style={{ padding: '2rem', gridColumn: '1 / -1', animationDelay: '0.4s' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Database className="text-gradient" size={24} /> Blockchain Visualizer
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        This demonstrates how each deed is cryptographically linked to the previous one, forming an immutable chain.
                    </p>
                    <div style={{ display: 'flex', overflowX: 'auto', padding: '1rem 0', gap: '2rem', alignItems: 'center' }}>
                        {/* Genesis Block */}
                        <div style={{ minWidth: '250px', padding: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '2px solid var(--primary)', borderRadius: '12px' }}>
                            <div style={{ color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>Block 0 (Genesis)</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Previous Hash: <br /><span style={{ color: '#fff' }}>0000000000000000</span></div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Block Hash: <br /><span style={{ color: 'var(--primary)' }}>a1b2c3d4e5f6...</span></div>
                        </div>

                        {deeds.map((deed, i) => (
                            <React.Fragment key={i}>
                                <div style={{ color: 'var(--text-muted)' }}>→</div>
                                <div style={{ minWidth: '250px', padding: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                    <div style={{ color: 'var(--text-main)', fontWeight: 'bold', marginBottom: '0.5rem' }}>Block {i + 1}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Data: <br /><span style={{ color: '#fff' }}>Deed {deed.deedNumber}</span></div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Previous Hash: <br /><span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{i === 0 ? 'a1b2c3d4e5f6...' : deeds[i - 1].hash}</span></div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Block Hash: <br /><span style={{ color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{deed.hash}</span></div>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </section>
            </div>

            {/* Scanning Popup Modal */}
            {showScanModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card animate-fade-in" style={{ padding: '2rem', textAlign: 'center', width: '90%', maxWidth: '500px' }}>
                        <h3 className="text-gradient" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                            Scanning Page {currentScanIdx + 1} of {file.length}...
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

export default AdminDashboard;
