// background.js - 支持多提供商的后台服务 (Enhanced Version)

// --- 初始化与安装 ---
chrome.runtime.onInstalled.addListener(() => {
    console.log("LLM-Translate 插件已安装或更新。");

    // 创建右键菜单
    createContextMenus();

    // 设置初始默认值，仅当它们不存在时
    chrome.storage.local.get(null, (items) => {
        const defaults = {
            activeProvider: 'gemini',
            geminiApiKey: '',
            geminiSelectedModel: '',
            geminiSelectedVisionModel: '',
            siliconflowApiKey: '',
            siliconflowSelectedModel: '',
            siliconflowSelectedVisionModel: '',
            ollamaUrl: 'http://localhost:11434',
            ollamaSelectedModel: '',
            ollamaSelectedVisionModel: '',
            openrouterApiKey: '',
            openrouterSelectedModel: '',
            openrouterSelectedVisionModel: '',
            nanogptApiKey: '',
            nanogptSelectedModel: '',
            nanogptSelectedVisionModel: '',
            targetLanguage: 'langEnglish',
            secondTargetLanguage: '',
            openrouterShowOnlyFreeModels: true,
            nanogptSubscriptionOnly: false
        };
        let itemsToSet = {};
        for (const key in defaults) {
            if (items[key] === undefined) {
                itemsToSet[key] = defaults[key];
            }
        }
        if (Object.keys(itemsToSet).length > 0) {
            chrome.storage.local.set(itemsToSet);
            console.log("已设置初始默认值:", itemsToSet);
        }
    });
});

// --- 创建右键菜单 ---
function createContextMenus() {
    // 清除现有的菜单项
    chrome.contextMenus.removeAll(() => {
        // 获取当前语言设置
        chrome.storage.local.get(['targetLanguage', 'secondTargetLanguage'], (result) => {
            const primaryLang = result.targetLanguage || 'langEnglish';
            const secondaryLang = result.secondTargetLanguage || '';

            // 获取语言名称
            const primaryLangName = normalizeLanguageToEnglishName(primaryLang);
            const secondaryLangName = normalizeLanguageToEnglishName(secondaryLang);

            // 创建主菜单项
            chrome.contextMenus.create({
                id: 'translate-selection',
                title: chrome.i18n.getMessage('contextMenuTranslate'),
                contexts: ['selection']
            });

            // 创建子菜单项 - 翻译到主要目标语言
            chrome.contextMenus.create({
                id: 'translate-to-primary',
                parentId: 'translate-selection',
                title: chrome.i18n.getMessage('contextMenuTranslateToPrimary', [primaryLangName]),
                contexts: ['selection']
            });

            // 只有当设置了第二语言时才创建第二语言菜单项
            if (secondaryLang && secondaryLang !== '') {
                chrome.contextMenus.create({
                    id: 'translate-to-secondary',
                    parentId: 'translate-selection',
                    title: chrome.i18n.getMessage('contextMenuTranslateToSecondary', [secondaryLangName]),
                    contexts: ['selection']
                });
            }

            // 创建分隔线
            chrome.contextMenus.create({
                id: 'separator1',
                parentId: 'translate-selection',
                type: 'separator',
                contexts: ['selection']
            });

            // 创建设置菜单项
            chrome.contextMenus.create({
                id: 'open-settings',
                parentId: 'translate-selection',
                title: chrome.i18n.getMessage('contextMenuOpenSettings'),
                contexts: ['selection']
            });
        });
    });
}

// --- 快捷键监听 ---
chrome.commands.onCommand.addListener((command) => {
    console.log('[LLM-Translate] Command received:', command);

    if (command === 'capture-selected-area') {
        // 获取当前活动标签页
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                console.log('[LLM-Translate] Sending startScreenshotSelection to tab:', tabs[0].id);
                // 向当前活动标签页发送开始截图选择的消息
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'startScreenshotSelection'
                }).catch((error) => {
                    console.error('[LLM-Translate] Error sending startScreenshotSelection:', error);
                });
            }
        });
    }
});

