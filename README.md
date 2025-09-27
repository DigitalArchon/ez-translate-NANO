Everything below is from the original Ez Translate for reference. Here are some notes regarding this fork:
1) Added NanoGPT support as they are my preferred provider. www.nano-gpt.com for more info.
2) The way image to text translation works is now totally different. I made the change, as very few vision models are also good at translations. Now you select your translation model and select a different OCR model. The OCR model simply gets converts the image to text and feeds it to your translation model to do the actual translation. IF your preferred translation model does support vision (like Chat GPT 4o for example) you can set the OCR model to be the same and it will skip the OCR step and send the image to your model directly.
3) For now I've removed the option to translate into a primary/secondary language, as I was having some trouble with it.
4) In most Chromium based browsers, everything works fine. In Brave however the Ctrl-Shift-S shortcut to do an image to text translation doesn't work. You have to manually click the button in the extension icon.
5) I have only properly tested OpenRouter, NanoGPT and Ollama to ensure everything works. I may have broken Gemini or SiliconFlow, but I have no plans to test or fix that (they also may work fine, I have no idea).
6) For OpenRouter, instead of only showing free models, you can now choose to view all models, or only free models.
7) For NanoGPT you can choose to view all models, or only the models free with a subscription.
8) For Ollama, it works, but you need to configure the environment with Environment="OLLAMA_ORIGINS=*" and it has to be done differently based on how you installed Ollama. In most cases you need to run "sudo systemctl edit ollama.service" and add that text to the top under [Service] then run "sudo systemctl daemon-reload" and
"sudo systemctl restart ollama". But your milage may vary.

Finally, for those using NanoGPT with a subscription, I personally recommend/use DeepSeek 3.1 for translation and GLM4.5V-FP8 for OCR, as both are included in the subscription and I find that the best combo.

Following is the original readme:

<div align="center">
  <img src="icons/icon128.png" alt="EZ Translate Logo" width="128" height="128">
  <h1>EZ Translate: Smart Browser Translation Plugin</h1>
</div>

EZ Translate is a modern browser translation plugin that harnesses the power of Large Language Models (LLMs) to provide you with a more accurate, fluent, and context-aware web page translation experience.

Unlike traditional machine translation, this plugin aims to understand the nuances of language through advanced AI technology, generating high-quality translations to help you easily overcome language barriers and efficiently access global information.

[查看中文版本 (View Chinese Version)](README_zh.md)

## Supported LLM Providers

<div align="center">
  <table>
    <tr>
      <td align="center" width="200" height="200">
        <a href="https://ai.google.dev/" target="_blank">
          <img src="logos/google-gemini.png" alt="Google Gemini" width="200"><br>
          <strong>Google Gemini</strong><br>
          <small>Advanced AI model by Google</small>
        </a>
      </td>
      <td align="center" width="200" height="200">
        <a href="https://cloud.siliconflow.cn/" target="_blank">
          <img src="logos/siliconflow.png" alt="Silicon Flow" width="200"><br>
          <strong>Silicon Flow</strong><br>
          <small>Chinese AI platform</small>
        </a>
      </td>
      <td align="center"  width="200" height="200">
        <a href="https://openrouter.ai/" target="_blank">
          <img src="logos/openrouter.png" alt="OpenRouter" width="200"><br>
          <strong>OpenRouter</strong><br>
          <small>Unified AI model access</small>
        </a>
      </td>
      <td align="center" width="200" height="200">
        <a href="https://ollama.ai/" target="_blank">
          <img src="logos/ollama_logo.png" alt="Ollama" width="200"><br>
          <strong>Ollama</strong><br>
          <small>Local AI deployment</small>
        </a>
      </td>
    </tr>
  </table>
</div>

## Install via GitHub Releases (Manual)

This method is recommended if you cannot access the Chrome Web Store.

- Download the latest release `.zip` from GitHub Releases: [Latest Release](https://github.com/licon/llm-translate/releases/latest)
- Unzip the downloaded file
- Chrome/Edge/Brave (Chromium-based):
  - Open `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`)
  - Enable "Developer mode"
  - Click "Load unpacked" and select the unzipped folder that contains `manifest.json`
- Firefox:
  - Open `about:debugging#/runtime/this-firefox`
  - Click "Load Temporary Add-on..." and select the `manifest.json` inside the unzipped folder
- To update later: re-download the latest `.zip`, unzip, and click "Reload" on the extension page

## Core Features

