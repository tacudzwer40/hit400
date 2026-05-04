/**
 * Helper function to call Gemini AI with exponential backoff retry logic for transient errors (503, 429).
 * Includes a mandatory 60-second timeout per attempt.
 * @param {Object} model - The Gemini model instance.
 * @param {Array|String} promptData - The content to send to the model.
 * @param {Function} updateStatus - Callback to update UI status messages.
 * @param {number} maxRetries - Maximum number of retry attempts (default 3).
 * @returns {Promise<Object>} - The AI response.
 */
export const callGeminiWithRetry = async (model, promptData, updateStatus = () => {}, maxRetries = 3) => {
    let lastError;
    const TIMEOUT_MS = 60000; // 1 minute timeout per attempt
    
    for (let currentRetry = 0; currentRetry <= maxRetries; currentRetry++) {
        let timer;
        try {
            if (currentRetry > 0) {
                // Slightly longer backoff for 'high demand' (503): 5s, 10s, 20s
                const waitTime = Math.pow(2, currentRetry - 1) * 5000;
                const statusMsg = `System under high demand (503/429). Waiting ${waitTime/1000}s... (Attempt ${currentRetry}/${maxRetries})`;
                updateStatus(statusMsg);
                console.warn(`[AI Retry] ${statusMsg}`);
                await new Promise(r => setTimeout(r, waitTime));
            }
            
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                timer = setTimeout(() => {
                    reject(new Error('TIMEOUT_ERROR: Request took longer than 60s. Terminated.'));
                }, TIMEOUT_MS);
            });

            // Race the AI call against the timeout
            const result = await Promise.race([
                model.generateContent(promptData),
                timeoutPromise
            ]);
            
            if (timer) clearTimeout(timer);
            return result;

        } catch (err) {
            if (timer) clearTimeout(timer);
            lastError = err;
            const errorMsg = err.message || '';
            
            // Check for transient errors: 503 Service Unavailable, 429 Too Many Requests, or "high demand" string
            const isTimeout = errorMsg.includes('TIMEOUT_ERROR');
            const isTransient = errorMsg.includes('503') || 
                               errorMsg.includes('429') || 
                               errorMsg.toLowerCase().includes('high demand') ||
                               errorMsg.toLowerCase().includes('overloaded');
            
            if ((!isTransient && !isTimeout) || currentRetry === maxRetries) {
                console.error(`[AI Error] ${isTimeout ? 'Timeout' : 'Final failure'} after ${currentRetry} retries:`, err);
                throw err;
            }
            
            const retryLog = `[AI Retry] ${isTimeout ? 'Timeout' : 'Transient error (503)'} detected. Preparing retry ${currentRetry + 1}/${maxRetries}...`;
            console.warn(retryLog);
            updateStatus(isTimeout ? 'Connection timeout. Retrying...' : 'AI busy (High Demand). Retrying...');
        }
    }
    
    throw lastError;
};