// --- 消息监听 ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'translate') {
        handleTranslation(request.text, request.targetLanguage, request.secondTargetLanguage, sendResponse, false);
        return true; // 异步响应
    } else if (request.type === 'captureAndTranslateImage') {
        console.log('[LLM-Translate] captureAndTranslateImage received', request.rect);
        handleCaptureAndTranslateImage(request.rect, sender, sendResponse);
        return true;
    }
});

// --- 监听设置变化，更新右键菜单 ---
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && 
        (changes.targetLanguage || changes.secondTargetLanguage)) {
        // 当目标语言设置改变时，重新创建右键菜单
        createContextMenus();
    }
});

// --- 右键菜单点击处理 ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'translate-to-primary' || info.menuItemId === 'translate-to-secondary') {
        handleContextMenuTranslation(info, tab);
    } else if (info.menuItemId === 'open-settings') {
        chrome.runtime.openOptionsPage();
    }
});

// --- 处理右键菜单翻译 ---
async function handleContextMenuTranslation(info, tab) {
    const selectedText = info.selectionText;
    if (!selectedText || selectedText.trim().length === 0) {
        return;
    }

    try {
        // 获取当前的语言设置
        const { targetLanguage, secondTargetLanguage } = await chrome.storage.local.get(['targetLanguage', 'secondTargetLanguage']);
        const primaryTargetLanguageKey = targetLanguage || 'langEnglish';
        const secondaryTargetLanguageKey = secondTargetLanguage || '';

        // 确定要使用的目标语言
        let actualTargetLanguage, actualSecondTargetLanguage;
        if (info.menuItemId === 'translate-to-primary') {
            actualTargetLanguage = primaryTargetLanguageKey;
            actualSecondTargetLanguage = secondaryTargetLanguageKey;
        } else {
            actualTargetLanguage = secondaryTargetLanguageKey;
            actualSecondTargetLanguage = primaryTargetLanguageKey;
        }

        // 标准化语言名称
        const primaryTargetLanguageName = normalizeLanguageToEnglishName(actualTargetLanguage);
        const secondaryTargetLanguageName = normalizeLanguageToEnglishName(actualSecondTargetLanguage);

        // 发送翻译请求到 content script
        chrome.tabs.sendMessage(tab.id, {
            type: 'contextMenuTranslate',
            text: selectedText,
            targetLanguage: primaryTargetLanguageName,
            secondTargetLanguage: secondaryTargetLanguageName
        });

    } catch (error) {
        console.error('右键菜单翻译失败:', error);
    }
}

// --- 语言名称标准化函数 ---
function normalizeLanguageToEnglishName(langValue) {
    if (!langValue) return '';

    // 语言键到英文名称的映射
    const langKeyToEnName = {
        'langEnglish': 'English',
        'langSimplifiedChinese': 'Simplified Chinese',
        'langTraditionalChinese': 'Traditional Chinese',
        'langFrench': 'French',
        'langSpanish': 'Spanish',
        'langArabic': 'Arabic',
        'langRussian': 'Russian',
        'langPortuguese': 'Portuguese',
        'langGerman': 'German',
        'langItalian': 'Italian',
        'langDutch': 'Dutch',
        'langDanish': 'Danish',
        'langJapanese': 'Japanese',
        'langKorean': 'Korean',
        'langVietnamese': 'Vietnamese',
        'langThai': 'Thai',
        'langIndonesian': 'Indonesian',
        'langHindi': 'Hindi',
        'langTurkish': 'Turkish',
        'langPolish': 'Polish',
        'langFinnish': 'Finnish',
        'langHungarian': 'Hungarian',
        'langCzech': 'Czech',
        'langGreek': 'Greek',
        'langRomanian': 'Romanian',
        'langSlovak': 'Slovak'
    };

    return langKeyToEnName[langValue] || langValue;
}

