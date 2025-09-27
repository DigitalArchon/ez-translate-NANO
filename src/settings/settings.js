// --- I18n Helper ---
function setupI18n() {
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        elem.textContent = chrome.i18n.getMessage(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
        const key = elem.getAttribute('data-i18n-placeholder');
        elem.placeholder = chrome.i18n.getMessage(key);
    });
    document.title = chrome.i18n.getMessage('settingsTitle') || 'LLM Translate Settings';
}

// --- Make select elements searchable ---
function makeSelectSearchable(selectElement) {
    let searchTimeout;
    let searchString = '';

    selectElement.addEventListener('keydown', (e) => {
        // Clear search string on special keys
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
            searchString = '';
            return;
        }

        // Only process printable characters
        if (e.key.length === 1) {
            e.preventDefault();
            searchString += e.key.toLowerCase();

            // Clear search string after 1 second of no typing
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchString = '';
            }, 1000);

            // Find and select matching option
            const options = Array.from(selectElement.options);
            const matchingOption = options.find(option => 
                option.text.toLowerCase().includes(searchString)
            );

            if (matchingOption) {
                selectElement.value = matchingOption.value;
                selectElement.dispatchEvent(new Event('change'));
            }
        }
    });
}

// --- Language Data ---
const languageKeys = [
    "langEnglish", "langSimplifiedChinese", "langTraditionalChinese", "langFrench", "langSpanish", "langArabic", "langRussian", "langPortuguese", "langGerman", "langItalian", "langDutch", "langDanish", "langJapanese", "langKorean", "langVietnamese", "langThai", "langIndonesian", "langHindi", "langTurkish", "langPolish", "langFinnish", "langHungarian", "langCzech", "langGreek", "langRomanian", "langSlovak"
];

