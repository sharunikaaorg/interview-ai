# AI Interview Agent 🎯

A full-stack AI-powered interview assistant that analyzes job descriptions and resumes to generate personalized interview questions, conducts voice interviews, and provides comprehensive candidate scoring.

## ✨ Features

- **Smart Question Generation**: AI-powered questions based on job requirements and candidate background
- **Voice Interview**: Real-time voice conversation with AI interviewer  
- **Live Transcription**: Real-time speech-to-text during interviews
- **Intelligent Scoring**: Comprehensive evaluation across technical, behavioral, and situational categories
- **Beautiful UI**: Modern, responsive interface built with React and TailwindCSS
- **Export Reports**: Download detailed interview reports in JSON format

## 🛠 Tech Stack

### Backend
- **FastAPI** - Python web framework
- **Groq API** - LLM for question generation and scoring (`llama3-70b-8192`)
- **Gemini Live API** - Real-time voice conversation (`gemini-2.0-flash-live-001`)
- **WebSockets** - Real-time communication
- **Pydantic** - Data validation

### Frontend  
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling and design system
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Lucide React** - Icon library

## 🏗 Project Structure

```
ai-interview-agent/
├── backend/
│   ├── main.py                 # FastAPI app entry
│   ├── routers/
│   │   ├── questions.py        # Question generation endpoint
│   │   ├── transcript.py       # Transcript analysis endpoint  
│   │   └── scoring.py          # Interview scoring endpoint
│   ├── services/
│   │   ├── groq_service.py     # Groq API integration
│   │   └── gemini_service.py   # Gemini Live streaming
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   ├── ws/
│   │   └── interview_ws.py     # WebSocket handlers
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Upload.jsx      # Document upload page
│   │   │   ├── Interview.jsx   # Voice interview page
│   │   │   └── Results.jsx     # Score report page
│   │   ├── components/
│   │   │   ├── Layout.jsx      # App layout wrapper
│   │   │   └── AudioRecorder.jsx # Voice recording component
│   │   ├── services/
│   │   │   └── api.js          # API client
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** 
- **Node.js 18+**
- **Groq API Key** - Get from [console.groq.com](https://console.groq.com)
- **Gemini API Key** - Get from [aistudio.google.com](https://aistudio.google.com/apikey)

### 1. Clone & Setup

```bash
git clone <your-repo>
cd ai-interview-agent
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys:
# GROQ_API_KEY=your_groq_api_key
# GEMINI_API_KEY=your_gemini_api_key

# Start backend server
uvicorn main:app --reload --port 8000
```

Backend will be running at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies  
npm install

# Start development server
npm run dev
```

Frontend will be running at `http://localhost:5173`

## 📋 Usage Flow

### Step 1: Upload Documents
- Paste job description and resume text
- Configure number of questions (5-10)
- Click "Generate Interview Questions"

### Step 2: Voice Interview  
- AI interviewer asks questions one by one
- Candidate responds via microphone
- Real-time transcription of conversation
- Interview auto-completes or can be ended manually

### Step 3: View Results
- Overall score out of 100
- Category breakdowns (Technical, Behavioral, Situational)  
- Radar chart visualization
- Detailed strengths and improvement areas
- Hiring recommendation
- Full interview transcript
- Export report option

## 🎯 Question Distribution

The AI generates questions across three categories:
- **40% Technical** - Role-specific skills from job description
- **30% Behavioral** - Past experience from resume  
- **30% Situational** - Problem-solving scenarios

## 🔌 API Endpoints

### Core APIs
- `POST /api/generate-questions` - Generate interview questions
- `POST /api/analyse-transcript` - Analyze Q&A transcripts  
- `POST /api/score` - Score complete interview
- `WS /ws/interview` - Real-time voice interview WebSocket

### Health Checks
- `GET /health` - Backend health status
- `GET /api/health` - API health with service status

## ⚙️ Configuration

### Backend Configuration
- **CORS**: Configured for `localhost:5173` (frontend dev server)
- **Mock Mode**: Available for testing without Gemini API
- **Error Handling**: Comprehensive error responses and fallbacks

### Frontend Configuration  
- **Proxy**: API requests proxied to backend via Vite
- **WebSocket**: Real-time connection to backend
- **Responsive**: Mobile-friendly design

## 🎨 UI/UX Features

- **Progress Indicators**: Multi-step wizard with clear progression
- **Real-time Feedback**: Live audio level indicators during recording
- **Modern Design**: Clean, professional interface with TailwindCSS
- **Accessibility**: Keyboard navigation and screen reader support
- **Error Handling**: User-friendly error messages and retry options

## 🔧 Development

### Running in Development

```bash
# Backend (Terminal 1)
cd backend
uvicorn main:app --reload --port 8000

# Frontend (Terminal 2) 
cd frontend  
npm run dev
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# Backend deployment
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 🐛 Troubleshooting

### Common Issues

**1. CORS Errors**
- Ensure backend is running on port 8000
- Check CORS configuration in `main.py`

**2. WebSocket Connection Failed**
- Verify backend WebSocket endpoint is accessible
- Check firewall settings

**3. Audio Recording Issues**
- Grant microphone permissions in browser
- Test with Chrome/Edge (better MediaRecorder support)

**4. API Key Issues**  
- Verify keys are set in `.env` file
- Check key validity with API providers

### Mock Mode Testing
The application includes mock modes for testing without API keys:
- Mock interview session for voice testing
- Fallback question generation 
- Sample scoring responses

## 📊 Performance Notes

- **Question Generation**: ~3-5 seconds with Groq LLM
- **Voice Processing**: Real-time with 250ms audio chunks
- **Scoring**: ~5-10 seconds depending on interview length
- **WebSocket Latency**: <100ms for local development

## 🔐 Security Considerations

- API keys stored in environment variables
- No persistent data storage (MVP scope)
- CORS protection configured
- Input validation with Pydantic
- Error message sanitization

## 🎯 Future Enhancements

- User authentication and sessions
- Database integration for interview history
- Multi-language support
- Video recording capabilities  
- Advanced analytics dashboard
- Question bank management
- Team collaboration features

## 📝 License

MIT License - Feel free to use this project for your own purposes.

---

## 🎉 Ready to Go!

Your AI Interview Agent is now set up and ready to conduct intelligent interviews! 

Visit `http://localhost:5173` to start using the application.