// --- 核心翻译处理 ---
async function handleTranslation(text, targetLanguage, secondTargetLanguage, sendResponse, isVision = false) {
    try {
        const { activeProvider } = await chrome.storage.local.get('activeProvider');
        const provider = activeProvider || 'gemini';

        // Detect source language and determine actual target language
        const actualTargetLanguage = await determineTargetLanguage(text, targetLanguage, secondTargetLanguage);

        // Determine which model to use (text or vision)
        const modelKeySuffix = isVision ? 'SelectedVisionModel' : 'SelectedModel';

        let config, apiKey, modelName, ollamaUrl;

        if (provider === 'ollama') {
            const urlKey = `${provider}Url`;
            const modelKey = `${provider}${modelKeySuffix}`;
            config = await chrome.storage.local.get([urlKey, modelKey]);
            ollamaUrl = config[urlKey];
            modelName = config[modelKey];

            if (!ollamaUrl) {
                sendResponse({ error: `Ollama 服务器地址未设置。请在设置页面配置 Ollama URL。` });
                chrome.runtime.openOptionsPage();
                return;
            }

            if (!modelName) {
                sendResponse({ error: `Ollama 模型未选择。请在设置页面选择一个模型。` });
                chrome.runtime.openOptionsPage();
                return;
            }
        } else {
            const configKey = `${provider}ApiKey`;
            const modelKey = `${provider}${modelKeySuffix}`;
            config = await chrome.storage.local.get([configKey, modelKey]);

            apiKey = config[configKey];
            modelName = config[modelKey];

            if (!apiKey || !modelName) {
                sendResponse({ error: `当前提供商 (${provider}) 的 API 密钥或模型未设置。` });
                chrome.runtime.openOptionsPage();
                return;
            }
        }

        let translation;
        if (provider === 'gemini') {
            translation = await callGeminiAPI(text, apiKey, modelName, actualTargetLanguage, secondTargetLanguage);
        } else if (provider === 'siliconflow') {
            translation = await callSiliconFlowAPI(text, apiKey, modelName, actualTargetLanguage, secondTargetLanguage);
        } else if (provider === 'openrouter') {
            translation = await callOpenRouterAPI(text, apiKey, modelName, actualTargetLanguage, secondTargetLanguage);
        } else if (provider === 'nanogpt') {
            translation = await callNanoGPTAPI(text, apiKey, modelName, actualTargetLanguage, secondTargetLanguage);
        } else if (provider === 'ollama') {
            translation = await callOllamaAPI(text, ollamaUrl, modelName, actualTargetLanguage, secondTargetLanguage);
        } else {
            throw new Error(`未知的模型提供商: ${provider}`);
        }

        sendResponse({ translation });

    } catch (error) {
        sendResponse({ error: `翻译失败: ${error.message}` });
    }
}

// --- 语言检测与目标语言确定 ---
async function determineTargetLanguage(text, targetLanguage, secondTargetLanguage) {
    // If no second language is set, always use the primary target
    if (!secondTargetLanguage || secondTargetLanguage === '') {
        return targetLanguage;
    }

    return new Promise((resolve) => {
        chrome.i18n.detectLanguage(text, (result) => {
            if (result && result.languages && result.languages.length > 0) {
                const detectedLanguage = result.languages[0].language;
                const confidence = result.languages[0].percentage;

                // Map detected language to target language format
                const detectedLangName = mapLanguageCodeToName(detectedLanguage);

                // If detected language matches target language, use second target language
                if (detectedLangName === targetLanguage && confidence > 50) {
                    console.log(`Source language (${detectedLangName}) matches target language (${targetLanguage}), using second target language (${secondTargetLanguage})`);
                    resolve(secondTargetLanguage);
                } else {
                    console.log(`Using primary target language: ${targetLanguage}`);
                    resolve(targetLanguage);
                }
            } else {
                // If language detection fails, use primary target language
                console.log(`Language detection failed, using primary target language: ${targetLanguage}`);
                resolve(targetLanguage);
            }
        });
    });
}

