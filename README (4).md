# 📊 Biz Dashboard

A personal business dashboard to track daily sales, expenses, stock, and due payments — built with vanilla HTML/CSS/JS and Firebase Realtime Database.

## Features

- **Today Tab** — Add sales with amount, profit (auto-calculates cost), and channel (Website / Telegram). Shows live summary cards.
- **History Tab** — Filter past sales by date and channel.
- **Due Tab** — Track WhatsApp and Telegram dues with a full log.
- **Stock Tab** — Monitor inventory value with add/remove/set actions.
- **Expense Tab** — Log expenses by category with daily/monthly/all-time filters.
- **Reports Tab** — Weekly, monthly, and yearly profit breakdown with bar charts.
- **Trash Tab** — Deleted items are recoverable for 30 days.
- **Settings Tab** — Change PIN and danger zone to wipe all data.

## Tech Stack

- HTML / CSS / JavaScript (no framework)
- Firebase Realtime Database (sync across devices)
- Google Fonts — Space Mono + DM Sans

## Live Demo

> Hosted via GitHub Pages: `https://<your-username>.github.io/<repo-name>`

## Getting Started

1. Clone or download this repository
2. Open `app.js` and replace the `firebaseConfig` object with your own Firebase project credentials
3. Deploy to GitHub Pages or any static host

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Deployment (GitHub Pages)

1. Push all files (`index.html`, `app.js`, `style.css`) to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to `main` branch, root folder
4. Save — your dashboard will be live in a minute

## Default PIN

```
1234
```

Change it from the **Settings** tab after first login.

## Notes

- All data is stored in Firebase and synced in real time
- Session stays active for 7 days without re-entering PIN
- Deleted items auto-expire from Trash after 30 days
- Dashboard is designed for single-user/owner use only

## License

Personal use only. Not for redistribution.
