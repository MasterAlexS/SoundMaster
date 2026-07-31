# Sound Master 🎛️🔊

A powerful, lightweight, and strictly privacy-focused advanced audio control extension for **Mozilla Firefox** and **Google Chrome**. 

Built natively with Manifest V3 and the Web Audio API, this extension was developed using the highly-optimized core of [Volume Booster](https://github.com/MasterAlexS/VolumeBooster) as a foundation. It takes browser audio control to the next level by adding professional features like a Multi-Band Equalizer, an Anti-Distortion Compressor, and Audio Balance controls, all while maintaining absolute zero background resource drain.

---

## ✨ Features

* **Advanced Audio Controls:**
    * **10-Band Equalizer:** Fine-tune frequencies from 32Hz to 16kHz to perfectly match your headphones or speakers.
    * **EQ Profiles:** Export and import your custom Equalizer settings as `.json` files to share or backup.
    * **Anti-Distortion Compressor:** A dynamic compressor that prevents audio clipping and distortion when boosting volume.
    * **Audio Balance (L/R):** Adjust the panning between the left and right audio channels.
    * **Mono Mode:** Force stereo audio into a single mono channel (great for podcasts or hearing accessibility).
    * **Bass Boost:** Dedicated slider for punchy low-frequency enhancement.
* **Volume Amplification:**
    * 🟢 **Standard Mode:** Boost up to **600%** (Safe, high-quality amplification).
    * 🔴 **Extreme Mode:** Unlock the limit up to **1000%** for those ultra-quiet videos.
* **Smart Domain Memory:** The extension remembers your volume and EQ settings for specific websites (e.g., youtube.com). If you close a tab and come back later, your preferences remain intact.
* **Customizable Keyboard Shortcuts:** Quickly adjust volume, toggle boost, or trigger the "Panic Mute" feature to instantly mute all background tabs.
* **Universal Translation (56 Languages):** Full support for almost every major language worldwide. A custom-built manual language selector in the UI allows you to change the extension's language instantly on the fly.
* **Smart Audio Routing (CPU Optimized):** Automatically detects new videos and dynamically bypasses unused audio nodes. When effects are disabled, the routing physically bypasses the Web Audio API to ensure **0% CPU usage**.
* **Dynamic UI:** Clean, responsive design with manual toggle for **Dark Mode** (Default) and **Light Mode**.
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
