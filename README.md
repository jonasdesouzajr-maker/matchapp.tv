# 🍿 Perfect Match: Movies, Series & Telenovelas

A lightweight, serverless web application that acts as an entertainment matchmaker. Users answer a quick questionnaire about their preferred format and current mood, and the algorithm serves them the perfect recommendation. 

Designed with a built-in freemium monetization loop, the app utilizes a forced-view interstitial ad screen and enforces a 24-hour cooldown on matches to drive user registration and retention.

## ✨ Core Features

* **Smart Matchmaking Algorithm:** Client-side filtering that matches user input against a categorized content database (cataloging Telenovelas, Movies, and Series).
* **Monetization:** Google AdSense is limited to content-rich publisher surfaces and is never used to gate results, authentication, account management, pricing, or other behavioral screens.
* **Freemium Cooldown Loop:** 
  * Unregistered users receive exactly **1 free match** (tracked via Local Storage).
  * Registered users receive **1 free match every 24 hours**.
* **Secure Authentication:** User login, registration, and session management powered by Supabase Auth.
* **Database Tracking:** PostgreSQL database with Row Level Security (RLS) to safely track the exact timestamp of every user's last match.

## 🛠️ Tech Stack

* **Frontend:** Vanilla HTML5, CSS3, and JavaScript (No frameworks, ultra-fast load times).
* **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL & Authentication).
* **Hosting & CI/CD:** [Cloudflare Pages](https://pages.cloudflare.com/) (Automated deployments directly from the `main` branch).
* **Monetization:** Google AdSense.

## 🚀 How It Works

1. **The Form:** User selects their desired format (e.g., Telenovela) and mood (e.g., Drama).
2. **The Interstitial:** The UI transitions to a "Loading..." screen featuring a display ad for 6 seconds.
3. **The Logic:** The app queries Supabase to check the user's `last_match_timestamp`. If 24 hours haven't passed, it blocks the result.
4. **The Result:** If authorized, the algorithm filters the catalog and serves a random matching title to keep recommendations fresh.
