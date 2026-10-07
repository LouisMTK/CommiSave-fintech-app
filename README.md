# CommiSave

A modern peer-to-peer savings circle platform that brings community saving traditions into the digital age. CommiSave enables users to form groups, make collective savings deposits, and receive payouts on a rotating basis—all with intelligent risk scoring and fraud detection built in.

## Overview

CommiSave reimagines the traditional savings circle (also known as a ROSCA—Rotating Savings and Credit Association) by adding data-driven trust metrics, live anomaly detection, and payout optimization. Whether you're saving for a home, education, or business investment, CommiSave makes it safer and easier to pool resources with trusted peers.

## Key Features

### 1. **Trust Score & Risk Assessment**
- **Dynamic trust scoring** based on payment punctuality, consistency, and early-exit history
- **Peer-aware scoring** that factors in the trustworthiness of existing group members
- **Live updates** after every deposit, automatically recalculated and displayed on your dashboard

### 2. **Payout Optimization**
- **Smart rotation recommendations** that place reliable members later in the cycle to maximize group stability
- **Risk-based clustering** that groups members by their default likelihood and matches them with appropriate cycle positions
- **Liquidity forecasting** to help admins plan cycle duration and buffer sizes

### 3. **Anomaly & Fraud Detection**
- **Velocity monitoring** flags rapid multi-deposit patterns and unusually large transactions
- **Sybil attack detection** identifies suspicious behavior like multiple accounts from the same device
- **Flagged activity dashboard** for admins to review and approve high-risk transactions

### 4. **Group Health Forecasting**
- **Time-series insights** predict total pool values and cash flow based on historical member activity
- **Proactive alerts** when a group is at risk of insufficient funds
- **Personalized payout guidance** for each member based on their deposit behavior

### 5. **Seamless Group Management**
- Browse and join existing savings groups on the **Explore** page
- Search groups by name or leader to find the right fit
- Admin dashboard to manage members, approve deposits, and generate invite links
- QR code and manual invite creation for quick group onboarding

## Project Structure

```
Comm/
├── home.html              # Dashboard with trust intelligence, deposit forms, and activity
├── explore.html           # Browse circles with live risk lens and recommendations
├── admin.html             # Admin panel for member management and group invites
├── profile.html           # User profile with savings progress and payment methods
├── login.html             # Authentication and account creation
├── user-profile.js        # Core trust scoring, telemetry, and rendering logic
├── firebase-config.js     # Firebase configuration and initialization
├── styles.css             # Tailwind-based styling and custom CSS
├── login_pic.jpg          # Hero image for login and home pages
└── README.md              # This file
```

## Core Components

### `user-profile.js`
The heart of CommiSave's intelligent scoring system.

**Key Functions:**
- `computeTrustMetrics(user, telemetryEvents)` – Calculates live trust score from historical behavior
- `recordTelemetry(eventData)` – Logs deposits and flags anomalies
- `renderExploreInsights()` – Displays group-specific trust recommendations
- `renderHomeInsights()` – Updates dashboard with live trust intelligence
- `renderAdminInsights()` – Shows admins the overall group health and flagged activity

**Data Storage:**
- User data stored in `localStorage` under `'commisave-user'`
- Telemetry events stored in `'commisave-telemetry'` (up to 15 most recent events)
- Syncs to Firebase Firestore if available

### `home.html`
**Sections:**
- **Trust Intelligence Panel** – Live trust score, anomaly status, forecast, and payout advice
- **Decision Support** – Suggestions for optimal payout rotation
- **Deposit Forms** – Individual and group savings entry points
- **Dashboard Stats** – Total savings, active groups, next payout date
- **Growth Chart** – Line chart of savings over time
- **Recent Activity** – Feed of recent deposits and group activity

### `explore.html`
**Sections:**
- **Smart Risk Lens** – Shows each group's trust score and personalized recommendation for payout placement
- **Group Cards** – Browse available savings circles with contribution amounts and member limits

### `admin.html`
**Sections:**
- **Admin Intelligence** – Trust score, flagged activity count, projected pool size
- **Admin Access Request** – Become an admin with a simple onboarding form
- **Group Member Invites** – Search profiles, generate QR codes, and create manual invite links
- **Member Management** – Table view of all group members with status, contribution, and trust score

## How Trust Scoring Works

### Calculation
Trust score ranges from 60 to 99 and is computed from four weighted factors:

1. **Punctuality Score (35%)** – Penalizes late deposits and rewards early deposits
2. **Consistency Score (25%)** – Rewards regular deposit history and higher volumes
3. **Exit Score (20%)** – Penalizes early exits from cycles
4. **Peer Score (20%)** – Inherits trustworthiness from group members

### Risk Bands

| Trust Score | Band | Forecast | Recommended Action |
|-------------|------|----------|-------------------|
| ≥92 | Low risk | Strong cash flow | Place later in cycle for buffer protection |
| 80–91 | Moderate risk | Watch next cycle | Use short lock or earlier review |
| <80 | Needs review | Higher default risk | Tighter rotation + buffer required |

### Anomaly Flagging

Events are flagged if:
- **Rapid velocity:** 3+ deposits in 10 minutes
- **High volume:** Deposit > 1,000,000 UGX