function mapLanguageCodeToName(languageCode) {
    const languageMap = {
        'en': 'English',
        'zh': 'Simplified Chinese',
        'zh-CN': 'Simplified Chinese',
        'zh-TW': 'Traditional Chinese',
        'fr': 'French',
        'es': 'Spanish',
        'ar': 'Arabic',
        'ru': 'Russian',
        'pt': 'Portuguese',
        'de': 'German',
        'it': 'Italian',
        'nl': 'Dutch',
        'da': 'Danish',
        'ja': 'Japanese',
        'ko': 'Korean',
        'sv': 'Swedish',
        'no': 'Norwegian Bokmål',
        'pl': 'Polish',
        'tr': 'Turkish',
        'fi': 'Finnish',
        'hu': 'Hungarian',
        'cs': 'Czech',
        'el': 'Greek',
        'hi': 'Hindi',
        'id': 'Indonesian',
        'th': 'Thai',
        'vi': 'Vietnamese',
        'ro': 'Romanian',
        'sk': 'Slovak'
    };

    return languageMap[languageCode] || 'English';
}

// --- 截图并翻译图片内文字 ---
async function handleCaptureAndTranslateImage(rect, sender, sendResponse) {
    try {
        // Capture visible tab
        const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
        console.log('[LLM-Translate] captureVisibleTab success');
        // Crop to rect using OffscreenCanvas
        const croppedDataUrl = await cropImageDataUrl(dataUrl, rect);
        console.log('[LLM-Translate] cropImageDataUrl success');

        const { activeProvider } = await chrome.storage.local.get('activeProvider');
        const provider = activeProvider || 'gemini';

        let translation;
        if (provider === 'gemini') {
            translation = await visionTranslateGemini(croppedDataUrl);
        } else if (provider === 'siliconflow') {
            translation = await visionTranslateOpenAICompatible(croppedDataUrl, 'siliconflow');
        } else if (provider === 'openrouter') {
            translation = await visionTranslateOpenAICompatible(croppedDataUrl, 'openrouter');
        } else if (provider === 'nanogpt') {
            translation = await visionTranslateOpenAICompatible(croppedDataUrl, 'nanogpt');
        } else if (provider === 'ollama') {
            translation = await visionTranslateOllama(croppedDataUrl);
        } else {
            throw new Error(`未知的模型提供商: ${provider}`);
        }

        // Send to content script to show result popover with copy
        if (sender && sender.tab && sender.tab.id) {
            console.log('[LLM-Translate] sending showImageTranslationResult');
            chrome.tabs.sendMessage(sender.tab.id, { type: 'showImageTranslationResult', translation });
        }
        sendResponse({ translation });
    } catch (e) {
        console.error('[LLM-Translate] handleCaptureAndTranslateImage failed:', e);
        sendResponse({ error: e.message });
    }
}

async function cropImageDataUrl(dataUrl, rect) {
    // Use createImageBitmap in service worker
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    const bitmap = await createImageBitmap(blob);
    const dpr = rect.devicePixelRatio || 1;
    const sx = Math.max(0, Math.round(rect.x * dpr));
    const sy = Math.max(0, Math.round(rect.y * dpr));
    const sw = Math.min(bitmap.width - sx, Math.round(rect.width * dpr));
    const sh = Math.min(bitmap.height - sy, Math.round(rect.height * dpr));
    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    const outBlob = await canvas.convertToBlob({ type: 'image/png' });
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(outBlob);
    });
}

