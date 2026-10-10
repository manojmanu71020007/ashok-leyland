/**
 * Ashok Leyland Bus Tracking System - Internationalization (i18n) Engine
 * Supported Languages: English (en), Kannada (kn), Hindi (hi), Telugu (te), Tamil (ta)
 */

(function () {
    "use strict";

    const LANGUAGES = [
        { code: "en", name: "English", native: "English" },
        { code: "kn", name: "Kannada", native: "ಕನ್ನಡ (Kannada)" },
        { code: "hi", name: "Hindi", native: "हिन्दी (Hindi)" },
        { code: "te", name: "Telugu", native: "తెలుగు (Telugu)" },
        { code: "ta", name: "Tamil", native: "தமிழ் (Tamil)" }
    ];

    const TRANSLATIONS = {
        // ── Brand & Navigation ──
        "brand_name": {
            en: "Ashok Leyland BTS",
            kn: "ಅಶೋಕ್ ಲೇಲ್ಯಾಂಡ್ ಬಿಟಿಎಸ್",
            hi: "अशोक लीलैंड बीटीएस",
            te: "అశోక్ లేలాండ్ బిటిఎస్",
            ta: "அசோக் லேலண்ட் பிடிஎஸ்"
        },
        "nav_login": {
            en: "🔐 Login",
            kn: "🔐 ಲಾಗಿನ್",
            hi: "🔐 लॉगिन",
            te: "🔐 లాగిన్",
            ta: "🔐 உள்நுழைக"
        },
        "nav_logout": {
            en: "Sign Out",
            kn: "ಸೈನ್ ಔಟ್",
            hi: "साइन आउट",
            te: "సైన్ అవుట్",
            ta: "வெளியேறு"
        },
        "nav_admin": {
            en: "Admin Workspace",
            kn: "ನಿರ್ವಾಹಕ ಕಾರ್ಯಕ್ಷೇತ್ರ",
            hi: "व्यवस्थापक कार्यक्षेत्र",
            te: "అడ్మిన్ వర్క్‌స్పేస్",
            ta: "நிர்வாக பணியிடம்"
        },
        "nav_scheduling": {
            en: "Scheduling",
            kn: "ವೇಳಾಪಟ್ಟಿ",
            hi: "शेड्यूलिंग",
            te: "షెడ్యూలింగ్",
            ta: "அட்டவணைப்படுத்துதல்"
        },
        "nav_charging": {
            en: "Charging",
            kn: "ಚಾರ್ಜಿಂಗ್",
            hi: "चार्जिंग",
            te: "ఛార్జింగ్",
            ta: "சார்ஜிங்"
        },
        "nav_cleaning": {
            en: "Cleaning",
            kn: "ಸ್ವಚ್ಛಗೊಳಿಸುವಿಕೆ",
            hi: "सफाई",
            te: "ಕ್ಲೀನಿಂಗ್",
            ta: "சுத்தம் செய்தல்"
        },
        "nav_back_portal": {
            en: "← Back to Portal",
            kn: "← ಪೋರ್ಟಲ್‌ಗೆ ಹಿಂತಿರುಗಿ",
            hi: "← पोर्टल पर लौटें",
            te: "← పోర్టల్‌కి తిరిగి వెళ్లండి",
            ta: "← போர்ட்டலுக்குத் திரும்பு"
        },
        "nav_back_admin": {
            en: "Return to Admin Hub",
            kn: "ನಿರ್ವಾಹಕ ಕೇಂದ್ರಕ್ಕೆ ಹಿಂತಿರುಗಿ",
            hi: "व्यवस्थापक हब पर लौटें",
            te: "అడ్మిన్ హబ్‌కి తిరిగి వెళ్లండి",
            ta: "நிர்வாக மையத்திற்குத் திரும்பு"
        },

        // ── Passenger Tracking (index.html) ──
        "tracking_title": {
            en: "Bus Tracking System",
            kn: "ಬಸ್ ಟ್ರ್ಯಾಕಿಂಗ್ ವ್ಯವಸ್ಥೆ",
            hi: "बस ट्रैकिंग सिस्टम",
            te: "బస్సు ట్రాకింగ్ సిస్టమ్",
            ta: "பேருந்து கண்காணிப்பு அமைப்பு"
        },
        "tracking_subtitle": {
            en: "Find and Track Buses in Real-Time across Bangalore",
            kn: "ಬೆಂಗಳೂರಿನಾದ್ಯಂತ ನೈಜ ಸಮಯದಲ್ಲಿ ಬಸ್‌ಗಳನ್ನು ಹುಡುಕಿ ಮತ್ತು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
            hi: "बैंगलोर में वास्तविक समय में बसों को खोजें और ट्रैक करें",
            te: "బెంగళూరు అంతటా రియల్ టైమ్‌లో బస్సులను కనుగొనండి మరియు ట్రాక్ చేయండి",
            ta: "பெங்களூரு முழுவதும் நிகழ்நேரத்தில் பேருந்துகளைக் கண்டறிந்து கண்காணிக்கவும்"
        },
        "label_bus_number": {
            en: "🔢 Bus Number",
            kn: "🔢 ಬಸ್ ಸಂಖ್ಯೆ",
            hi: "🔢 बस नंबर",
            te: "🔢 బస్సు నంబర్",
            ta: "🔢 பேருந்து எண்"
        },
        "placeholder_bus_number": {
            en: "401-A",
            kn: "401-A",
            hi: "401-A",
            te: "401-A",
            ta: "401-A"
        },
        "badge_optional": {
            en: "Optional",
            kn: "ಐಚ್ಛಿಕ",
            hi: "वैकल्पिक",
            te: "ఐచ్ఛికం",
            ta: "விருப்பமானது"
        },
        "label_origin": {
            en: "📍 Origin",
            kn: "📍 ಆರಂಭಿಕ ಸ್ಥಳ",
            hi: "📍 प्रारंभिक स्थान",
            te: "📍 ప్రారంభ స్థానం",
            ta: "📍 தொடக்க இடம்"
        },
        "placeholder_origin": {
            en: "Enter starting point",
            kn: "ಪ್ರಾರಂಭದ ಸ್ಥಳವನ್ನು ನಮೂದಿಸಿ",
            hi: "प्रारंभिक बिंदु दर्ज करें",
            te: "ప్రారంభ బిందువును నమోదు చేయండి",
            ta: "தொடக்கப் புள்ளியை உள்ளிடவும்"
        },
        "label_destination": {
            en: "🏁 Destination",
            kn: "🏁 ಗಮ್ಯಸ್ಥಾನ",
            hi: "🏁 गंतव्य",
            te: "🏁 గమ్యಸ್ಥానం",
            ta: "🏁 சேருமிடம்"
        },
        "placeholder_destination": {
            en: "Enter destination",
            kn: "ಗಮ್ಯಸ್ಥಾನವನ್ನು ನಮೂದಿಸಿ",
            hi: "गंतव्य दर्ज करें",
            te: "గమ్యాన్ని నమోదు చేయండి",
            ta: "சேருமிடத்தை உள்ளிடவும்"
        },
        "btn_search_buses": {
            en: "🔍 Search Buses",
            kn: "🔍 ಬಸ್‌ಗಳನ್ನು ಹುಡುಕಿ",
            hi: "🔍 बसें खोजें",
            te: "🔍 బస్సులను శోధించండి",
            ta: "🔍 பேருந்துகளைத் தேடு"
        },
        "btn_show_all_buses": {
            en: "🚌 Show All Buses",
            kn: "🚌 ಎಲ್ಲಾ ಬಸ್‌ಗಳನ್ನು ತೋರಿಸಿ",
            hi: "🚌 सभी बसें दिखाएं",
            te: "🚌 అన్ని బస్సులను చూపించు",
            ta: "🚌 அனைத்து பேருந்துகளையும் காட்டு"
        },
        "locked_tracking_banner_title": {
            en: "🔒 Locked Buses (Cleaning / Charging) — Excluded from live tracking:",
            kn: "🔒 ಲಾಕ್ ಆದ ಬಸ್‌ಗಳು (ಸ್ವಚ್ಛತೆ / ಚಾರ್ಜಿಂಗ್) — ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್‌ನಿಂದ ಹೊರಗಿಡಲಾಗಿದೆ:",
            hi: "🔒 लॉक की गई बसें (सफाई / चार्जिंग) — लाइव ट्रैकिंग से बाहर:",
            te: "🔒 లాక్ చేయబడిన బస్సులు (క్లీనింగ్ / ఛార్జింగ్) — లైవ్ ట్రాకింగ్ నుండి మినహాయించబడ్డాయి:",
            ta: "🔒 பூட்டப்பட்ட பேருந்துகள் (சுத்தம் / சார்ஜிங்) — நேரலை கண்காணிப்பிலிருந்து விலக்கப்பட்டுள்ளது:"
        },
        "heading_available_buses": {
            en: "🚌 Available Buses",
            kn: "🚌 ಲಭ್ಯವಿರುವ ಬಸ್‌ಗಳು",
            hi: "🚌 उपलब्ध बसें",
            te: "🚌 అందుబాటులో ఉన్న బస్సులు",
            ta: "🚌 கிடைக்கும் பேருந்துகள்"
        },
        "live_indicator": {
            en: "Live",
            kn: "ಲೈವ್",
            hi: "लाइव",
            te: "లైవ్",
            ta: "நேரலை"
        },
        "heading_bus_details": {
            en: "📋 Bus Details",
            kn: "📋 ಬಸ್ ವಿವರಗಳು",
            hi: "📋 बस विवरण",
            te: "📋 బస్సు వివరాలు",
            ta: "📋 பேருந்து விவரங்கள்"
        },
        "empty_select_bus": {
            en: "Select a bus card above to view its details",
            kn: "ವಿವರಗಳನ್ನು ನೋಡಲು ಮೇಲಿನ ಬಸ್ ಕಾರ್ಡ್ ಅನ್ನು ಆಯ್ಕೆಮಾಡಿ",
            hi: "विवरण देखने के लिए ऊपर दिए गए बस कार्ड का चयन करें",
            te: "వివరాలను చూడటానికి పై బస్సు కార్డును ఎంచుకోండి",
            ta: "விவரங்களைக் காண மேலே உள்ள பேருந்து அட்டையைத் தேர்ந்தெடுக்கவும்"
        },
        "heading_route_details": {
            en: "🚏 Route Details",
            kn: "🚏 ಮಾರ್ಗ ವಿವರಗಳು",
            hi: "🚏 रूट विवरण",
            te: "🚏 రూట్ వివరాలు",
            ta: "🚏 வழித்தட விவரங்கள்"
        },
        "empty_route_stops": {
            en: "Route stops will appear here once you select a bus",
            kn: "ನೀವು ಬಸ್ ಆಯ್ಕೆ ಮಾಡಿದ ನಂತರ ಮಾರ್ಗದ ನಿಲ್ದಾಣಗಳು ಇಲ್ಲಿ ಗೋಚರಿಸುತ್ತವೆ",
            hi: "एक बार जब आप बस चुनते हैं तो रूट स्टॉप यहां दिखाई देंगे",
            te: "మీరు బస్సును ఎంచుకున్న తర్వాత రూట్ స్టాప్‌లు ఇక్కడ కనిపిస్తాయి",
            ta: "நீங்கள் பேருந்தைத் தேர்ந்தெடுத்ததும் வழித்தட நிறுத்தங்கள் இங்கே தோன்றும்"
        },
        "heading_route_map": {
            en: "🗺️ Route Map",
            kn: "🗺️ ಮಾರ್ಗ ನಕ್ಷೆ",
            hi: "🗺️ रूट मैप",
            te: "🗺️ రూట్ మ్యాప్",
            ta: "🗺️ வழித்தட வரைபடம்"
        },
        "map_hint": {
            en: "Click a bus card to plot its route",
            kn: "ಮಾರ್ಗವನ್ನು ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಲು ಬಸ್ ಕಾರ್ಡ್ ಕ್ಲಿಕ್ ಮಾಡಿ",
            hi: "रूट देखने के लिए बस कार्ड पर क्लिक करें",
            te: "రూట్‌ను ప్లాట్ చేయడానికి బస్సు కార్డుపై క్లిక్ చేయండి",
            ta: "அதன் வழித்தடத்தைக் காண பேருந்து அட்டையைக் கிளிக் செய்யவும்"
        },
        "footer_title": {
            en: "Ashok Leyland Bus Tracking System",
            kn: "ಅಶೋಕ್ ಲೇಲ್ಯಾಂಡ್ ಬಸ್ ಟ್ರ್ಯಾಕಿಂಗ್ ವ್ಯವಸ್ಥೆ",
            hi: "अशोक लीलैंड बस ट्रैकिंग सिस्टम",
            te: "అశోక్ లేలాండ్ బస్సు ట్రాకింగ్ సిస్టమ్",
            ta: "அசோக் லேலண்ட் பேருந்து கண்காணிப்பு அமைப்பு"
        },
        "footer_subtitle": {
            en: "Real-time fleet tracking for Bangalore",
            kn: "ಬೆಂಗಳೂರಿಗಾಗಿ ನೈಜ-ಸಮಯದ ಫ್ಲೀಟ್ ಟ್ರ್ಯಾಕಿಂಗ್",
            hi: "बैंगलोर के लिए वास्तविक समय बेड़ा ट्रैकिंग",
            te: "బెంగళూరు కోసం రియల్ టైమ్ ఫ్లీట్ ట్రాకింగ్",
            ta: "பெங்களூருக்கான நிகழ்நேர வாகன கண்காணிப்பு"
        },
        "footer_link_login": {
            en: "Login / Admin",
            kn: "ಲಾಗಿನ್ / ನಿರ್ವಾಹಕ",
            hi: "लॉगिन / व्यवस्थापक",
            te: "లాగిన్ / అడ్మిన్",
            ta: "உள்நுழைவு / நிர்வாகி"
        },

        // ── Authentication & Portal (login.html) ──
        "quick_access_portal": {
            en: "Quick Access Portal",
            kn: "ತ್ವರಿತ ಪ್ರವೇಶ ಪೋರ್ಟಲ್",
            hi: "त्वरित पहुँच पोर्टल",
            te: "త్వరిత యాక్సెస్ పోర్టల్",
            ta: "விரைவு அணுகல் போர்டல்"
        },
        "tile_charging": {
            en: "Charging",
            kn: "ಚಾರ್ಜಿಂಗ್",
            hi: "चार्जिंग",
            te: "ఛార్జింగ్",
            ta: "சார்ஜிங்"
        },
        "tile_charging_sub": {
            en: "Log sessions",
            kn: "ಸೆಷನ್‌ಗಳನ್ನು ದಾಖಲಿಸಿ",
            hi: "सत्र लॉग करें",
            te: "సెషన్‌లను లాగ్ చేయండి",
            ta: "அமர்வுகளை பதிவுசெய்க"
        },
        "tile_cleaning": {
            en: "Cleaning",
            kn: "ಸ್ವಚ್ಛಗೊಳಿಸುವಿಕೆ",
            hi: "सफाई",
            te: "ಕ್ಲೀನಿಂಗ್",
            ta: "சுத்தம் செய்தல்"
        },
        "tile_cleaning_sub": {
            en: "Status record",
            kn: "ಸ್ಥಿತಿ ದಾಖಲೆ",
            hi: "स्थिति रिकॉर्ड",
            te: "స్థితి రికార్డు",
            ta: "நிலை பதிவு"
        },
        "tile_scheduling": {
            en: "Scheduling",
            kn: "ವೇಳಾಪಟ್ಟಿ",
            hi: "शेड्यूलिंग",
            te: "షెడ్యూలింగ్",
            ta: "அட்டவணைப்படுத்துதல்"
        },
        "tile_scheduling_sub": {
            en: "Smart allocation",
            kn: "ಸ್ಮಾರ್ಟ್ ಹಂಚಿಕೆ",
            hi: "स्मार्ट आवंटन",
            te: "స్మార్ట్ కేటాయింపు",
            ta: "ಸ್ಮಾರ್ಟ್ ஒதுக்கீடு"
        },
        "tab_signin": {
            en: "Sign In",
            kn: "ಸೈನ್ ಇನ್",
            hi: "साइन इन",
            te: "సైన్ ఇన్",
            ta: "உள்நுழைக"
        },
        "tab_signup": {
            en: "Sign Up",
            kn: "ಸೈನ್ ಅಪ್",
            hi: "साइन अप",
            te: "సైన్ అప్",
            ta: "பதிவு செய்க"
        },
        "login_title": {
            en: "Welcome Back",
            kn: "ಮರಳಿ ಸುಸ್ವಾಗತ",
            hi: "वापसी पर स्वागत है",
            te: "తిరిగి స్వాగతం",
            ta: "மீண்டும் வருக"
        },
        "login_sub": {
            en: "Sign in to your account to continue",
            kn: "ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ಖಾತೆಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ",
            hi: "जारी रखने के लिए अपने खाते में साइन इन करें",
            te: "కొనసాగడానికి మీ ఖాతాలోకి సైన్ ఇన్ చేయండి",
            ta: "தொடர உங்கள் கணக்கில் உள்நுழையவும்"
        },
        "btn_google_signin": {
            en: "Continue with Google",
            kn: "ಗೂಗಲ್‌ನೊಂದಿಗೆ ಮುಂದುವರಿಯಿರಿ",
            hi: "Google के साथ जारी रखें",
            te: "Googleతో కొనసాగించండి",
            ta: "Google உடன் தொடரவும்"
        },
        "divider_email": {
            en: "or sign in with email",
            kn: "ಅಥವಾ ಇಮೇಲ್ ಮೂಲಕ ಸೈನ್ ಇನ್ ಮಾಡಿ",
            hi: "या ईमेल से साइन इन करें",
            te: "లేదా ఇమెయిల్‌తో సైన్ ఇన్ చేయండి",
            ta: "அல்லது மின்னஞ்சல் மூலம் உள்நுழைக"
        },
        "label_email": {
            en: "Email Address",
            kn: "ಇಮೇಲ್ ವಿಳಾಸ",
            hi: "ईमेल पता",
            te: "ఇమెయిల్ చిరుನಾమా",
            ta: "மின்னஞ்சல் முகவரி"
        },
        "placeholder_email": {
            en: "Enter your email",
            kn: "ನಿಮ್ಮ ಇಮೇಲ್ ನಮೂದಿಸಿ",
            hi: "अपना ईमेल दर्ज करें",
            te: "మీ ఇమెయిల్‌ను నమోదు చేయండి",
            ta: "உங்கள் மின்னஞ்சலை உள்ளிடவும்"
        },
        "label_password": {
            en: "Password",
            kn: "ಗುಪ್ತಪದ",
            hi: "पासवर्ड",
            te: "పాస్‌వర్డ్",
            ta: "கடவுச்சொல்"
        },
        "placeholder_password": {
            en: "Enter your password",
            kn: "ನಿಮ್ಮ ಗುಪ್ತಪದ ನಮೂದಿಸಿ",
            hi: "अपना पासवर्ड दर्ज करें",
            te: "మీ పాస్‌వర్డ్‌ను నమోదు చేయండి",
            ta: "உங்கள் கடவுச்சொல்லை உள்ளிடவும்"
        },
        "link_forgot_password": {
            en: "Forgot password?",
            kn: "ಗುಪ್ತಪದ ಮರೆತಿರಾ?",
            hi: "पासवर्ड भूल गए?",
            te: "పాస్‌వర్డ్ మర్చిపోయారా?",
            ta: "கடவுச்சொல் மறந்துவிட்டதா?"
        },
        "btn_login_submit": {
            en: "Sign In",
            kn: "ಸೈನ್ ಇನ್",
            hi: "साइन इन",
            te: "సైన్ ఇన్",
            ta: "உள்நுழைக"
        },
        "signup_title": {
            en: "Create Account",
            kn: "ಖಾತೆ ರಚಿಸಿ",
            hi: "खाता बनाएं",
            te: "ఖాతాను సృష్టించండి",
            ta: "கணக்கை உருவாக்கவும்"
        },
        "signup_sub": {
            en: "Register for system access",
            kn: "ವ್ಯವಸ್ಥೆಯ ಪ್ರವೇಶಕ್ಕಾಗಿ ನೋಂದಾಯಿಸಿ",
            hi: "सिस्टम एक्सेस के लिए पंजीकरण करें",
            te: "సిస్టమ్ యాక్సెస్ కోసం నమోదు చేయండి",
            ta: "அணுகலுக்கு பதிவு செய்க"
        },
        "label_full_name": {
            en: "Full Name",
            kn: "ಪೂರ್ಣ ಹೆಸರು",
            hi: "पूरा नाम",
            te: "పూర్తి పేరు",
            ta: "முழு பெயர்"
        },
        "placeholder_full_name": {
            en: "Enter your full name",
            kn: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ",
            hi: "अपना पूरा नाम दर्ज करें",
            te: "మీ పూర్తి పేరును నమోదు చేయండి",
            ta: "உங்கள் முழு பெயரை உள்ளிடவும்"
        },
        "label_confirm_password": {
            en: "Confirm Password",
            kn: "ಗುಪ್ತಪದ ದೃಢೀಕರಿಸಿ",
            hi: "पासवर्ड की पुष्टि करें",
            te: "పాస్‌వర్డ్‌ను నిర్ధారించండి",
            ta: "கடவுச்சொல்லை உறுதிப்படுத்தவும்"
        },
        "placeholder_confirm_password": {
            en: "Re-enter your password",
            kn: "ಗುಪ್ತಪದವನ್ನು ಮತ್ತೆ ನಮೂದಿಸಿ",
            hi: "अपना पासवर्ड पुनः दर्ज करें",
            te: "మీ పాస్‌వర్డ్‌ను మళ్లీ నమోదు చేయండి",
            ta: "உங்கள் கடவுச்சொல்லை மீண்டும் உள்ளிடவும்"
        },
        "btn_signup_submit": {
            en: "Create Account",
            kn: "ಖಾತೆ ರಚಿಸಿ",
            hi: "खाता बनाएं",
            te: "ఖాతాను సృష్టించండి",
            ta: "கணக்கை உருவாக்கவும்"
        },

        // ── Smart Bus Allocation (schedulling.html) ──
        "depot_chandapura_eyebrow": {
            en: "BMTC Depot 32 • Chandapura",
            kn: "ಬಿಎಂಟಿಸಿ ಡಿಪೋ 32 • ಚಂದಾಪುರ",
            hi: "बीएमटीसी डिपो 32 • चंदापुरा",
            te: "బిఎంటీసి డిపో 32 • చందాపుర",
            ta: "பிஎம்டிசி பணிமனை 32 • சந்தாபுரா"
        },
        "smart_allocation_title": {
            en: "Smart Bus Allocation",
            kn: "ಸ್ಮಾರ್ಟ್ ಬಸ್ ಹಂಚಿಕೆ",
            hi: "स्मार्ट बस आवंटन",
            te: "స్మార్ట్ బస్సు కేటాయింపు",
            ta: "ஸ்மார்ட் பேருந்து ஒதுக்கீடு"
        },
        "smart_allocation_subtitle": {
            en: "Automatic battery-based vehicle allocation matching route length, shift timetable, and manually confirmed bus SOC.",
            kn: "ಮಾರ್ಗದ ಉದ್ದ, ಶಿಫ್ಟ್ ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ಖಚಿತಪಡಿಸಿದ ಬಸ್ ಬ್ಯಾಟರಿ ಎಸ್‌ಒಸಿಗೆ ಅನುಗುಣವಾಗಿ ಸ್ವಯಂಚಾಲಿತ ವಾಹನ ಹಂಚಿಕೆ.",
            hi: "रूट की लंबाई, शिफ्ट समय सारिणी और पुष्टि किए गए बस एसओसी से मेल खाने वाला स्वचालित वाहन आवंटन।",
            te: "రూట్ పొడవు, షిఫ్ట్ టైమ్‌టేబుల్ మరియు ధృవీకరించిన బస్సు ఎస్‌ఓసీకి సరిపోయే ఆటోమేటిక్ వాహన కేటాయింపు.",
            ta: "வழித்தட நீளம், ஷிப்ட் கால அட்டவணை மற்றும் உறுதிசெய்யப்பட்ட பேட்டரி எஸ்சிக்கு ஏற்ப தானியங்கி வாகன ஒதுக்கீடு."
        },
        "panel_schedule_req_title": {
            en: "Schedule requirement",
            kn: "ವೇಳಾಪಟ್ಟಿ ಅಗತ್ಯತೆ",
            hi: "शेड्यूल आवश्यकता",
            te: "షెడ్యూల్ అవసరం",
            ta: "அட்டவணை தேவை"
        },
        "panel_schedule_req_note": {
            en: "Define the next departure and let the allocation rules evaluate fleet readiness.",
            kn: "ಮುಂದಿನ ನಿರ್ಗಮನವನ್ನು ನಿರ್ಧರಿಸಿ ಮತ್ತು ಹಂಚಿಕೆ ನಿಯಮಗಳು ವಾಹನಗಳ ಸಿದ್ಧತೆಯನ್ನು ಪರಿಶೀಲಿಸಲು ಬಿಡಿ.",
            hi: "अगले प्रस्थान को परिभाषित करें और आवंटन नियमों को बेड़े की तैयारी का मूल्यांकन करने दें।",
            te: "తదుపరి బయలుదేరే సమయాన్ని నిర్వచించండి మరియు కేటాయింపు నియమాలు ఫ్లీట్ సంసిద్ధతను అంచనా వేయనివ్వండి.",
            ta: "அடுத்த புறப்பாட்டை வரையறுத்து, ஒதுக்கீட்டு விதிகள் வாகனங்களின் தயார்நிலையை மதிப்பிட அனுமதிக்கவும்."
        },
        "label_search_route": {
            en: "Search Route (Origin ➔ Destination)",
            kn: "ಮಾರ್ಗವನ್ನು ಹುಡುಕಿ (ಮೂಲ ➔ ಗಮ್ಯಸ್ಥಾನ)",
            hi: "रूट खोजें (प्रारंभ ➔ गंतव्य)",
            te: "రూట్‌ను శోధించండి (ప్రారంభం ➔ గమ్యస్థానం)",
            ta: "வழித்தடத்தைத் தேடுங்கள் (தொடக்க இடம் ➔ சேருமிடம்)"
        },
        "placeholder_search_route": {
            en: "Search route by origin or destination (e.g. Chandapura, Anekal, Hoskote, KBS...)",
            kn: "ಮೂಲ ಅಥವಾ ಗಮ್ಯಸ್ಥಾನದ ಮೂಲಕ ಹುಡುಕಿ (ಉದಾ. ಚಂದಾಪುರ, ಆನೇಕಲ್, ಹೊಸಕೋಟೆ, ಕೆಬಿಎಸ್...)",
            hi: "प्रारंभ या गंतव्य से रूट खोजें (उदा. चंदापुरा, अनेकल, होसकोटे, केबीएस...)",
            te: "ప్రారంభం లేదా గమ్యం ద్వారా రూట్‌ను శోధించండి (ఉదా. చందాపుర, అనేకల్, హోస్కోటే, కేబీఎస్...)",
            ta: "தொடக்க இடம் அல்லது சேருமிடம் மூலம் தேடவும் (எ.கா. சந்தாபுரா, அனேகல், ஹோஸ்கோட்...)"
        },
        "label_select_bus_route": {
            en: "Select Bus Route (Origin ➔ Destination)",
            kn: "ಬಸ್ ಮಾರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ (ಮೂಲ ➔ ಗಮ್ಯಸ್ಥಾನ)",
            hi: "बस रूट चुनें (प्रारंभ ➔ गंतव्य)",
            te: "బస్సు రూట్‌ను ఎంచుకోండి (ప్రారంభం ➔ గమ్యస్థానం)",
            ta: "பேருந்து வழித்தடத்தைத் தேர்ந்தெடுக்கவும் (தொடக்க இடம் ➔ சேருமிடம்)"
        },
        "label_route_length": {
            en: "Selected Route Length",
            kn: "ಆಯ್ಕೆಮಾಡಿದ ಮಾರ್ಗದ ಉದ್ದ",
            hi: "चयनित रूट की लंबाई",
            te: "ఎంచుకున్న రూట్ పొడవు",
            ta: "தேர்ந்தெடுக்கப்பட்ட வழித்தட நீளம்"
        },
        "label_time_slot": {
            en: "Current Time Slot",
            kn: "ಪ್ರಸ್ತುತ ಸಮಯದ ಸ್ಲಾಟ್",
            hi: "वर्तमान समय स्लॉट",
            te: "ప్రస్తుత సమయ స్లాట్",
            ta: "தற்போதைய நேர இடைவெளி"
        },
        "label_departure_time": {
            en: "Departure Time",
            kn: "ನಿರ್ಗಮನ ಸಮಯ",
            hi: "प्रस्थान समय",
            te: "బయలుదేరే సమయం",
            ta: "புறப்படும் நேரம்"
        },
        "manual_override_badge": {
            en: "⚠️ Manual Over-ride",
            kn: "⚠️ ಮ್ಯಾನುಯಲ್ ಓವರ್-ರೈಡ್",
            hi: "⚠️ मैनुअल ओवर-राइड",
            te: "⚠️ మాన్యువల్ ఓవర్-రైడ్",
            ta: "⚠️ மேனுவல் மேலெழுதல்"
        },
        "btn_reset_auto": {
            en: "Reset to Auto",
            kn: "ಆಟೋಗೆ ಮರುಹೊಂದಿಸಿ",
            hi: "ऑटो पर रीसेट करें",
            te: "ఆటోకు రీసెట్ చేయండి",
            ta: "தானியங்கிக்கு மீட்டமை"
        },
        "manual_override_hint_text": {
            en: "Departure time adjusted manually. Click 'Reset to Auto' to restore timetable default.",
            kn: "ನಿರ್ಗಮನ ಸಮಯವನ್ನು ಹಸ್ತಚಾಲಿತವಾಗಿ ಬದಲಾಯಿಸಲಾಗಿದೆ. ವೇಳಾಪಟ್ಟಿಯ ಸಮಯಕ್ಕೆ ಹಿಂತಿರುಗಲು 'ಆಟೋಗೆ ಮರುಹೊಂದಿಸಿ' ಕ್ಲಿಕ್ ಮಾಡಿ.",
            hi: "प्रस्थान समय मैन्युअल रूप से समायोजित किया गया। समय सारिणी पर लौटने के लिए 'ऑटो पर रीसेट करें' क्लिक करें।",
            te: "బయలుదేరే సమయం మాన్యువల్‌గా మార్చబడింది. టైమ్‌టేబుల్ డిఫాల్ట్‌కు పునరుద్ధరించడానికి 'ఆటోకు రీసెట్ చేయండి' క్లిక్ చేయండి.",
            ta: "புறப்படும் நேரம் கைமுறையாக மாற்றப்பட்டது. கால அட்டவணைக்கு திரும்ப 'தானியங்கிக்கு மீட்டமை' என்பதைக் கிளிக் செய்யவும்."
        },
        "candidate_buses_title": {
            en: "Candidate Buses For This Route & Time",
            kn: "ಈ ಮಾರ್ಗ ಮತ್ತು ಸಮಯಕ್ಕೆ ಅಭ್ಯರ್ಥಿ ಬಸ್‌ಗಳು",
            hi: "इस रूट और समय के लिए उम्मीदवार बसें",
            te: "ఈ రూట్ మరియు సమయానికి అభ్యర్థి బస్సులు",
            ta: "இந்த வழித்தடம் மற்றும் நேரத்திற்கான வேட்பாளர் பேருந்துகள்"
        },
        "candidate_buses_sub": {
            en: "2 to 3 optimal buses evaluated for this trip. Click to allocate.",
            kn: "ಈ ಪ್ರವಾಸಕ್ಕಾಗಿ 2 ರಿಂದ 3 ಅತ್ಯುತ್ತಮ ಬಸ್‌ಗಳನ್ನು ಮೌಲ್ಯಮಾಪನ ಮಾಡಲಾಗಿದೆ. ನಿಯೋಜಿಸಲು ಕ್ಲಿಕ್ ಮಾಡಿ.",
            hi: "इस यात्रा के लिए 2 से 3 उपयुक्त बसों का मूल्यांकन किया गया। आवंटित करने के लिए क्लिक करें।",
            te: "ఈ ట్రిప్ కోసం 2 నుండి 3 సరైన బస్సులు మూల్యాంకనం చేయబడ్డాయి. కేటాయించడానికి క్లిక్ చేయండి.",
            ta: "இந்த பயணத்திற்கு 2 முதல் 3 உகந்த பேருந்துகள் மதிப்பிடப்பட்டுள்ளன. ஒதுக்க கிளிக் செய்க."
        },
        "panel_allocated_title": {
            en: "Allocated bus & dispatch readiness",
            kn: "ಹಂಚಿಕೆಯಾದ ಬಸ್ ಮತ್ತು ಹೊರಡುವ ಸಿದ್ಧತೆ",
            hi: "आवंटित बस और प्रेषण तत्परता",
            te: "కేటాయించిన బస్సు & బయలుదేరే సంసిద్ధత",
            ta: "ஒதுக்கப்பட்ட பேருந்து & அனுப்பும் தயார்நிலை"
        },
        "panel_allocated_note": {
            en: "Live telemetry and manual inspection checks confirm this bus can complete the duty.",
            kn: "ಲೈವ್ ಟೆಲಿಮೆಟ್ರಿ ಮತ್ತು ತಪಾಸಣೆಗಳು ಈ ಬಸ್ ಕರ್ತವ್ಯವನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು ಸಾಧ್ಯವೆಂದು ಖಚಿತಪಡಿಸುತ್ತವೆ.",
            hi: "लाइव टेलीमेट्री और निरीक्षण पुष्टि करते हैं कि यह बस ड्यूटी पूरी कर सकती है।",
            te: "లైవ్ టెలిమెట్రీ మరియు తనిఖీలు ఈ బస్సు విధిని పూర్తి చేయగలదని నిర్ధారిస్తాయి.",
            ta: "நேரலை டெலிமெட்ரி மற்றும் ஆய்வுகள் இந்த பேருந்து கடமையை முடிக்க முடியும் என்பதை உறுதிப்படுத்துகின்றன."
        },
        "kpi_battery_soc": {
            en: "Battery SOC",
            kn: "ಬ್ಯಾಟರಿ ಎಸ್‌ಒಸಿ",
            hi: "बैटरी एसओसी",
            te: "బ్యాటరీ ఎస్‌ఓసీ",
            ta: "பேட்டரி SOC"
        },
        "kpi_est_range": {
            en: "Estimated range",
            kn: "ಅಂದಾಜು ಶ್ರೇಣಿ",
            hi: "अनुमानित रेंज",
            te: "అంచనా పరిధి",
            ta: "மதிப்பிடப்பட்ட தூரம்"
        },
        "kpi_buffer_dist": {
            en: "Buffer distance",
            kn: "ಬಫರ್ ಅಂತರ",
            hi: "बफर दूरी",
            te: "బఫర్ దూరం",
            ta: "கூடுதல் தூரம்"
        },
        "kpi_driver_ready": {
            en: "Driver readiness",
            kn: "ಚಾಲಕರ ಸಿದ್ಧತೆ",
            hi: "चालक तत्परता",
            te: "డ్రైవర్ సంసిద్ధత",
            ta: "ஓட்டுநர் தயார்நிலை"
        },
        "btn_commit_allocation": {
            en: "Commit Allocation",
            kn: "ಹಂಚಿಕೆಯನ್ನು ದೃಢೀಕರಿಸಿ",
            hi: "आवंटन की पुष्टि करें",
            te: "కేటాయింపును నిర్ధారించండి",
            ta: "ஒதுக்கீட்டை உறுதிப்படுத்து"
        },
        "btn_auto_allocate": {
            en: "Auto-Allocate Best Bus",
            kn: "ಅತ್ಯುತ್ತಮ ಬಸ್ ಸ್ವಯಂ-ಹಂಚಿಕೆ ಮಾಡಿ",
            hi: "सर्वोत्तम बस ऑटो-आवंटित करें",
            te: "ఉత్తమ బస్సును ఆటో-కేటాయించండి",
            ta: "சிறந்த பேருந்தை தானாக ஒதுக்கு"
        },
        "btn_live_tracking": {
            en: "Live Bus Tracking",
            kn: "ಲೈವ್ ಬಸ್ ಟ್ರ್ಯಾಕಿಂಗ್",
            hi: "लाइव बस ट्रैकिंग",
            te: "లైవ్ బస్సు ట్రాకింగ్",
            ta: "நேரலை பேருந்து கண்காணிப்பு"
        },

        // ── Admin Workspace Hub (admin.html, recommending.html, problem.html) ──
        "admin_depot_operations": {
            en: "Depot Operations",
            kn: "ಡಿಪೋ ಕಾರ್ಯಾಚರಣೆಗಳು",
            hi: "डिपो संचालन",
            te: "డిపో కార్యకలాపాలు",
            ta: "பணிமனை செயல்பாடுகள்"
        },
        "admin_workspace_title": {
            en: "Admin Workspace",
            kn: "ನಿರ್ವಾಹಕ ಕಾರ್ಯಕ್ಷೇತ್ರ",
            hi: "व्यवस्थापक कार्यक्षेत्र",
            te: "ಅಡ್ಮಿನ್ వర్క్‌స్పೇಸ್",
            ta: "நிர்வாக பணியிடம்"
        },
        "admin_workspace_sub": {
            en: "Allocate the right available bus to the right schedule using battery state, expected range, route distance, cleaning, charging, maintenance, and driver readiness.",
            kn: "ಬ್ಯಾಟರಿ ಸ್ಥಿತಿ, ಅಂದಾಜು ವ್ಯಾಪ್ತಿ, ಮಾರ್ಗದ ದೂರ, ಸ್ವಚ್ಛತೆ, ಚಾರ್ಜಿಂಗ್, ನಿರ್ವಹಣೆ ಮತ್ತು ಚಾಲಕರ ಸಿದ್ಧತೆಯನ್ನು ಬಳಸಿಕೊಂಡು ಸರಿಯಾದ ವೇಳಾಪಟ್ಟಿಗೆ ಸರಿಯಾದ ಬಸ್ ಅನ್ನು ನಿಯೋಜಿಸಿ.",
            hi: "बैटरी स्थिति, अपेक्षित रेंज, रूट दूरी, सफाई, चार्जिंग, रखरखाव और चालक की तत्परता का उपयोग करके सही शेड्यूल के लिए सही बस आवंटित करें।",
            te: "బ్యాటరీ స్థితి, అంచనా పరిధి, రూట్ దూరం, క్లీనింగ్, ఛార్జింగ్, నిర్వహణ మరియు డ్రైవర్ సంసిద్ధతను ఉపయోగించి సరైన షెడ్యూల్‌కు సరైన బస్సును కేటాయించండి.",
            ta: "பேட்டரி நிலை, எதிர்பார்க்கப்படும் தூரம், வழித்தட தூரம், சுத்தம், சார்ஜிங், பராமரிப்பு மற்றும் ஓட்டுநர் தயார்நிலையைப் பயன்படுத்தி சரியான பேருந்தை அட்டவணைக்கு ஒதுக்கவும்."
        },
        "btn_locked_buses_modal": {
            en: "Locked Buses",
            kn: "ಲಾಕ್ ಆದ ಬಸ್‌ಗಳು",
            hi: "लॉक की गई बसें",
            te: "లాక్ చేయబడిన బస్సులు",
            ta: "பூட்டப்பட்ட பேருந்துகள்"
        },
        "btn_sign_out": {
            en: "Sign Out",
            kn: "ಸೈನ್ ಔಟ್",
            hi: "साइन आउट",
            te: "సైన్ అవుట్",
            ta: "வெளியேறு"
        },
        "btn_nav_dispatch": {
            en: "Fleet Readiness",
            kn: "ಫ್ಲೀಟ್ ಸಿದ್ಧತೆ",
            hi: "बेड़े की तैयारी",
            te: "ಫ್ಲೀಟ್ సంసిద్ధత",
            ta: "வாகன தயார்நிலை"
        },
        "btn_nav_active_routes": {
            en: "Active Routes",
            kn: "ಸಕ್ರಿಯ ಮಾರ್ಗಗಳು",
            hi: "सक्रिय रूट",
            te: "యాక్టివ్ రూట్లు",
            ta: "செயலில் உள்ள வழித்தடங்கள்"
        },
        "btn_nav_scheduled_time": {
            en: "Scheduled Time",
            kn: "ನಿಗದಿತ ಸಮಯ",
            hi: "निर्धारित समय",
            te: "షెడ్యూల్ చేసిన సమయం",
            ta: "திட்டமிடப்பட்ட நேரம்"
        },
        "heading_allocated_routes": {
            en: "Allocated Routes",
            kn: "ಹಂಚಿಕೆಯಾದ ಮಾರ್ಗಗಳು",
            hi: "आवंटित रूट",
            te: "కేటాయించిన రూట్లు",
            ta: "ஒதுக்கப்பட்ட வழித்தடங்கள்"
        },
        "heading_unassigned_routes": {
            en: "Unassigned Routes",
            kn: "ಹಂಚಿಕೆಯಾಗದ ಮಾರ್ಗಗಳು",
            hi: "अनावंटित रूट",
            te: "కేటాయించని రూట్లు",
            ta: "ஒதுக்கப்படாத வழித்தடங்கள்"
        },
        "btn_reset_all_allocations": {
            en: "Reset All Allocations",
            kn: "ಎಲ್ಲಾ ಹಂಚಿಕೆಗಳನ್ನು ಮರುಹೊಂದಿಸಿ",
            hi: "सभी आवंटन रीसेट करें",
            te: "అన్ని కేటాయింపులను రీసెట్ చేయండి",
            ta: "அனைத்து ஒதுக்கீடுகளையும் மீட்டமை"
        },

        // ── Charging & Cleaning Logs (public/charging.html, public/cleaning.html) ──
        "chg_page_title": {
            en: "Charging Log",
            kn: "ಚಾರ್ಜಿಂಗ್ ಲಾಗ್",
            hi: "चार्जिंग लॉग",
            te: "ఛార్జింగ్ లాగ్",
            ta: "சார்ஜிங் பதிவு"
        },
        "chg_page_sub": {
            en: "Record bus charging sessions — Depot 32 / Chandapura",
            kn: "ಬಸ್ ಚಾರ್ಜಿಂಗ್ ಸೆಷನ್‌ಗಳನ್ನು ದಾಖಲಿಸಿ — ಡಿಪೋ 32 / ಚಂದಾಪುರ",
            hi: "बस चार्जिंग सत्र रिकॉर्ड करें — डिपो 32 / चंदापुरा",
            te: "బస్సు ఛార్జింగ్ సెషన్‌లను రికార్డ్ చేయండి — డిపో 32 / చందాపుర",
            ta: "பேருந்து சார்ஜிங் அமர்வுகளைப் பதிவுசெய்க — பணிமனை 32 / சந்தாபுரா"
        },
        "cln_page_title": {
            en: "Cleaning Log",
            kn: "ಸ್ವಚ್ಛಗೊಳಿಸುವಿಕೆ ಲಾಗ್",
            hi: "सफाई लॉग",
            te: "ಕ್ಲೀನಿಂಗ್ లాగ్",
            ta: "சுத்தம் பதிவு"
        },
        "cln_page_sub": {
            en: "Record bus cleaning status — Depot 32 / Chandapura",
            kn: "ಬಸ್ ಸ್ವಚ್ಛಗೊಳಿಸುವಿಕೆ ಸ್ಥಿತಿಯನ್ನು ದಾಖಲಿಸಿ — ಡಿಪೋ 32 / ಚಂದಾಪುರ",
            hi: "बस सफाई स्थिति रिकॉर्ड करें — डिपो 32 / चंदापुरा",
            te: "బస్సు క్లీనింగ్ స్థితిని రికార్డ్ చేయండి — డిపో 32 / చందాపుర",
            ta: "பேருந்து சுத்தம் செய்த நிலையை பதிவுசெய்க — பணிமனை 32 / சந்தாபுரா"
        },
        "card_title_select_bus": {
            en: "🚌 Select Bus",
            kn: "🚌 ಬಸ್ ಆಯ್ಕೆಮಾಡಿ",
            hi: "🚌 बस चुनें",
            te: "🚌 బస్సును ఎంచుకోండి",
            ta: "🚌 பேருந்தைத் தேர்ந்தெடுக்கவும்"
        },
        "placeholder_search_bm": {
            en: "Search by BM number or Registration No…",
            kn: "ಬಿಎಂ ಸಂಖ್ಯೆ ಅಥವಾ ನೋಂದಣಿ ಸಂಖ್ಯೆಯ ಮೂಲಕ ಹುಡುಕಿ...",
            hi: "बीएम नंबर या पंजीकरण संख्या से खोजें…",
            te: "BM నంబర్ లేదా రిజిస్ట్రేషన్ నంబర్ ద్వారా శోధించండి…",
            ta: "BM எண் அல்லது பதிவு எண் மூலம் தேடவும்…"
        },
        "option_choose_bus": {
            en: "— Choose a bus —",
            kn: "— ಬಸ್ ಆಯ್ಕೆಮಾಡಿ —",
            hi: "— एक बस चुनें —",
            te: "— ఒక బస్సును ఎంచుకోండి —",
            ta: "— பேருந்தைத் தேர்ந்தெடுக்கவும் —"
        },
        "label_bm_number": {
            en: "BM Number",
            kn: "ಬಿಎಂ ಸಂಖ್ಯೆ",
            hi: "बीएम नंबर",
            te: "BM నంబర్",
            ta: "BM எண்"
        },
        "label_reg_no": {
            en: "Registration No.",
            kn: "ನೋಂದಣಿ ಸಂಖ್ಯೆ",
            hi: "पंजीकरण संख्या",
            te: "రిజిస్ట్రేషన్ సంఖ్య",
            ta: "பதிவு எண்"
        },
        "label_model": {
            en: "Model",
            kn: "ಮಾದರಿ",
            hi: "मॉडल",
            te: "మోడల్",
            ta: "மாதிரி"
        },
        "label_status": {
            en: "Status",
            kn: "ಸ್ಥಿತಿ",
            hi: "स्थिति",
            te: "స్థితి",
            ta: "நிலை"
        },
        "btn_lock_bus_charging": {
            en: "🔒 Lock Bus for Charging",
            kn: "🔒 ಚಾರ್ಜಿಂಗ್‌ಗಾಗಿ ಬಸ್ ಲಾಕ್ ಮಾಡಿ",
            hi: "🔒 चार्जिंग के लिए बस लॉक करें",
            te: "🔒 ఛార్జింగ్ కోసం బస్సును లాక్ చేయండి",
            ta: "🔒 சார்ஜிங்கிற்கு பேருந்தை பூட்டுக"
        },
        "btn_unlock_bus_charging": {
            en: "🔓 Unlock & Submit Charging Record",
            kn: "🔓 ಅನ್‌ಲಾಕ್ ಮಾಡಿ & ಚಾರ್ಜಿಂಗ್ ದಾಖಲೆ ಸಲ್ಲಿಸಿ",
            hi: "🔓 अनलॉक करें और चार्जिंग रिकॉर्ड सबमिट करें",
            te: "🔓 అన్‌లాక్ చేయండి & ఛార్జింగ్ రికార్డ్ సమర్పించండి",
            ta: "🔓 பூட்டைத் திறந்து சார்ஜிங் பதிவைச் சமர்ப்பிக்கவும்"
        },
        "btn_lock_bus_cleaning": {
            en: "🔒 Lock Bus for Cleaning",
            kn: "🔒 ಸ್ವಚ್ಛಗೊಳಿಸುವಿಕೆಗಾಗಿ ಬಸ್ ಲಾಕ್ ಮಾಡಿ",
            hi: "🔒 सफाई के लिए बस लॉक करें",
            te: "🔒 క్లీనింగ్ కోసం బస్సును లాక్ చేయండి",
            ta: "🔒 சுத்தம் செய்வதற்கு பேருந்தை பூட்டுக"
        },
        "btn_unlock_bus_cleaning": {
            en: "🔓 Unlock & Submit Cleaning Record",
            kn: "🔓 ಅನ್‌ಲಾಕ್ ಮಾಡಿ & ಸ್ವಚ್ಛಗೊಳಿಸುವಿಕೆ ದಾಖಲೆ ಸಲ್ಲಿಸಿ",
            hi: "🔓 अनलॉक करें और सफाई रिकॉर्ड सबमिट करें",
            te: "🔓 అన్‌లాక్ చేయండి & క్లీನಿಂಗ್ రికార్డ్ సమర్పించండి",
            ta: "🔓 பூட்டைத் திறந்து சுத்தம் செய்த பதிவைச் சமர்ப்பிக்கவும்"
        },
        "card_battery_soc": {
            en: "⚡ Battery SOC",
            kn: "⚡ ಬ್ಯಾಟರಿ ಎಸ್‌ಒಸಿ",
            hi: "⚡ बैटरी एसओसी",
            te: "⚡ బ్యాటరీ ఎస్‌ఓసీ",
            ta: "⚡ பேட்டரி SOC"
        },
        "label_soc_before": {
            en: "SOC Before Charging:",
            kn: "ಚಾರ್ಜ್ ಮಾಡುವ ಮೊದಲು ಎಸ್‌ಒಸಿ:",
            hi: "चार्जिंग से पहले एसओसी:",
            te: "ఛార్జింగ్‌కు ముందు ఎస్‌ఓసీ:",
            ta: "சார்ஜ் செய்வதற்கு முன் SOC:"
        },
        "label_soc_after": {
            en: "Confirmed Manual SOC After Charging:",
            kn: "ಚಾರ್ಜ್ ಮಾಡಿದ ನಂತರ ದೃಢೀಕರಿಸಿದ ಎಸ್‌ಒಸಿ:",
            hi: "चार्जिंग के बाद पुष्टि की गई मैनुअल एसओसी:",
            te: "ఛార్జింగ్ తర్వాత ధృవీకరించిన మాನ್యువల్ ఎಸ್‌ఓసీ:",
            ta: "சார்ஜ் செய்த பிறகு உறுதிப்படுத்தப்பட்ட SOC:"
        },
        "label_enter_percent": {
            en: "Enter %:",
            kn: "ಶೇಕಡಾ %:",
            hi: "प्रतिशत %:",
            te: "శాతం %:",
            ta: "சதவீதம் %:"
        },
        "card_charging_session": {
            en: "🔌 Charging Session",
            kn: "🔌 ಚಾರ್ಜಿಂಗ್ ಸೆಷನ್",
            hi: "🔌 चार्जिंग सत्र",
            te: "🔌 ఛార్జింగ్ సెషన్",
            ta: "🔌 சார்ஜிங் அமர்வு"
        },
        "card_today_records": {
            en: "📋 Today's Records",
            kn: "📋 ಇಂದಿನ ದಾಖಲೆಗಳು",
            hi: "📋 आज के रिकॉर्ड",
            te: "📋 నేటి రికార్డులు",
            ta: "📋 இன்றைய பதிவுகள்"
        },

        // ── Bus Details & Telemetry (public/bus-details.html) ──
        "analytics_page_title": {
            en: "Bus Battery & Telemetry Analytics",
            kn: "ಬಸ್ ಬ್ಯಾಟರಿ ಮತ್ತು ಟೆಲಿಮೆಟ್ರಿ ವಿಶ್ಲೇಷಣೆ",
            hi: "बस बैटरी और टेलीमेट्री एनालिटिक्स",
            te: "బస్సు బ్యాటరీ మరియు టెలిమెట్రీ విశ్లేషణలు",
            ta: "பேருந்து பேட்டரி மற்றும் டெலிமெட்ரி பகுப்பாய்வு"
        },
        "view_live_soc": {
            en: "⚡ Live SOC & Range",
            kn: "⚡ ಲೈವ್ ಎಸ್‌ಒಸಿ & ಶ್ರೇಣಿ",
            hi: "⚡ लाइव एसओसी और रेंज",
            te: "⚡ లైవ్ ఎస్‌ఓసీ & రేంజ్",
            ta: "⚡ நேரலை SOC மற்றும் தூரம்"
        },
        "view_battery_health": {
            en: "🔋 Battery Health",
            kn: "🔋 ಬ್ಯಾಟರಿ ಆರೋಗ್ಯ",
            hi: "🔋 बैटरी स्वास्थ्य",
            te: "🔋 బ్యాటరీ ఆరోగ్యం",
            ta: "🔋 பேட்டரி ஆரோக்கியம்"
        },
        "view_charging_history": {
            en: "⚡ Charging History",
            kn: "⚡ ಚಾರ್ಜಿಂಗ್ ಇತಿಹಾಸ",
            hi: "⚡ चार्जिंग इतिहास",
            te: "⚡ ఛార్జింగ్ చరిత్ర",
            ta: "⚡ சார்ஜிங் வரலாறு"
        },
        "view_cleaning_history": {
            en: "🧹 Cleaning History",
            kn: "🧹 ಸ್ವಚ್ಛತೆಯ ಇತಿಹಾಸ",
            hi: "🧹 सफाई का इतिहास",
            te: "🧹 క్లీనింగ్ చరిత్ర",
            ta: "🧹 சுத்தம் செய்த வரலாறு"
        },

        // ── Roles & Candidate Badges ──
        "role_primary_best_fit": {
            en: "Primary Best Fit",
            kn: "ಪ್ರಾಥಮಿಕ ಅತ್ಯುತ್ತಮ ಆಯ್ಕೆ",
            hi: "प्राथमिक सर्वोत्तम विकल्प",
            te: "ప్రాథమిక ఉత్తమ ఎంపిక",
            ta: "முதன்மை சிறந்த தேர்வு"
        },
        "role_alternative_option": {
            en: "Alternative Option",
            kn: "ಪರ್ಯಾಯ ಆಯ್ಕೆ",
            hi: "वैकल्पिक विकल्प",
            te: "ప్రత్యామ్ನాయ ఎంపిక",
            ta: "மாற்று விருப்பம்"
        },
        "role_standby_option": {
            en: "Standby Option",
            kn: "ಮೀಸಲು (ಸ್ಟ್ಯಾಂಡ್‌ಬೈ) ಆಯ್ಕೆ",
            hi: "स्टैंडबाय विकल्प",
            te: "స్టాండ్‌బై ఎంపిక",
            ta: "காத்திருப்பு விருப்பம்"
        },
        "btn_select_candidate": {
            en: "Select",
            kn: "ಆಯ್ಕೆಮಾಡಿ",
            hi: "चुनें",
            te: "ఎంచుకోండి",
            ta: "தேர்ந்தெடு"
        },
        "btn_allocated_candidate": {
            en: "Allocated",
            kn: "ಹಂಚಿಕೆಯಾಗಿದೆ",
            hi: "आवंटित",
            te: "కేటాయించబడింది",
            ta: "ஒதுக்கப்பட்டது"
        }
    };

    const STORAGE_KEY = "preferred_language";
    const DEFAULT_LANG = "en";

    function getLanguage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && LANGUAGES.some(l => l.code === saved)) {
                return saved;
            }
        } catch (e) {
            console.warn("[i18n] localStorage inaccessible:", e);
        }
        return DEFAULT_LANG;
    }

    function setLanguage(lang) {
        if (!LANGUAGES.some(l => l.code === lang)) {
            console.warn(`[i18n] Unsupported language code: "${lang}". Falling back to "${DEFAULT_LANG}".`);
            lang = DEFAULT_LANG;
        }

        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
            console.warn("[i18n] Could not write to localStorage:", e);
        }

        document.documentElement.lang = lang;

        // Synchronize all select elements
        document.querySelectorAll(".lang-select").forEach(select => {
            if (select.value !== lang) {
                select.value = lang;
            }
        });

        // Translate document contents
        translatePage(lang);

        // Dispatch language change event for dynamic script subscribers
        try {
            if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
                window.dispatchEvent(new CustomEvent("languageChanged", {
                    detail: { lang, nativeName: LANGUAGES.find(l => l.code === lang)?.native }
                }));
            }
        } catch (e) {
            console.warn("[i18n] Event dispatch error:", e);
        }
    }

    function t(key, lang = null, fallback = "") {
        const targetLang = lang || getLanguage();
        const entry = TRANSLATIONS[key];
        if (!entry) return fallback || key;
        return entry[targetLang] || entry[DEFAULT_LANG] || fallback || key;
    }

    function translatePage(lang = null) {
        const targetLang = lang || getLanguage();

        // 1. Text content
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (key && TRANSLATIONS[key]) {
                const translated = t(key, targetLang, el.textContent);
                if (el.children.length === 0) {
                    el.textContent = translated;
                } else {
                    // Only update the first non-empty text node to preserve child inputs, buttons, etc.
                    for (const node of el.childNodes) {
                        if (node.nodeType === 3 && node.nodeValue.trim()) {
                            node.nodeValue = translated;
                            break;
                        }
                    }
                }
            }
        });

        // 2. HTML content
        document.querySelectorAll("[data-i18n-html]").forEach(el => {
            const key = el.getAttribute("data-i18n-html");
            if (key && TRANSLATIONS[key]) {
                el.innerHTML = t(key, targetLang, el.innerHTML);
            }
        });

        // 3. Placeholders
        document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
            const key = el.getAttribute("data-i18n-placeholder");
            if (key && TRANSLATIONS[key]) {
                el.placeholder = t(key, targetLang, el.placeholder);
            }
        });

        // 4. Tooltip / title
        document.querySelectorAll("[data-i18n-title]").forEach(el => {
            const key = el.getAttribute("data-i18n-title");
            if (key && TRANSLATIONS[key]) {
                el.title = t(key, targetLang, el.title);
            }
        });

        // 5. Aria-label
        document.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
            const key = el.getAttribute("data-i18n-aria-label");
            if (key && TRANSLATIONS[key]) {
                el.setAttribute("aria-label", t(key, targetLang, el.getAttribute("aria-label")));
            }
        });

        // 6. Dynamic candidate role pills (if present in DOM)
        document.querySelectorAll(".cand-role-badge").forEach(badge => {
            if (badge.classList.contains("primary")) {
                badge.textContent = t("role_primary_best_fit", targetLang, "Primary Best Fit");
            } else if (badge.classList.contains("swap")) {
                badge.textContent = t("role_alternative_option", targetLang, "Alternative Option");
            } else if (badge.classList.contains("standby")) {
                badge.textContent = t("role_standby_option", targetLang, "Standby Option");
            }
        });
    }

    function createSelectorElement() {
        const wrap = document.createElement("div");
        wrap.className = "lang-selector-wrap";
        wrap.setAttribute("role", "region");
        wrap.setAttribute("aria-label", "Language selector");

        const icon = document.createElement("span");
        icon.className = "lang-globe-icon";
        icon.textContent = "🌐";
        icon.setAttribute("aria-hidden", "true");

        const select = document.createElement("select");
        select.className = "lang-select";
        select.setAttribute("aria-label", "Select Language");

        const currentLang = getLanguage();
        LANGUAGES.forEach(lang => {
            const opt = document.createElement("option");
            opt.value = lang.code;
            opt.textContent = lang.native;
            if (lang.code === currentLang) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });

        select.addEventListener("change", function () {
            setLanguage(this.value);
        });

        wrap.appendChild(icon);
        wrap.appendChild(select);
        return wrap;
    }

    function injectStyles() {
        if (document.getElementById("i18n-styles")) return;

        const style = document.createElement("style");
        style.id = "i18n-styles";
        style.textContent = `
            .lang-selector-wrap {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: #ffffff;
                border: 1.5px solid #cbd5e1;
                border-radius: 999px;
                padding: 4px 10px 4px 8px;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                user-select: none;
                z-index: 1000;
            }
            .lang-selector-wrap:hover {
                border-color: #0284c7;
                box-shadow: 0 4px 14px rgba(2, 132, 199, 0.16);
                transform: translateY(-1px);
            }
            .lang-globe-icon {
                font-size: 1rem;
                line-height: 1;
                display: inline-block;
                flex-shrink: 0;
            }
            .lang-select {
                appearance: none;
                -webkit-appearance: none;
                background: transparent;
                border: none;
                color: #0f172a;
                font-size: 0.82rem;
                font-weight: 700;
                cursor: pointer;
                outline: none;
                padding: 2px 18px 2px 2px;
                background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23475569' d='M0 0l5 5 5-5z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right center;
                font-family: inherit;
            }
            .lang-select:focus {
                color: #0284c7;
            }
            /* Dark container adaptation */
            .page-wrapper .lang-selector-wrap,
            body.dark-mode .lang-selector-wrap,
            [data-theme="dark"] .lang-selector-wrap,
            .topnav .lang-selector-wrap {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.25);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
            }
            .page-wrapper .lang-select,
            body.dark-mode .lang-select,
            [data-theme="dark"] .lang-select,
            .topnav .lang-select {
                color: #ffffff;
                background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23ffffff' d='M0 0l5 5 5-5z'/%3E%3C/svg%3E");
            }
            .page-wrapper .lang-select option,
            body.dark-mode .lang-select option,
            [data-theme="dark"] .lang-select option,
            .topnav .lang-select option {
                background: #1e293b;
                color: #ffffff;
            }
            /* Floating fallback when page has no standard navigation */
            .lang-selector-floating {
                position: fixed;
                top: 14px;
                right: 16px;
                z-index: 99999;
                background: #ffffff;
                box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
            }
            @media (max-width: 600px) {
                .lang-selector-wrap {
                    padding: 3px 8px 3px 6px;
                }
                .lang-select {
                    font-size: 0.76rem;
                    padding-right: 14px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function autoMount() {
        // If a language selector already exists in the DOM, just wire up existing selects
        const existingWrap = document.querySelector(".lang-selector-wrap");
        if (existingWrap) {
            const sel = existingWrap.querySelector(".lang-select");
            if (sel) {
                sel.value = getLanguage();
                sel.addEventListener("change", function () {
                    setLanguage(this.value);
                });
            }
            return;
        }

        // Look for dedicated mount point
        const mount = document.getElementById("lang-selector-mount") || document.querySelector(".lang-selector-mount");
        if (mount) {
            mount.appendChild(createSelectorElement());
            return;
        }

        // Search common page headers and action zones
        const target =
            document.querySelector(".topbar-actions div") ||
            document.querySelector(".topbar-actions") ||
            document.querySelector(".topnav-links") ||
            document.querySelector(".topbar") ||
            document.querySelector(".header") ||
            document.querySelector(".page-wrapper") ||
            document.querySelector(".container header") ||
            document.querySelector("nav");

        if (target) {
            target.appendChild(createSelectorElement());
        } else if (document.body) {
            // Floating corner fallback
            const floating = createSelectorElement();
            if (floating.classList && floating.classList.add) {
                floating.classList.add("lang-selector-floating");
            } else {
                floating.className = (floating.className || "") + " lang-selector-floating";
            }
            document.body.appendChild(floating);
        }
    }

    function init() {
        injectStyles();
        autoMount();
        setLanguage(getLanguage());
    }

    // Initialize as soon as DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Expose public API
    window.i18n = {
        languages: LANGUAGES,
        translations: TRANSLATIONS,
        getLanguage,
        setLanguage,
        t,
        translatePage,
        createSelectorElement,
        init
    };
})();
