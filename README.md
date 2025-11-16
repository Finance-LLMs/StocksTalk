# Conversational Insurance Agents

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)

An interactive conversational AI platform that enables users to engage in insurance consultations with AI insurance experts for India and Singapore. Built with ElevenLabs Conversational AI SDK, this application features multiple AI insurance advisors with distinct insurance packages and expertise areas.

## ✨ Features

- **Single Interface Mode**: Clean, professional dashboard interface for insurance consultations
- **Insurance Consultation**: Get personalized investment advice and insurance insights
- **Real-time Voice Conversation**: Powered by ElevenLabs' advanced voice AI technology
- **Video Avatars**: High-quality video representations of each insurance expert
- **Speaking Indicators**: Visual feedback showing when AI experts are responding
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## 💼 Available Insurance Experts

- **Akshat**: Singapore Expert - Specialized on Singapore insurance area
- **Vikranth**: India Expert - Specialized on Singapore insurance area

## 🚀 Technology Stack

### Frontend
- **Vanilla JavaScript** with modern ES6+ features
- **Webpack** for module bundling and development server
- **CSS3** with responsive glassmorphic design patterns
- **Multi-language Support** with Unicode text rendering
- **HTML5** with semantic structure and accessibility features

### Backend
- **Node.js/Express** server for API endpoints with language routing
- **ElevenLabs API** integration for multi-language conversational AI
- **Environment-based Configuration** for secure API key management
- **CORS** enabled for cross-origin requests

### AI & Language Features
- **Real-time Voice Processing** with ElevenLabs SDK
- **Language-specific Agent Routing** based on user selection
- **Cultural Context Awareness** in AI responses

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** (version 18 or higher)
- **ElevenLabs API Key** - [Get your key here](https://elevenlabs.io/)
- **Git** for cloning the repository

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Finance-LLMs/Conversational-Insurance-Agents.git
cd Conversational-Insurance-Agents
```

### 2. Environment Configuration
Create a `.env` file in the root directory and configure your API keys:

```bash
# Windows
notepad .env

# Linux/macOS
vim .env
```

Add the following environment variables:
```env
API_KEY=`your_api_key`

# Country-specific Agents
SINGAPORE_AGENT_ID=`singapore_agent_id`     # Akshat - Singapore
INDIA_AGENT_ID=`india_agent_id`             # Vikranth - India
```

### 3. Install Dependencies

**Frontend Dependencies:**
```bash
npm install
```

### 4. Build and Run

**Option A: Node.js Backend (Recommended)**
```bash
npm start
```

**Option B: Development Mode with Hot Reload**
```bash
npm run dev
```

### 5. Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

## 🎯 Usage Guide

1. **Access the Dashboard**: Open the application to see the Conversation Insurance Agents
3. **Select Country Advisor**: Choose from available AI insurance advisors (Akshat for Singapore or Vikranth for India)
4. **Start Consultation**: Click "Start Insurance Consultation" to begin your voice conversation
5. **Insurance Discussion**: Ask questions about different insurance policies, the evolving area of insurance or seek insurance advice
6. **End Session**: Click "End Consultation" when finished

## 🏗️ Project Structure

```
Conversational-Insurance-Agents/
├── backend/
│   └── server.js           # Express.js server with multi-language routing
├── src/
│   ├── index.html          # Main dashboard with language selection
│   ├── app.js              # Core application logic
│   ├── styles.css          # Global styles with responsive design
│   └── videos/             # Expert video avatars
│       ├── akshat.mp4      # Akshat video
│       └── vikranth.mp4    # Vikranth video
├── dist/                   # Webpack build output
├── .env                    # Environment variables (not committed)
├── .gitignore              # Git ignore rules
├── package.json            # Node.js dependencies and scripts
├── webpack.config.js       # Webpack configuration
└── README.md               # This file
```

## 🔧 Development

### Available Scripts

- `npm start` - Build and run production server
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:backend` - Start only the Node.js backend

### Development Guidelines

1. Follow modern JavaScript ES6+ standards
2. Maintain responsive design principles across all screen sizes
3. Ensure multi-language support and Unicode text handling
4. Test across different browsers, devices, and language settings
5. Maintain SEBI compliance and educational disclaimers
6. Ensure API key security and never commit secrets to version control
7. Follow cultural sensitivity guidelines for multi-language content

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