async function visionTranslateGemini(imageDataUrl) {
    const { geminiApiKey, geminiSelectedVisionModel, geminiSelectedModel, targetLanguage } = 
        await chrome.storage.local.get(['geminiApiKey', 'geminiSelectedVisionModel', 'geminiSelectedModel', 'targetLanguage']);

    const apiKey = geminiApiKey;
    const ocrModelName = geminiSelectedVisionModel;
    const textModelName = geminiSelectedModel;

    if (!apiKey || !textModelName) throw new Error('Gemini API or models not configured');

    const targetLangName = normalizeLanguageToEnglishName(targetLanguage || 'langSimplifiedChinese');

    // Check if using same model for both OCR and translation
    if (ocrModelName === '__same_as_text__' || !ocrModelName) {
        // Single-step translation using text model directly
        const prompt = `Extract all text from this image and translate it to ${targetLangName}. Return only the translated text.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${textModelName}:generateContent?key=${apiKey}`;
        const parts = [{ text: prompt }, { inline_data: { mime_type: 'image/png', data: imageDataUrl.split(',')[1] } }];
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }] }) });

        if (!resp.ok) throw new Error('Gemini translation request failed');
        const data = await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } else {
        // Two-step process: OCR then translate
        const ocrPrompt = "Extract and return all text from this image exactly as it appears. Do not translate. Only return the extracted text.";

        const ocrUrl = `https://generativelanguage.googleapis.com/v1beta/models/${ocrModelName}:generateContent?key=${apiKey}`;
        const ocrParts = [{ text: ocrPrompt }, { inline_data: { mime_type: 'image/png', data: imageDataUrl.split(',')[1] } }];
        const ocrResp = await fetch(ocrUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: ocrParts }] }) });

        if (!ocrResp.ok) throw new Error('Gemini OCR request failed');
        const ocrData = await ocrResp.json();
        const extractedText = ocrData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        if (!extractedText) throw new Error('No text found in image');

        // Translate the extracted text
        const translation = await callGeminiAPI(extractedText, apiKey, textModelName, targetLangName, '');
        return translation;
    }
}

async function visionTranslateOpenAICompatible(imageDataUrl, provider) {
    const configKeys = [`${provider}ApiKey`, `${provider}SelectedVisionModel`, `${provider}SelectedModel`, 'targetLanguage'];
    const config = await chrome.storage.local.get(configKeys);
    const apiKey = config[`${provider}ApiKey`];
    const ocrModelName = config[`${provider}SelectedVisionModel`];
    const textModelName = config[`${provider}SelectedModel`];

    if (!apiKey || !textModelName) throw new Error(`${provider} API or models not configured`);

    const targetLangName = normalizeLanguageToEnglishName(config.targetLanguage || 'langSimplifiedChinese');

    // Set up URL and headers based on provider
    let url, headers;
    if (provider === 'siliconflow') {
        url = 'https://api.siliconflow.cn/v1/chat/completions';
        headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };
    } else if (provider === 'openrouter') {
        url = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/licon/llm-translate',
            'X-Title': 'LLM Translate Extension'
        };
    } else if (provider === 'nanogpt') {
        url = 'https://nano-gpt.com/api/v1/chat/completions';
        headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };
    } else {
        throw new Error(`Unknown provider: ${provider}`);
    }

    // Check if using same model for both OCR and translation
    if (ocrModelName === '__same_as_text__' || !ocrModelName) {
        // Single-step translation using text model directly
        const prompt = `Extract all text from this image and translate it to ${targetLangName}. Return only the translated text.`;

        const messages = [
            { role: 'user', content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageDataUrl } }
            ]}
        ];

        const resp = await fetch(url, { 
            method: 'POST', 
            headers, 
            body: JSON.stringify({ model: textModelName, messages, max_tokens: 2048, temperature: 0.2 }) 
        });

        if (!resp.ok) throw new Error(`${provider} translation request failed`);
        const data = await resp.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    } else {
        // Two-step process: OCR then translate
        const ocrPrompt = "Extract and return all text from this image exactly as it appears. Do not translate. Only return the extracted text.";

        const ocrMessages = [
            { role: 'user', content: [
                { type: 'text', text: ocrPrompt },
                { type: 'image_url', image_url: { url: imageDataUrl } }
            ]}
        ];

        const ocrResp = await fetch(url, { 
            method: 'POST', 
            headers, 
            body: JSON.stringify({ model: ocrModelName, messages: ocrMessages, max_tokens: 2048, temperature: 0.1 }) 
        });

        if (!ocrResp.ok) throw new Error(`${provider} OCR request failed`);
        const ocrData = await ocrResp.json();
        const extractedText = ocrData.choices?.[0]?.message?.content?.trim() || '';

        if (!extractedText) throw new Error('No text found in image');

        // Translate using the text model
        let translation;
        if (provider === 'siliconflow') {
            translation = await callSiliconFlowAPI(extractedText, apiKey, textModelName, targetLangName, '');
        } else if (provider === 'openrouter') {
            translation = await callOpenRouterAPI(extractedText, apiKey, textModelName, targetLangName, '');
        } else if (provider === 'nanogpt') {
            translation = await callNanoGPTAPI(extractedText, apiKey, textModelName, targetLangName, '');
        }

        return translation;
    }
}

