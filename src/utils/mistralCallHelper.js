/**
 * Helper function to call Mistral AI via their official API.
 * Uses the same retry logic and 60s timeout as the Gemini helper.
 */

export const callMistral = async (apiKey, prompt, updateStatus = () => {}, maxRetries = 3) => {
    let lastError;
    const TIMEOUT_MS = 60000;
    const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

    for (let currentRetry = 0; currentRetry <= maxRetries; currentRetry++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            if (currentRetry > 0) {
                const waitTime = Math.pow(2, currentRetry - 1) * 5000;
                updateStatus(`Mistral busy. Waiting ${waitTime/1000}s... (Attempt ${currentRetry}/${maxRetries})`);
                await new Promise(r => setTimeout(r, waitTime));
            }

            const response = await fetch(MISTRAL_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'mistral-small-latest',
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: 'json_object' }
                }),
                signal: controller.signal
            });

            clearTimeout(timer);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Mistral API Error (${response.status}): ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (err) {
            clearTimeout(timer);
            lastError = err;

            const isTransient = err.name === 'AbortError' || 
                               err.message.includes('503') || 
                               err.message.includes('429');

            if (!isTransient || currentRetry === maxRetries) {
                throw err;
            }
            
            updateStatus(`Mistral transient error. Retrying ${currentRetry + 1}/${maxRetries}...`);
        }
    }
    throw lastError;
};