*   **Multi-provider Support:** Supports configuring multiple Large Language Model providers (currently supports **Google Gemini**, **Silicon Flow**, **OpenRouter**, and **Ollama**), allowing you to freely choose the most suitable model.
*   **Instant Hover Translation:** Select text on any web page, and a translation icon will appear next to your mouse. Click it to see the translation result in place for a smooth and uninterrupted experience.
*   **🆕 Context Menu Translation:** Right-click on selected text to access translation options directly from the context menu. Choose between your primary or secondary target language for instant translation in a centered popup window.
*   **📸 Screenshot Translation:** Capture any area of the webpage and translate text within images using AI vision capabilities. Perfect for translating text in images, PDFs, or screenshots.
*   **⌨️ Keyboard Shortcuts:** Use `Ctrl+Shift+S` (Windows/Linux) or `Command+Shift+S` (Mac) to quickly activate screenshot translation mode.
*   **Quick Popup Translation:** Click the browser toolbar icon to quickly enter or paste text for translation in a popup window.
*   **Smart Auto-fill:** After selecting text, open the popup, and the selected text will be automatically filled into the input box, simplifying the operation.
*   **One-Click Copy:** Copy translation results instantly with the built-in copy button, complete with visual feedback and multi-language support.
*   **Secure Local Storage:** All API keys are securely stored in your local browser and are never uploaded.
*   **Read Aloud and Copy:** In the popup window, you can read the input and output text aloud, and you can also copy the translation result with one click for convenient operation.
*   **Smart Target Language Settings:** Configure default and second target languages for intelligent translation switching.
*   **Intelligent Language Detection:** Automatically detects when source language matches target language and switches to second target language.
*   **Comprehensive Language Support:** Supports 100+ languages with native translations for all interface elements.


## Features to Implement
*   **Custom Translation Styles:** Allow users to customize translation tone (formal, casual, technical, etc.).
*   **Translation History:** Track and manage translation history with search and export capabilities.
*   **Customizable Keyboard Shortcuts:** Allow users to customize keyboard shortcuts for different actions.
*   **Offline Mode:** Enable basic translation functionality when internet connection is unavailable.
*   **Advanced Settings Panel:** Enhanced configuration options for power users.
*   **Dark Mode:** Implement dark theme support for better user experience in low-light environments.

## Target Language Settings

EZ Translate now features intelligent target language management to enhance your translation experience:

### **Default Target Language**
- Set your preferred target language that syncs with the popup interface
- Automatically used for all translation requests
- Easily changeable through the settings page

### **Second Target Language**
- Configure an additional target language for quick switching
- Automatically activated when source language matches your default target
- Perfect for bilingual users or when translating between similar languages

### **Smart Language Detection**
- Automatically detects the source language of your text
- Intelligently switches to second target language when source = default target
- Prevents redundant translations and improves efficiency

### **Example Use Cases**
- **English ↔ Chinese**: Set English as default, Chinese as second target
- **Spanish ↔ Portuguese**: Set Spanish as default, Portuguese as second target  
- **German ↔ English**: Set German as default, English as second target

## Translation Methods

EZ Translate offers multiple convenient ways to translate text on web pages:

### 🖱️ **Context Menu Translation (NEW)**
1. **Select text** on any webpage
2. **Right-click** to open the context menu
3. **Choose from translation options:**
   - "Translate to [Primary Language]" - Uses your default target language
   - "Translate to [Secondary Language]" - Uses your second target language
   - "Open Settings" - Quick access to configuration
4. **View results** in a centered popup with original text and translation
5. **Copy instantly** using the built-in copy button

**Benefits:**
- Fastest translation method with minimal clicks
- Direct access without additional UI elements
- Dynamic menu labels showing current language settings
- Professional popup design with copy functionality

### 📍 **Hover Translation**
1. **Select text** on any webpage
2. **Translation icon appears** near your selection
3. **Click the icon** to see translation results
4. **Copy or interact** with the result as needed

### 🔲 **Popup Translation**
1. **Click the extension icon** in your browser toolbar
2. **Enter or paste text** in the input field
3. **Click translate** to get results
4. **Use additional features** like text-to-speech

### 📸 **Screenshot Translation (NEW)**
1. **Click the screenshot icon** in the popup or use keyboard shortcut `Ctrl+Shift+S` / `Command+Shift+S`
2. **Select an area** on the webpage by dragging your mouse
3. **Click "Translate"** in the selection toolbar
4. **View results** in a popup with recognized text and translation
5. **Copy the translation** using the built-in copy button

**Benefits:**
- Translate text in images, PDFs, and screenshots
- AI-powered multimodal recognition for accurate text understanding
- Works with any visual content on web pages
- Quick keyboard shortcut for instant access