async function visionTranslateOllama(imageDataUrl) {
    const { ollamaUrl, ollamaSelectedVisionModel, ollamaSelectedModel, targetLanguage, secondTargetLanguage } = 
        await chrome.storage.local.get(['ollamaUrl', 'ollamaSelectedVisionModel', 'ollamaSelectedModel', 'targetLanguage', 'secondTargetLanguage']);

    const url = ollamaUrl; 
    const ocrModelName = ollamaSelectedVisionModel;
    const textModelName = ollamaSelectedModel;

    if (!url || !textModelName) throw new Error('Ollama URL 或模型未配置');

    const target = normalizeLanguageToEnglishName(targetLanguage || 'langEnglish');
    const second = normalizeLanguageToEnglishName(secondTargetLanguage || '');

    // Check if using same model for both OCR and translation
    if (ocrModelName === '__same_as_text__' || !ocrModelName) {
        // Single-step translation using vision model
        let prompt;
        if (second && second !== '') {
            prompt = `Extract all text from this image and translate it to ${target}. If the text is already in ${target}, translate it to ${second}. Return only the translated text without any additional commentary.`;
        } else {
            prompt = `Extract all text from this image and translate it to ${target}. Return only the translated text without any additional commentary.`;
        }

        // Remove data URL prefix and convert to base64
        const base64Image = imageDataUrl.split(',')[1];

        const response = await fetch(`${url}/api/generate`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                model: textModelName,
                prompt: prompt,
                images: [base64Image], // Correct format for Ollama vision
                stream: false 
            }) 
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama Vision 请求失败: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return data.response?.trim() || '';
    } else {
        // Two-step process: OCR then translate
        const ocrPrompt = "Extract and return all text from this image exactly as it appears. Do not translate or modify the text. Only return the extracted text content.";

        // OCR step with vision model
        const base64Image = imageDataUrl.split(',')[1];
        const ocrResponse = await fetch(`${url}/api/generate`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                model: ocrModelName,
                prompt: ocrPrompt,
                images: [base64Image],
                stream: false 
            }) 
        });

        if (!ocrResponse.ok) {
            const errorText = await ocrResponse.text();
            throw new Error(`Ollama OCR 请求失败: ${ocrResponse.status} ${errorText}`);
        }

        const ocrData = await ocrResponse.json();
        const extractedText = ocrData.response?.trim() || '';

        if (!extractedText) throw new Error('No text found in image');

        // Translate the extracted text using the text model
        const translation = await callOllamaAPI(extractedText, url, textModelName, target, second);
        return translation;
    }
}

// --- API 调用实现 ---

/**
 * 调用 Google Gemini API
 */
