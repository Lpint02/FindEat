#  [**FindEat 🍴**](https://findeat.altervista.org/)

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Webpack-8DD6F9?style=for-the-badge&logo=Webpack&logoColor=white" alt="Webpack" />
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=Leaflet&logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white" alt="Bootstrap" />
</p>

## 📌 Overview

**FindEat** is a lightweight, high-performance web application designed to help users discover nearby restaurants. It features an interactive map, quick-glance lists, and a comprehensive details panel loaded with photos, business hours, and customer reviews. Users can also authenticate to save their favorite spots.

This project was built from the ground up using **Vanilla JavaScript**, demonstrating a deep understanding of core programming concepts, software design patterns, and modern web APIs, deliberately avoiding heavy JavaScript frameworks to focus on fundamentals.

## ✨ Key Features

- **Custom Single Page Application (SPA) Router:** Developed a bespoke client-side router for seamless, fast navigation without full page reloads.
- **MVP Architecture (Model-View-Presenter):** Structured cleanly with a custom MVP pattern to ensure a robust separation of concerns, scalability, and code maintainability.
- **Interactive Maps & Geolocation:** Integrated **Leaflet.js** and **Google Places/Overpass API** to accurately fetch and display nearby restaurants based on the user's location.
- **Authentication & Database Integration:** Implemented secure user login and registration flows, alongside data persistence for saving favorite restaurants, using **Firebase Auth** and **Firestore**.
- **Responsive UI/UX:** Crafted a dynamic, mobile-friendly interface utilizing **Bootstrap 5** alongside custom CSS with a tailored design system. Features include image galleries, distance badges, and interactive liking systems.
- **Modern Build Pipeline:** Configured **Webpack** and **Babel** for efficient modular bundling and cross-browser JS compatibility.

## 🛠️ Technical Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+), Bootstrap 5
- **Architecture:** Custom SPA Router, MVP Design Pattern
- **Map & APIs:** Leaflet.js, Google Places API / Overpass API
- **Backend & Auth:** Firebase Authentication, Cloud Firestore
- **Tooling:** Webpack 5, Babel

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Lpint02/FindEat.git
   cd FindEat
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```
   *The app will be available automatically on your browser (usually at `http://localhost:8080`).*

4. **Build for production:**
   ```bash
   npm run build
   ```

## 🧠 Architectural Highlights

### Why Vanilla JS instead of React/Vue/Angular?
This project was intentionally built without external UI frameworks to demonstrate:
- **Core JavaScript Proficiency:** Deep understanding of the DOM manipulation, event delegation, closures, and asynchronous programming (Promises/Async-Await).
- **Design Patterns Validation:** Real-world application of the **Model-View-Presenter (MVP)** pattern to decouple the UI from business logic.
- **State & Routing Management:** Engineering a custom client-side Router from scratch to handle history API and state changes efficiently.


