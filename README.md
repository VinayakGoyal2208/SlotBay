<p align="center">
  <img src="public/favicon.svg" alt="SlotBay logo" width="64">
</p>

<h1 align="center">🅿️ SlotBay</h1>
<p align="center"><strong>Find your space. Park with confidence.</strong></p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-149ECA?logo=react&amp;logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&amp;logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-43853D?logo=nodedotjs&amp;logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&amp;logoColor=white">
</p>

## 🌆 About the project

SlotBay is a responsive parking rental website that connects drivers with owners of unused private parking spaces. It helps people find parking near metro stations, offices and busy city locations, while giving owners a way to offer their available bays.

The platform brings parking discovery, reservations, owner listings and administrator reviews into one website.

Live Site: [Click Here](https://slot-bay-swart.vercel.app/)

## ✨ Main features

### 🚗 For drivers

- Search by location, date, time and vehicle type, with suggestions that open dedicated parking pages.
- View photos, full addresses, maps, parking rules and hourly, daily or monthly prices.
- Reserve available bays instantly and track booking history, status and in-app notifications.
- Register driving licence and vehicle RC details, and request profile corrections when needed.

### 🏡 For parking owners

- Submit verification details and manage multiple parking locations.
- Add or remove photos, set prices and access hours, block dates and adjust bay capacity.
- View arriving drivers, vehicle details, reservation history and booking value.

### 🛡️ For administrators

- Review owners and listings, with reasons for rejected applications.
- Manage accounts, locations, disputes and profile correction requests.
- Monitor bookings and platform reports, with CSV exports.

### 📱 Website experience

Responsive layouts, role-specific navigation, searchable dashboards, password visibility, sign-in animations and SEO metadata.

## 🧭 How it works

**Search → Explore a space → Choose your dates → Reserve → Park**

Owners complete verification before publishing approved listings. Drivers receive confirmation when a compatible bay is available and carry their **driving licence and vehicle RC** on arrival.

## 🧰 Tech stack

| Part | Technology |
| --- | --- |
| Frontend | React, TypeScript, semantic HTML and Tailwind CSS |
| Backend | Node.js and Express |
| Database | MongoDB and Mongoose |
| Maps and build tools | Leaflet, OpenStreetMap and Vite |

## 🚀 Getting started

Requires **Node.js 24+** and **MongoDB Atlas or a MongoDB replica set**.

1. Open the project folder containing `package.json` and install dependencies:

   ```bash
   npm ci
   ```

2. For a new installation, copy `.env.example` to `.env`. Set your private `MONGO_URI`, a 64-character hexadecimal `DATA_ENCRYPTION_KEY`, and `SITE_URL=http://127.0.0.1:5173`. Keep the existing settings and encryption key when upgrading.

   For a new database, generate the key with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Start the website:

   ```bash
   npm run dev
   ```

4. Open **http://127.0.0.1:5173**.

> 🔐 Keep `.env` private. Administrator creation uses `npm run seed:admin` with privately supplied `ADMIN_EMAIL` and `ADMIN_PASSWORD`; there is no built-in admin password. Remove the seed password afterward.

## 🛠️ Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the frontend and backend locally |
| `npm run build` | Create the production build |
| `npm start` | Serve the built website and API |
| `npm test` | Run unit tests |

## 🚧 Current scope

Parking discovery and reservations are implemented. **Online payments are not yet integrated**, owner approval emails require SMTP configuration, and password recovery is not available.

## 📚 Setup guides

These files are included in the **docs** folder:

- [🐙 Connect the project to GitHub](docs/GITHUB.md)
- [☁️ Deploy using free hosting](docs/DEPLOYMENT.md)
