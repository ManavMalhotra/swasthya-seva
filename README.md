# 🏥 Swasthya Seva

A modern, full-stack healthcare management platform built with **Next.js 16**, **Firebase**, and **AI-powered features**. Swasthya Seva (meaning "Health Service" in Hindi) connects patients with doctors, provides intelligent health insights, and streamlines medical workflows.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.1-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-12.6-FFCA28?style=flat-square&logo=firebase)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=flat-square&logo=tailwind-css)

---

## ✨ Features

### 👨‍⚕️ Doctor Dashboard
- **Patient Management** – View and manage assigned patients
- **NFC/RFID Integration** – Scan patient cards using Web NFC technology
- **Health Analytics** – Monitor patient vitals and medication adherence
- **Critical Alerts** – Identify patients requiring immediate attention

### 👤 Patient Dashboard
- **Health Score Tracking** – AI-calculated health metrics and trends
- **Medication Management** – Track prescriptions, log doses, and monitor adherence
- **Vitals History** – Record and visualize blood pressure, heart rate, glucose, etc.
- **Medical Reports** – Upload, view, and download reports via Cloudinary

### 🤖 AI-Powered Features
- **Gemini AI Integration** – Intelligent health chatbot for medical queries
- **Health Predictions** – AI-assisted health insights and recommendations
- **Smart Reminders** – Medication and appointment reminders

### 🏥 Additional Features
- **Hospital Finder** – Interactive maps using Leaflet
- **Appointment Scheduling** – Book and manage doctor appointments
- **Real-time Chat** – Patient-doctor communication via Agora Chat
- **Secure Authentication** – Firebase Auth with role-based access

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Frontend** | React 19, TypeScript, Framer Motion |
| **Styling** | Tailwind CSS 4, Radix UI Components |
| **Backend** | Firebase Realtime Database, Firebase Admin |
| **AI/ML** | Google Gemini AI |
| **Storage** | Cloudinary |
| **Maps** | Leaflet, React-Leaflet |
| **State** | Redux Toolkit, React-Redux |
| **Charts** | Recharts |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm**, **yarn**, **pnpm**, or **bun**
- Firebase project with Realtime Database enabled
- Cloudinary account
- Google AI Studio API key (for Gemini)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ManavMalhotra/swasthya-seva.git
   cd swasthya-seva
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   
   Copy the example file and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

---

## 🔐 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""
NEXT_PUBLIC_FIREBASE_DATABASE_URL=""

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google Gemini AI
GEMINI_API_KEY=""

# Firebase Admin SDK
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=""
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run type-check` | Run TypeScript type checking |

---

## 📁 Project Structure

```
swasthya-seva/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── api/               # API routes (AI, uploads)
│   ├── dashboard/         # Dashboard pages
│   ├── patient/           # Patient-specific pages
│   └── components/        # Page-level components
├── components/            # Reusable UI components
│   ├── ui/               # Shadcn UI components
│   ├── auth/             # Authentication components
│   ├── hospitals/        # Hospital-related components
│   └── ...
├── lib/                   # Utilities and services
│   ├── firebase.ts       # Firebase client config
│   ├── firebaseAdmin.ts  # Firebase Admin SDK
│   ├── gemini.ts         # Gemini AI integration
│   └── healthScore.ts    # Health score calculations
├── types/                 # TypeScript type definitions
└── public/               # Static assets
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👨‍💻 Author

**Manav Malhotra**

- GitHub: [@ManavMalhotra](https://github.com/ManavMalhotra)

---

<p align="center">
  Made with ❤️ for better healthcare accessibility
</p>
