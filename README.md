# Sound Master 🎛️🔊

A powerful, lightweight, and strictly privacy-focused advanced audio control extension for **Mozilla Firefox** and **Google Chrome**. 

Built natively with Manifest V3 and the Web Audio API, this extension was developed using the highly-optimized core of [Volume Booster](https://github.com/MasterAlexS/VolumeBooster) as a foundation. It takes browser audio control to the next level by adding professional features like a Multi-Band Equalizer, an Anti-Distortion Compressor, and Audio Balance controls, all while maintaining absolute zero background resource drain.

---

## ✨ Features

* **Advanced Audio Controls:**
    * **10-Band Equalizer:** Fine-tune frequencies from 32Hz to 16kHz to perfectly match your headphones or speakers.
    * **EQ Profiles (Predefined & Custom):** Includes classic predefined presets (Acoustic, Pop, Rock, etc.) and allows you to create, save, and delete your own custom presets locally!
    * **Anti-Distortion Compressor:** A dynamic compressor that prevents audio clipping and distortion when boosting volume.
    * **Pitch Shifter:** Alter the pitch/tonality of the audio dynamically in real-time.
    * **Playback Speed Controller:** Granular control over the video/audio speed (from 0.1x to 10.0x).
    * **Concert Hall (3D Reverb):** Add immersive spatial reverb effects to any audio.
    * **Audio Balance (L/R) & Mono Mode:** Adjust panning between left and right channels, or force stereo audio into a single mono channel.
    * **Bass Boost:** Dedicated slider for punchy low-frequency enhancement.
    * **A/B Bypass Toggle:** Instantly toggle all audio effects on/off to compare the processed sound with the original.
* **Volume Amplification:**
    * 🟢 **Standard Mode:** Boost up to **600%** (Safe, high-quality amplification).
    * 🔴 **Extreme Mode:** Unlock the limit up to **1000%** for those ultra-quiet videos.
* **Universal Translation (56 Languages):** Full support for almost every major language worldwide. A custom-built manual language selector in the UI allows you to change the extension's language instantly on the fly.
* **Smart Domain Memory & Sync:** The extension remembers your volume and EQ settings for specific websites (e.g., youtube.com). Includes a **"Sync All Tabs"** utility to instantly apply your current settings to all open tabs of the same domain.
* **Iframe Support:** Seamlessly processes audio for embedded video players (e.g., YouTube videos embedded on third-party blogs or news sites).
* **Smart Audio Routing (CPU & SPA Optimized):** Automatically detects new videos and dynamically bypasses unused audio nodes. Fully optimized for Single Page Applications (SPAs) like YouTube, ensuring effects transition seamlessly between videos. When effects are disabled, the routing physically bypasses the Web Audio API to ensure **0% CPU usage**.
* **Dynamic UI & Smart Interactions:** Clean, responsive design with manual toggle for **Dark Mode** (Default) and **Light Mode**. Sliders intelligently disable their respective effects when returned to default values to optimize workflow.
* **Customizable Keyboard Shortcuts:** Quickly adjust volume, toggle boost, or trigger the "Panic Mute" feature to instantly mute all background tabs.
* **Import/Export EQ Presets:** Share your custom 10-Band Equalizer setups with others or back them up locally via JSON files, complete with format validation.
* **Cross-Browser Native:** Carefully engineered to support strict JS environments and perform identically on both Firefox and Chromium-based browsers (Chrome, Edge, Brave, ...).
* **Privacy First:** No tracking, no data collection, and no external server calls. See our [Privacy Policy](PRIVACY.md) for full details.

---

## 🛠 Installation

Because this extension is cross-browser compatible, you can install it manually on either Firefox or Chrome:

### **Mozilla Firefox**
1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `manifest.json` file from the extracted project folder.
*(Note: For permanent Firefox installation, you must zip the files into an `.xpi` format, go to `about:config`, set `xpinstall.signatures.required` to `false`, and install it via `about:addons` > Install Add-on From File).*

### **Google Chrome / Microsoft Edge / Brave / ...**
1. Download the repository as a ZIP and extract it to a folder.
2. Open your browser and go to `chrome://extensions/` (or `edge://extensions/`).
3. Turn on **Developer mode** (usually a toggle in the top-right corner).
4. Click **Load unpacked** and select the folder you extracted in step 1.

---

## 🔒 Permissions Explained

To provide reliable audio manipulation while maintaining strict privacy, this extension requires only the absolute minimum permissions:
* **`activeTab`**: To identify the specific tab you want to modify when you open the popup and read the domain name for saving preferences locally.
* **`storage`**: To remember your language, theme preference, shortcuts, EQ settings, and volume levels across sessions locally on your machine.
* **`tabs`**: Required to locate and mute background tabs when using the "Panic Mute" keyboard shortcut.
* **Host Permission (`<all_urls>`)**: Strictly used to inject the audio processing script into the webpage (and its iframes) so it can locate and amplify the `<video>` or `<audio>` elements.

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features or find a bug, feel free to:
1.  **Fork** the project.
2.  Create your **Feature Branch** (`git checkout -b feature/AmazingFeature`).
3.  **Commit** your changes (`git commit -m 'Add some AmazingFeature'`).
4.  **Push** to the branch (`git push origin feature/AmazingFeature`).
5.  Open a **Pull Request**.

---

## ⚠️ Disclaimer

**Protect your hearing!** Prolonged use of extreme volume levels can damage your ears and your hardware (speakers/headphones). Use the **Extreme (1000%)** mode with caution. The author is not responsible for any damage caused by the misuse of this software.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
