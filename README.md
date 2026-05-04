# DeedGuard Zimbabwe: Blockchain-Powered Land Deed Verification

DeedGuard Zimbabwe is an advanced digital security ecosystem designed to protect land tenure through AI-driven digitization and blockchain-backed immutable verification. The system converts legacy paper deeds into secure digital assets while detecting forgeries with forensic precision.

## 🚀 Verification Process Flow & Technologies

The DeedGuard pipeline consists of six critical stages, each utilizing specialized technologies to ensure document integrity.

### 1. AI Engine Initialization & Handshake
*   **Action**: The system establishes secure connections with the AI infrastructure and prepares the local environment.
*   **Technologies**:
    *   **React Context API**: For managing session state and API credentials.
    *   **Google Generative AI SDK / Mistral API**: Establishing the cloud-brain handshake.

### 2. Document OCR & Normalization
*   **Action**: The uploaded scan is pre-processed for clarity and then converted into machine-readable text.
*   **Technologies**:
    *   **Tesseract.js**: Performs local, client-side Optical Character Recognition (OCR) to maintain privacy.
    *   **HTML5 Canvas API**: Handles image normalization (rescaling, grayscale conversion, and thresholding) to improve OCR accuracy.

### 3. Multi-Modal Vision & Semantic Extraction
*   **Action**: The AI "reads" the document to extract critical legal metadata (Deed Numbers, Owners, Locations, and Dates).
*   **Technologies**:
    *   **Mistral-7B / Gemini 1.5 Pro**: Advanced Large Language Models (LLMs) used for semantic parsing of complex legal jargon.
    *   **Few-Shot Prompt Engineering**: Custom heuristic prompts designed specifically for the Zimbabwe Deeds Office format.

### 4. Forensic Visual Analysis
*   **Action**: The system looks "between the pixels" to detect microscopic anomalies that suggest forgery.
*   **Technologies**:
    *   **Custom JavaScript Forensic Modules**: 
        *   **Sobel Edge Detection**: For validating the geometry of registrar stamps.
        *   **Density Analysis**: For verifying the bit-depth and flow of hand-written signatures.
        *   **Watermark Contrast Scanning**: Detects digital "cut-and-paste" artifacts.

### 5. Blockchain Ledger Matching
*   **Action**: The document's unique cryptographic fingerprint is cross-referenced against the immutable national registry.
*   **Technologies**:
    *   **SHA-256 Cryptographic Hashing**: Generates a unique 64-character identifier for the document contents.
    *   **Firebase Firestore**: Acts as a decentralized, immutable ledger mock for real-time verification and synchronization.

### 6. Results & Spatial Mapping
*   **Action**: Final results are displayed with a high-fidelity 3D process visualization and property location pinpointing.
*   **Technologies**:
    *   **CSS 3D Transforms**: Powers the interactive "Security Operations Center" (SOC) visualizer.
    *   **Google Maps API**: Renders the property location based on AI-extracted coordinates or geocoded fallback data.
    *   **jsPDF**: Generates a secure, downloadable Verification Certificate for the user.

---

## 🛠 Installation & Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/DeedGuardZimbabwe.git
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Configuration**:
    Create a `.env` file and add your API keys:
    ```env
    VITE_GEMINI_API_KEY=your_key
    VITE_MISTRAL_API_KEY=your_key
    ```
4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## 🛡 Security Note
DeedGuard Zimbabwe prioritizes **Privacy-by-Design**. All sensitive personal information is hashed locally before being processed by the AI layer, ensuring that the cloud engines only see legal metadata without compromising the owner’s full identity.