function populateLanguages() {
    const defaultTargetLanguageSelect = document.getElementById('default-target-language');
    const secondTargetLanguageSelect = document.getElementById('second-target-language');

    // Clear existing options
    defaultTargetLanguageSelect.innerHTML = '';

    // Only handle second language if the element exists
    if (secondTargetLanguageSelect) {
        secondTargetLanguageSelect.innerHTML = '';

        // Add empty option for second language
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'None - Single language mode';
        secondTargetLanguageSelect.appendChild(emptyOption);
    }

    languageKeys.forEach(key => {
        const message = chrome.i18n.getMessage(key) || key;

        // Add to default target language select
        const defaultOption = document.createElement('option');
        defaultOption.value = key;
        defaultOption.textContent = message;
        defaultTargetLanguageSelect.appendChild(defaultOption);

        // Add to second target language select only if it exists
        if (secondTargetLanguageSelect) {
            const secondOption = document.createElement('option');
            secondOption.value = key;
            secondOption.textContent = message;
            secondTargetLanguageSelect.appendChild(secondOption);
        }
    });
}

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', () => {
    setupI18n();

    const state = { 
        activeProvider: 'gemini',
        showOnlyFreeModels: true,
        allModelsCache: {} // Cache all models for each provider
    };

    const elements = {
        tabs: document.querySelectorAll('.tab-button'),
        tabContents: document.querySelectorAll('.tab-content'),
        statusDiv: document.getElementById('status'),
        openrouterFreeModelsToggle: document.getElementById('openrouter-free-models-toggle'),
        providers: {
            gemini: {
                apiKeyInput: document.getElementById('gemini-api-key'),
                modelSelect: document.getElementById('gemini-model-select'),
                visionModelSelect: document.getElementById('gemini-vision-model-select'),
                fetchButton: document.querySelector('.fetch-models-button[data-provider="gemini"]'),
            },
            siliconflow: {
                apiKeyInput: document.getElementById('siliconflow-api-key'),
                modelSelect: document.getElementById('siliconflow-model-select'),
                visionModelSelect: document.getElementById('siliconflow-vision-model-select'),
                fetchButton: document.querySelector('.fetch-models-button[data-provider="siliconflow"]'),
            },
            openrouter: {
                apiKeyInput: document.getElementById('openrouter-api-key'),
                modelSelect: document.getElementById('openrouter-model-select'),
                visionModelSelect: document.getElementById('openrouter-vision-model-select'),
                fetchButton: document.querySelector('.fetch-models-button[data-provider="openrouter"]'),
            },
            nanogpt: {
                apiKeyInput: document.getElementById('nanogpt-api-key'),
                modelSelect: document.getElementById('nanogpt-model-select'),
                visionModelSelect: document.getElementById('nanogpt-vision-model-select'),
                fetchButton: document.querySelector('.fetch-models-button[data-provider="nanogpt"]'),
            },
            ollama: {
                apiKeyInput: document.getElementById('ollama-url'),
                modelSelect: document.getElementById('ollama-model-select'),
                visionModelSelect: document.getElementById('ollama-vision-model-select'),
                fetchButton: document.querySelector('.fetch-models-button[data-provider="ollama"]'),
            },
        },
        targetLanguages: {
            defaultTargetLanguageSelect: document.getElementById('default-target-language'),
            secondTargetLanguageSelect: document.getElementById('second-target-language'), // This might be null
        },
    };

    // Make all model selects searchable
    Object.values(elements.providers).forEach(provider => {
        makeSelectSearchable(provider.modelSelect);
        makeSelectSearchable(provider.visionModelSelect);
    });

    function switchTab(providerName) {
        state.activeProvider = providerName;
        elements.tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.provider === providerName));
        elements.tabContents.forEach(content => content.classList.toggle('active', content.id === `${providerName}-settings`));
        chrome.storage.local.set({ activeProvider: providerName });
        showStatus(`Switched to ${providerName}`, 'info', 1500);
    }

    async function handleFetchModels(providerName) {
        const { apiKeyInput } = elements.providers[providerName];
        const inputValue = apiKeyInput.value;
        if (!inputValue) {
            const errorMsg = providerName === 'ollama' ? 
                'Please enter Ollama server URL' : 
                'Please enter API key';
            showStatus(errorMsg, 'error');
            return;
        }

        if (providerName === 'ollama') {
            chrome.storage.local.set({ [`${providerName}Url`]: inputValue }, () => {
                showStatus('Ollama URL saved', 'info');
            });
            await fetchOllamaModels(inputValue);
        } else {
            chrome.storage.local.set({ [`${providerName}ApiKey`]: inputValue }, () => {
                showStatus('API key saved', 'info');
            });
            if (providerName === 'gemini') await fetchGeminiModels(inputValue);
            else if (providerName === 'siliconflow') await fetchSiliconFlowModels(inputValue);
            else if (providerName === 'openrouter') await fetchOpenRouterModels(inputValue);
            else if (providerName === 'nanogpt') await fetchNanoGPTModels(inputValue);
        }
    }

    async function fetchGeminiModels(apiKey) {
        const modelSelect = elements.providers.gemini.modelSelect;
        const visionModelSelect = elements.providers.gemini.visionModelSelect;

        modelSelect.innerHTML = `<option>Fetching models...</option>`;
        visionModelSelect.innerHTML = `<option>Fetching models...</option>`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (!response.ok) throw new Error((await response.json()).error.message);
            const data = await response.json();

            // Get all models that support content generation
            const allModels = data.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .sort((a, b) => a.displayName.localeCompare(b.displayName));

            // Cache the models
            state.allModelsCache.gemini = allModels;

            // Populate both dropdowns with all models
            populateModelSelect(modelSelect, allModels, m => m.name.replace('models/', ''), m => `${m.displayName} (${m.name.replace('models/', '')})`);
            populateModelSelect(visionModelSelect, allModels, m => m.name.replace('models/', ''), m => `${m.displayName} (${m.name.replace('models/', '')})`);

            showStatus('Models fetched successfully', 'success');
            loadSelectedModels('gemini');
        } catch (error) {
            modelSelect.innerHTML = `<option>Failed to fetch models: ${error.message}</option>`;
            visionModelSelect.innerHTML = `<option>Failed to fetch models: ${error.message}</option>`;
            showStatus(`Failed to fetch models: ${error.message}`, 'error');
        }
    }

    async function fetchSiliconFlowModels(apiKey) {
        const modelSelect = elements.providers.siliconflow.modelSelect;
        const visionModelSelect = elements.providers.siliconflow.visionModelSelect;

        modelSelect.innerHTML = `<option>Fetching models...</option>`;
        visionModelSelect.innerHTML = `<option>Fetching models...</option>`;

        try {
            const response = await fetch('https://api.siliconflow.cn/v1/models?type=text&sub_type=chat', { 
                headers: { 'Authorization': `Bearer ${apiKey}` } 
            });
            if (!response.ok) throw new Error((await response.json()).error.message);
            const data = await response.json();

            // Sort all models alphabetically
            const allModels = data.data.sort((a, b) => a.id.localeCompare(b.id));

            // Cache the models
            state.allModelsCache.siliconflow = allModels;

            // Populate both dropdowns with all models
            populateModelSelect(modelSelect, allModels, m => m.id, m => m.id);
            populateModelSelect(visionModelSelect, allModels, m => m.id, m => m.id);

            showStatus('Models fetched successfully', 'success');
            loadSelectedModels('siliconflow');
        } catch (error) {
            modelSelect.innerHTML = `<option>Failed to fetch models: ${error.message}</option>`;
            visionModelSelect.innerHTML = `<option>Failed to fetch models: ${error.message}</option>`;
            showStatus(`Failed to fetch models: ${error.message}`, 'error');
        }
    }

    async function fetchOpenRouterModels(apiKey) {
        const modelSelect = elements.providers.openrouter.modelSelect;
        const visionModelSelect = elements.providers.openrouter.visionModelSelect;

        modelSelect.innerHTML = `<option>Fetching models...</option>`;
        visionModelSelect.innerHTML = `<option>Fetching models...</option>`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: { 
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://github.com/licon/llm-translate',
                    'X-Title': 'LLM Translate Extension'
                }
            });
            if (!response.ok) throw new Error((await response.json()).error?.message || 'Failed to fetch models');
            const data = await response.json();

            // Get current toggle state
            const showOnlyFree = state.showOnlyFreeModels;

            // Filter out embedding and rerank models
            let allModels = data.data.filter(m => 
                m.id && 
                m.name && 
                !m.id.includes('embedding') && 
                !m.id.includes('rerank')
            );

            // Apply free filter if enabled
            if (showOnlyFree) {
                allModels = allModels.filter(m => m.name.toLowerCase().includes('free'));
            }

            // Sort alphabetically
            allModels.sort((a, b) => a.name.localeCompare(b.name));

            // Cache the models
            state.allModelsCache.openrouter = allModels;

            // Populate both dropdowns with all models
            populateModelSelect(modelSelect, allModels, m => m.id, m => `${m.name} (${m.id})`);
            populateModelSelect(visionModelSelect, allModels, m => m.id, m => `${m.name} (${m.id})`);

            showStatus('Models fetched successfully', 'success');
            loadSelectedModels('openrouter');
        } catch (error) {
            modelSelect.innerHTML = `<option>Failed to fetch models: ${error.message}</option>`;
            visionModelSelect.innerHTML = `<option>Failed to fetch models: ${error.message}</option>`;
            showStatus(`Failed to fetch models: ${error.message}`, 'error');
        }
    }

    async function fetchNanoGPTModels(apiKey) {
        const modelSelect = elements.providers.nanogpt.modelSelect;
        const visionModelSelect = elements.providers.nanogpt.visionModelSelect;
        // Check subscription toggle state
        const subscriptionOnly = document.getElementById('nanogpt-subscription-toggle').checked;
        modelSelect.innerHTML = `<option>Fetching models...</option>`;
        visionModelSelect.innerHTML = `<option>Fetching models...</option>`;

        const endpoint = subscriptionOnly ? 
        'https://nano-gpt.com/api/subscription/v1/models' : 
        'https://nano-gpt.com/api/v1/models';

        try {
            const response = await fetch(endpoint, {
                headers: { 
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error((await response.json()).error?.message || 'Failed to fetch models');
            const data = await response.json();

            // Get current toggle state
            const showOnlyFree = state.showOnlyFreeModels;

            // Filter models
            let allModels = data.data.filter(m => 
                m.id && 
                !m.id.includes('embedding') && 
                !m.id.includes('rerank')
            );

            // Apply free filter if enabled and models have pricing info
            if (showOnlyFree && data.data[0]?.pricing !== undefined) {
                allModels = allModels.filter(m => !m.pricing || m.pricing === 0);
            }

            // Sort alphabetically
            allModels.sort((a, b) => (a.id || '').localeCompare(b.id || ''));

            // Cache the models
            state.allModelsCache.nanogpt = allModels;

            // Populate both dropdowns with all models
            populateModelSelect(modelSelect, allModels, m => m.id, m => m.id);
            populateModelSelect(visionModelSelect, allModels, m => m.id, m => m.id);

            showStatus('Models fetched successfully', 'success');
            loadSelectedModels('nanogpt');
        } catch (error) {
            modelSelect.innerHTML = `<option>Failed to fetch models: ${error.message}</option>`;
            visionModelSelect.innerHTML = `<option>Failed to fetch models: ${error.message}</option>`;
            showStatus(`Failed to fetch models: ${error.message}`, 'error');
        }
    }

    async function fetchOllamaModels(ollamaUrl) {
        const modelSelect = elements.providers.ollama.modelSelect;
        const visionModelSelect = elements.providers.ollama.visionModelSelect;

        modelSelect.innerHTML = `<option>Fetching models...</option>`;
        visionModelSelect.innerHTML = `<option>Fetching models...</option>`;

        try {
            const response = await fetch(`${ollamaUrl}/api/tags`);
            if (!response.ok) throw new Error('Failed to connect to Ollama server');
            const data = await response.json();

            // Sort all models alphabetically
            const allModels = data.models.sort((a, b) => a.name.localeCompare(b.name));

            // Cache the models
            state.allModelsCache.ollama = allModels;

            // Populate both dropdowns with all models
            populateModelSelect(modelSelect, allModels, m => m.name, m => `${m.name} (${(m.size / 1024 / 1024 / 1024).toFixed(1)}GB)`);
            populateModelSelect(visionModelSelect, allModels, m => m.name, m => `${m.name} (${(m.size / 1024 / 1024 / 1024).toFixed(1)}GB)`);

            showStatus('Models fetched successfully', 'success');
            loadSelectedModels('ollama');

            // If no model was previously selected and we have models, auto-save the first one
            if (allModels.length > 0) {
                if (!modelSelect.value || modelSelect.value === allModels[0].name) {
                    saveSelectedModel('ollama', 'text');
                }
                if (!visionModelSelect.value || visionModelSelect.value === allModels[0].name) {
                    saveSelectedModel('ollama', 'vision');
                }
            }
        } catch (error) {
            modelSelect.innerHTML = `<option>Failed to fetch models: ${error.message}</option>`;
            visionModelSelect.innerHTML = `<option>Failed to fetch models: ${error.message}</option>`;
            showStatus(`Failed to fetch models: ${error.message}`, 'error');
        }
    }

    function populateModelSelect(selectElement, models, valueFn, textFn) {
        selectElement.innerHTML = '';

        // Add "Same as Translation Model" option for vision/OCR selects
        if (selectElement.id && selectElement.id.includes('vision-model-select')) {
            const sameOption = document.createElement('option');
            sameOption.value = '__same_as_text__';
            sameOption.textContent = 'Same as Translation Model';
            selectElement.appendChild(sameOption);
        }

        if (models.length === 0) {
            selectElement.innerHTML = '<option>No models available</option>';
            return;
        }
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = valueFn(model);
            option.textContent = textFn(model);
            selectElement.appendChild(option);
        });

        // Auto-select the first model if no model is currently selected
        if (models.length > 0 && !selectElement.value) {
            selectElement.value = valueFn(models[0]);
        }
    }

    function saveSelectedModel(providerName, modelType) {
        const selectElement = modelType === 'vision' ? 
            elements.providers[providerName].visionModelSelect : 
            elements.providers[providerName].modelSelect;

        if (selectElement.value) {
            const key = modelType === 'vision' ? 
                `${providerName}SelectedVisionModel` : 
                `${providerName}SelectedModel`;
            chrome.storage.local.set({ [key]: selectElement.value }, () => {
                showStatus(`Model saved: ${selectElement.value}`, 'success');
            });
        }
    }

    function loadAllSettings() {
        const keys = [
            'activeProvider', 'showOnlyFreeModels',
            'geminiApiKey', 'siliconflowApiKey', 'openrouterApiKey', 'nanogptApiKey', 'ollamaUrl',
            'geminiSelectedModel', 'geminiSelectedVisionModel',
            'siliconflowSelectedModel', 'siliconflowSelectedVisionModel',
            'openrouterSelectedModel', 'openrouterSelectedVisionModel',
            'nanogptSelectedModel', 'nanogptSelectedVisionModel',
            'ollamaSelectedModel', 'ollamaSelectedVisionModel',
            'targetLanguage', 'secondTargetLanguage'
        ];

        chrome.storage.local.get(keys, (result) => {
            if (result.activeProvider) switchTab(result.activeProvider);

            // Load free models toggle state
            state.showOnlyFreeModels = result.showOnlyFreeModels !== false;
            if (elements.openrouterFreeModelsToggle) {
                elements.openrouterFreeModelsToggle.checked = state.showOnlyFreeModels;
            }    

            if (result.geminiApiKey) {
                elements.providers.gemini.apiKeyInput.value = result.geminiApiKey;
                fetchGeminiModels(result.geminiApiKey);
            }
            if (result.siliconflowApiKey) {
                elements.providers.siliconflow.apiKeyInput.value = result.siliconflowApiKey;
                fetchSiliconFlowModels(result.siliconflowApiKey);
            }
            if (result.openrouterApiKey) {
                elements.providers.openrouter.apiKeyInput.value = result.openrouterApiKey;
                fetchOpenRouterModels(result.openrouterApiKey);
            }
            if (result.nanogptApiKey) {
                elements.providers.nanogpt.apiKeyInput.value = result.nanogptApiKey;
                fetchNanoGPTModels(result.nanogptApiKey);
            }
            if (result.ollamaUrl) {
                elements.providers.ollama.apiKeyInput.value = result.ollamaUrl;
                fetchOllamaModels(result.ollamaUrl);
            } else {
                // Set default Ollama URL if not set
                elements.providers.ollama.apiKeyInput.value = 'http://localhost:11434';
            }

            // Load target language settings
            loadTargetLanguageSettings(result);
        });
    }

    function loadTargetLanguageSettings(result) {
        // Set default target language
        if (result.targetLanguage) {
            elements.targetLanguages.defaultTargetLanguageSelect.value = result.targetLanguage;
        } else {
            // Set default based on browser language
            const browserLang = chrome.i18n.getUILanguage();
            const langCode = browserLang.split('-')[0];
            const defaultLangKey = getDefaultLanguageKey(browserLang, langCode);
            elements.targetLanguages.defaultTargetLanguageSelect.value = defaultLangKey;
            chrome.storage.local.set({ targetLanguage: defaultLangKey });
        }

        // Set second target language only if the element exists
        if (elements.targetLanguages.secondTargetLanguageSelect && result.secondTargetLanguage !== undefined) {
            elements.targetLanguages.secondTargetLanguageSelect.value = result.secondTargetLanguage;
        }
    }

    function getDefaultLanguageKey(browserLang, langCode) {
        const browserLangToMsgKey = {
            'en': 'langEnglish',
            'zh': 'langSimplifiedChinese',
            'zh-CN': 'langSimplifiedChinese',
            'zh-TW': 'langTraditionalChinese',
            'fr': 'langFrench',
            'es': 'langSpanish',
            'ar': 'langArabic',
            'ru': 'langRussian',
            'pt': 'langPortuguese',
            'de': 'langGerman',
            'it': 'langItalian',
            'nl': 'langDutch',
            'da': 'langDanish',
            'ja': 'langJapanese',
            'ko': 'langKorean',
            'sv': 'langSwedish',
            'no': 'langNorwegianBokmal',
            'pl': 'langPolish',
            'tr': 'langTurkish',
            'fi': 'langFinnish',
            'hu': 'langHungarian',
            'cs': 'langCzech',
            'el': 'langGreek',
            'hi': 'langHindi',
            'id': 'langIndonesian',
            'th': 'langThai',
            'vi': 'langVietnamese',
            'ro': 'langRomanian',
            'sk': 'langSlovak'
        };

        return browserLangToMsgKey[browserLang] || browserLangToMsgKey[langCode] || 'langEnglish';
    }

    function loadSelectedModels(providerName) {
        chrome.storage.local.get([
            `${providerName}SelectedModel`,
            `${providerName}SelectedVisionModel`
        ], (result) => {
            const textModel = result[`${providerName}SelectedModel`];
            const visionModel = result[`${providerName}SelectedVisionModel`];
            const { modelSelect, visionModelSelect } = elements.providers[providerName];

            if (textModel && [...modelSelect.options].some(opt => opt.value === textModel)) {
                modelSelect.value = textModel;
            }
            if (visionModel && [...visionModelSelect.options].some(opt => opt.value === visionModel)) {
                visionModelSelect.value = visionModel;
            }
        });
    }

    function showStatus(message, type = 'info', duration = 3000) {
        const colorMap = { 'info': '#007bff', 'success': 'green', 'error': 'red' };
        elements.statusDiv.textContent = message;
        elements.statusDiv.style.color = colorMap[type] || 'black';
        setTimeout(() => {
            if (elements.statusDiv.textContent === message) elements.statusDiv.textContent = '';
        }, duration);
    }

    // Event listeners
    elements.tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.provider)));

    for (const providerName in elements.providers) {
        elements.providers[providerName].fetchButton.addEventListener('click', () => handleFetchModels(providerName));
        elements.providers[providerName].modelSelect.addEventListener('change', () => saveSelectedModel(providerName, 'text'));
        elements.providers[providerName].visionModelSelect.addEventListener('change', () => saveSelectedModel(providerName, 'vision'));
    }

    // Free models toggle
    if (elements.openrouterFreeModelsToggle) {
        elements.openrouterFreeModelsToggle.addEventListener('change', async () => {
            state.showOnlyFreeModels = elements.openrouterFreeModelsToggle.checked;
        chrome.storage.local.set({ showOnlyFreeModels: state.showOnlyFreeModels });

        // Refresh models for providers that support free filtering
        const { activeProvider } = await chrome.storage.local.get('activeProvider');
        if (activeProvider === 'openrouter' || activeProvider === 'nanogpt') {
            const apiKey = elements.providers[activeProvider].apiKeyInput.value;
            if (apiKey) {
                if (activeProvider === 'openrouter') {
                    await fetchOpenRouterModels(apiKey);
                } else if (activeProvider === 'nanogpt') {
                    await fetchNanoGPTModels(apiKey);
                }
            }
        }
    });
    }

    // NanoGPT subscription toggle
    document.getElementById('nanogpt-subscription-toggle').addEventListener('change', async () => {
        const apiKey = elements.providers.nanogpt.apiKeyInput.value;
        if (apiKey) {
            await fetchNanoGPTModels(apiKey);
        }
    });

    // Target language settings
    elements.targetLanguages.defaultTargetLanguageSelect.addEventListener('change', () => {
        const value = elements.targetLanguages.defaultTargetLanguageSelect.value;
        chrome.storage.local.set({ targetLanguage: value }, () => {
            const langName = chrome.i18n.getMessage(value) || value;
            showStatus(`Primary language set to: ${langName}`, 'success');
        });
    });

    if (elements.targetLanguages.secondTargetLanguageSelect) {
        elements.targetLanguages.secondTargetLanguageSelect.addEventListener('change', () => {
            const value = elements.targetLanguages.secondTargetLanguageSelect.value;
            chrome.storage.local.set({ secondTargetLanguage: value }, () => {
                const displayName = value ? (chrome.i18n.getMessage(value) || value) : 'None';
                showStatus(`Second language set to: ${displayName}`, 'success');
            });
        });
    }
    populateLanguages();
    loadAllSettings();
});
