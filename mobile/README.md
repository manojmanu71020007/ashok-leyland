# Ashok Leyland EV Fleet & Depot Tracking — Native Mobile App

Dedicated Cross-Platform Mobile Application (Android & iOS) built with **React Native** and **Expo**, connecting to the Ashok Leyland Depot & Fleet Tracking backend.

---

## 🚀 Features

- **Fleet Dashboard:** Real-time bus cards, live Battery SoC progress bars, status badges, and depot filtering (Depot 1 / Depot 2 / Both).
- **Instant SoC Updating:** Quick modal for depot floor operators to confirm manual SoC with +/- 5%, +/- 10%, and 100% full charge shortcuts.
- **Depot Operations:** Dedicated views for Charging Bays, Cleaning Lanes, and Available Fleet.
- **Dispatch Allocator:** Route feasibility matching (Category A / B / C bus allocation matrix) with real-time drain calculations and return SoC predictions.
- **Network Settings:** Switch between the live cloud server (`https://ashok-leyland-bus-tracking.onrender.com`) and local LAN servers with one tap.

---

## 📱 How to Run & Test on Your Phone (in 60 seconds)

### Step 1: Install Dependencies
Open a terminal in the `mobile` folder:
```bash
cd mobile
npm install
```

### Step 2: Start the Expo Development Server
To share with your friend who is remote, start with a cloud tunnel:
```bash
npx expo start --tunnel
```

### Step 3: Open on Your Phone
1. Install the free **Expo Go** app from **Google Play Store** (Android) or **Apple App Store** (iOS).
2. Scan the QR code displayed in your terminal.
3. The app opens immediately on your phone with live reload!

---

## 📦 How to Build Standalone Android `.apk` (Send to Friend)

To generate a direct installable `.apk` file that you can send via WhatsApp or Google Drive:

1. Log into your free Expo account:
   ```bash
   npx eas login
   ```
2. Build the APK:
   ```bash
   npx eas build -p android --profile preview
   ```
3. Expo builds the APK in the cloud and provides a direct `.apk` download link!
