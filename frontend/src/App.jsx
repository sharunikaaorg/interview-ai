import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import JDList from './pages/JDList'
import Candidates from './pages/Candidates'
import VoiceInterview from './pages/VoiceInterview'
import Results from './pages/Results'
import Layout from './components/Layout'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<JDList />} />
          <Route path="/jd/:jdId" element={<Candidates />} />
          <Route path="/jd/:jdId/candidate/:cid/interview" element={<VoiceInterview />} />
          <Route path="/jd/:jdId/candidate/:cid/results" element={<Results />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