### ⚡ **Smart Features**
- **Auto-fill**: Selected text automatically fills popup input
- **Language detection**: Automatically switches between target languages
- **Copy protection**: Enhanced popup stability for text selection
- **Keyboard shortcuts**: ESC key to close popups quickly
- **Screenshot shortcuts**: `Ctrl+Shift+S` / `Command+Shift+S` for instant screenshot mode

## Tech Stack

*   **Frontend:** `HTML`, `CSS`, `JavaScript`
*   **Browser API:** `WebExtensions API` (compatible with modern browsers like Chrome, Firefox, Edge, etc.)
*   **Speech Synthesis:** `Web Speech API`

## Provider Details

### 🌐 OpenRouter Integration (NEW)

EZ Translate now supports **OpenRouter**, a unified API platform that provides access to hundreds of AI models from different providers:

**Key Features:**
- **🆓 Free Models Only**: Automatically filters to show only free models with "free" in their names
- **🖼️ Image Support**: Only displays models that support image input for screenshot translation
- **🎯 Smart Filtering**: Combines both criteria to show the most suitable models for translation tasks
- **🔄 Unified Access**: Single API key to access models from OpenAI, Anthropic, Google, Meta, and more
- **📊 Model Variety**: Choose from different model families and sizes based on your needs

**Getting Started:**
1. Visit [OpenRouter](https://openrouter.ai/keys) to get your API key
2. In EZ Translate settings, switch to the "OpenRouter" tab
3. Enter your API key and click "Fetch Models"
4. Select from the filtered list of free, image-capable models

**Recommended OpenRouter Models:**
- `meta-llama/llama-4-scout:free` - High-quality Llama model
- `google/gemma-3-27b-it:free` - Latest Gemini with vision support
- `qwen/qwen2.5-vl-32b-instruct:free` - Qwen's advanced reasoning capabilities

## Recommended Models

### Free Models by Provider

| Provider | Recommended Models | Notes |
|----------|-------------------|-------|
| **Google Gemini** | `gemma3:12b`<br>`gemma3:4b`<br>`gemma3n` | Free models, recommend Gemma 3 12B |
| **Silicon Flow** | `qwen3:8b`<br>`glm-4:9b`<br>`qwen2.5:7b` | Free models, recommend Qwen3-8B |
| **OpenRouter** | `meta-llama/llama-4-scout:free`<br>`google/gemma-3-27b-it:free`<br>`qwen/qwen2.5-vl-32b-instruct:free` | Free models with image support, auto-filtered |
| **Ollama (Local)** | `qwen2:1.5b`<br>`llama3.1:8b`<br>`gemma2:2b` | Download and run locally |

### Model Selection Tips

* **For Speed**: Choose smaller models (1.5B-3B parameters)
* **For Quality**: Choose larger models (7B+ parameters)  
* **For Privacy**: Use Ollama with local models
* **For Cost**: All listed models are free to use
* **For Variety**: Use OpenRouter to access hundreds of free models from different providers

*Last updated: September 19, 2025*

## Translation Quality Comparison

See how EZ Translate compares to other translation tools in terms of accuracy and fluency:

### English to Chinese Translation Examples

| Original Text | Google Translate API | EZ Translate |
|---------------|------------------|---------------|
| "Supports one-time, recurring, and usage-based pricing models. Learn more about Subscriptions, Usage-based billing, and Invoicing." | "支持一次性，经常性和基于用法的定价模型。了解有关订阅，基于使用的计费和发票的更多信息。" | ✅ "支持一次性、周期性和基于使用情况的定价模型。了解更多关于订阅、基于使用情况的计费和发票的信息。" |
| "If you're residing in one of China's territories, please select an option for your specific location. You won't be able to change it later." | "如果您居住在中国的一个领土之一，请为您的特定位置选择一个选项。您将稍后再进行更改。" | ✅ "如果您居住在中国的某个地区，请选择您所在的具体位置。您将无法在之后更改它。" |
| "Super cool design and the app idea is a no brainer. Good work" | "超级酷的设计和应用程序的想法是无关紧要的。做得好" | ✅ "超酷的设计，这个应用的想法非常直观。做得好" |

### Key Advantages

* **Context Awareness**: EZ Translate understands context better than traditional MT
* **Natural Fluency**: More natural and fluent translations that sound human-written
* **Cultural Nuances**: Better handling of cultural expressions and idioms
* **Technical Accuracy**: Superior translation of technical and specialized content
* **Consistency**: More consistent terminology across different contexts

*Note: Translation quality may vary depending on the selected model and provider.*