Flagged events appear in the admin dashboard for review before approval.

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Optional: Firebase project for Firestore backend

### 1. Set Up Locally
```bash
# Clone or download the project
cd Comm

# Open in browser
# Double-click home.html or serve via a local web server
python3 -m http.server 8000
# Then visit http://localhost:8000/home.html
```

### 2. Configure Firebase (Optional)
Edit `firebase-config.js` to connect to your Firebase project:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Without Firebase, the app uses browser-side `localStorage` and works offline.

### 3. Create an Account
1. Open `login.html`
2. Fill in your name, email, and phone
3. Click "Create account"
4. You'll be redirected to the dashboard

### 4. Make Your First Deposit
1. Navigate to `home.html`
2. Choose **Individual savings** or **Group savings**
3. Fill in the amount, date, and reason
4. Submit the form
5. Your trust score will update automatically

### 5. Explore Groups
1. Go to `explore.html`
2. Browse available savings circles
3. Each group shows a personalized trust recommendation based on your profile
4. Click "Request to join" to apply

## Technologies Used

- **Frontend:** HTML5, CSS3, Tailwind CSS, JavaScript (ES6+)
- **Charts:** Chart.js for savings growth visualization
- **Icons & Fonts:** Google Fonts (Poppins), inline SVG icons
- **Data:** Firebase (optional), browser localStorage, custom telemetry
- **QR Codes:** QRCode.js library for admin invite generation

## Trust Algorithm Details

### Punctuality Score Calculation
```
punctualityScore = 100 - (daysLate × 8) - (daysEarly × 1.5)
```
- Each day late reduces score by 8 points
- Each day early reduces score by 1.5 points (discourages front-loading)

### Consistency Score Calculation
```
consistencyScore = 48 + (historyLength × 7) + min(20, depositVolume / 120)
```
- Baseline of 48 points
- +7 points per historical deposit event
- Bonus up to 20 points for volume consistency

### Exit Score Calculation
```
exitScore = 100 - (earlyExitCount × 18)
```
- Each early exit reduces score by 18 points

### Final Trust Score
```
trustScore = 0.35 × punctuality + 0.25 × consistency + 0.2 × exit + 0.2 × peer
Bounded: 60 ≤ trustScore ≤ 99
```

## API & Telemetry Format

### Telemetry Event Object
```javascript
{
  createdAt: "2026-07-10T12:34:56.789Z",  // ISO timestamp
  amount: 250000,                          // UGX
  daysLate: 0,                             // Days past target payout
  daysEarly: 2,                            // Days before target payout
  exitedEarly: false,                      // Left cycle prematurely
  type: "individual",                      // "individual" or "group"
  flagged: false                           // Auto-flagged by anomaly detection
}
```

### Window API
Access trust metrics programmatically:
```javascript
// Compute trust metrics for current user
const metrics = window.CommiSaveRisk.computeTrustMetrics(user, telemetryEvents);

// Record a new deposit event
const result = window.CommiSaveRisk.recordTelemetry({
  amount: 250000,
  daysLate: 0,
  daysEarly: 0,
  exitedEarly: false,
  type: 'group'
});

// Get all telemetry history
const history = window.CommiSaveRisk.getTelemetryHistory();
```

## Future Roadmap

### Phase 2: Backend Integration
- [ ] Python FastAPI/Flask microservice for ML model hosting
- [ ] Scikit-Learn XGBoost for advanced default prediction
- [ ] Real-time Firestore sync with secondary validation
- [ ] Multi-signature locking for high-risk transactions

### Phase 3: Advanced Features
- [ ] Time-series forecasting (ARIMA/Prophet) for group health
- [ ] Device fingerprinting and IP analysis for Sybil detection
- [ ] Integration with mobile money APIs (MTN, Airtel)
- [ ] SMS notifications for deposit confirmations and alerts
- [ ] Automated payout scheduling and reconciliation

### Phase 4: Scaling
- [ ] Support for multiple currencies
- [ ] Admin analytics dashboard with cohort analysis
- [ ] Machine learning model retraining pipeline
- [ ] Rate limiting and DDoS protection
- [ ] Multi-language support

## Troubleshooting

### Trust Score Not Updating
- Ensure `user-profile.js` is loaded after `firebase-config.js`
- Check browser console for errors
- Verify telemetry events are being recorded in `localStorage`

### Deposits Not Saving
- Check if Firebase is configured (optional but recommended)
- Verify browser allows `localStorage` (not in private/incognito mode)
- Ensure JavaScript is enabled

### Admin Panel Shows No Data
- Create at least one user account first
- Make a deposit to generate telemetry events
- Refresh the page to load cached data

## Security & Privacy Notes

⚠️ **Development Version:** This is a prototype. Before production use:
- Implement proper user authentication and session management
- Add backend validation for all inputs
- Use HTTPS for all Firebase and API calls
- Encrypt sensitive data at rest and in transit
- Conduct security audit and penetration testing
- Implement rate limiting and DDoS protection

## License

This project is provided as-is for educational and demonstration purposes.

## Contact & Support

For questions or feedback about CommiSave, please reach out to the development team.

---

**CommiSave:** Making community savings smarter, safer, and more transparent.