async function callGeminiAPI(text, apiKey, modelName, targetLanguage, secondTargetLanguage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    let prompt;
    if (secondTargetLanguage && secondTargetLanguage !== '') {
        prompt = chrome.i18n.getMessage('translationPrompt', [targetLanguage, secondTargetLanguage, text]);
    } else {
        prompt = `Translate the following text to ${targetLanguage}. Return only the translation without any explanation:\n\n${text}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
        }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error.message || `API 请求失败`);
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
}

/**
 * 调用 Silicon Flow API (兼容 OpenAI 格式)
 */
async function callSiliconFlowAPI(text, apiKey, modelName, targetLanguage, secondTargetLanguage) {
    const url = 'https://api.siliconflow.cn/v1/chat/completions';

    let userPrompt;
    if (secondTargetLanguage && secondTargetLanguage !== '') {
        userPrompt = chrome.i18n.getMessage('translationPrompt', [targetLanguage, secondTargetLanguage, text]);
    } else {
        userPrompt = `Translate the following text to ${targetLanguage}. Return only the translation without any explanation:\n\n${text}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelName,
            messages: [
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 2048,
            temperature: 0.3,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error.message || `API 请求失败`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
}

/**
 * 调用 OpenRouter API
 */
async function callOpenRouterAPI(text, apiKey, modelName, targetLanguage, secondTargetLanguage) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    let userPrompt;
    if (secondTargetLanguage && secondTargetLanguage !== '') {
        userPrompt = chrome.i18n.getMessage('translationPrompt', [targetLanguage, secondTargetLanguage, text]);
    } else {
        userPrompt = `Translate the following text to ${targetLanguage}. Return only the translation without any explanation:\n\n${text}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/licon/llm-translate',
            'X-Title': 'LLM Translate Extension',
        },
        body: JSON.stringify({
            model: modelName,
            messages: [
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 2048,
            temperature: 0.3,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error?.message || `API 请求失败`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
}

/**
 * 调用 NanoGPT API (OpenAI 兼容)
 */
async function callNanoGPTAPI(text, apiKey, modelName, targetLanguage, secondTargetLanguage) {
    const url = 'https://nano-gpt.com/api/v1/chat/completions';

    let userPrompt;
    if (secondTargetLanguage && secondTargetLanguage !== '') {
        userPrompt = chrome.i18n.getMessage('translationPrompt', [targetLanguage, secondTargetLanguage, text]);
    } else {
        userPrompt = `Translate the following text to ${targetLanguage}. Return only the translation without any explanation:\n\n${text}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelName,
            messages: [
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 2048,
            temperature: 0.3,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error?.message || `API 请求失败`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
}

/**
 * 调用 Ollama API
 */
async function callOllamaAPI(text, ollamaUrl, modelName, targetLanguage, secondTargetLanguage) {
    const url = `${ollamaUrl}/api/generate`;

    let prompt;
    if (secondTargetLanguage && secondTargetLanguage !== '') {
        prompt = chrome.i18n.getMessage('translationPrompt', [targetLanguage, secondTargetLanguage, text]);
    } else {
        prompt = `Translate the following text to ${targetLanguage}. Return only the translation without any explanation:\n\n${text}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelName,
            prompt: prompt,
            stream: false,
        }),
    });

    if (!response.ok) {
        if (response.status === 403) {
            throw new Error('Translation failed: The Ollama server rejected the request. Please set the environment variable OLLAMA_ORIGINS="chrome-extension://*" and restart the Ollama service.');
        }
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
            const errorBody = await response.text();
            try {
                const errorJson = JSON.parse(errorBody);
                errorMessage = errorJson.error || errorMessage;
            } catch (jsonError) {
                errorMessage = errorBody || errorMessage;
            }
        } catch (textError) {
            // 忽略解析错误，使用默认错误消息
        }
        throw new Error(errorMessage);
    }

    const responseText = await response.text();

    if (!responseText.trim()) {
        throw new Error('Ollama 返回了空响应，请检查模型是否正确加载');
    }

    try {
        const data = JSON.parse(responseText);
        if (!data.response) {
            throw new Error('Ollama 响应格式异常，缺少 response 字段');
        }
        return data.response.trim();
    } catch (jsonError) {
        throw new Error(`Ollama 响应解析失败: ${jsonError.message}`);
    }
}
