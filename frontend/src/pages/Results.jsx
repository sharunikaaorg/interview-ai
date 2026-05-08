import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Award, TrendingUp, TrendingDown, RotateCcw, Download,
  AlertCircle, CheckCircle2, Target, MessageSquare, ArrowLeft, Loader2
} from 'lucide-react'
import { getJD, getCandidate } from '../services/api'

const Results = () => {
  const { jdId, cid } = useParams()
  const navigate = useNavigate()
  const [jd, setJd] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    (async () => {
      try {
        const [jdRes, cRes] = await Promise.all([getJD(jdId), getCandidate(jdId, cid)])
        setJd(jdRes.data)
        setCandidate(cRes.data)
      } catch { /* handled by null check */ }
      finally { setLoading(false) }
    })()
  }, [jdId, cid])

  if (loading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>

  if (!candidate?.scores) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">No results found. Complete the interview first.</p>
        <button onClick={() => navigate(`/jd/${jdId}`)} className="btn-primary mt-4">Back to Candidates</button>
      </div>
    )
  }

  const scores = candidate.scores
  const transcript = candidate.transcript || []

  const color = (s) => s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600'
  const bg = (s) => s >= 80 ? 'bg-green-100' : s >= 60 ? 'bg-yellow-100' : 'bg-red-100'
  const barColor = (s) => s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  const recColor = (r) => {
    const l = r.toLowerCase()
    if (l === 'strong yes') return 'bg-green-500 text-white'
    if (l === 'yes') return 'bg-green-400 text-white'
    if (l === 'maybe') return 'bg-yellow-500 text-white'
    return 'bg-red-500 text-white'
  }

  const downloadReport = () => {
    const report = { candidate: candidate.name, jd: jd?.title, date: new Date().toISOString(), scores, transcript }
    const uri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2))
    const a = document.createElement('a')
    a.href = uri
    a.download = `interview_${candidate.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate(`/jd/${jdId}`)} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Candidates
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Interview Results</h2>
        <p className="text-gray-600">{candidate.name} — {jd?.title}</p>
      </div>

      {/* Score Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-full ${bg(scores.overall_score)}`}>
              <Award className={`w-6 h-6 ${color(scores.overall_score)}`} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Overall Score</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${recColor(scores.hiring_recommendation)}`}>
                {scores.hiring_recommendation}
              </span>
            </div>
          </div>
          <div className={`text-4xl font-bold ${color(scores.overall_score)}`}>{scores.overall_score}<span className="text-sm text-gray-400">/100</span></div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {scores.category_scores?.map(c => (
            <div key={c.category} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className={`text-xl font-bold ${color(c.score)}`}>{c.score}</div>
              <div className="text-xs text-gray-600 capitalize">{c.category}</div>
            </div>
          ))}
        </div>

        <div className="flex space-x-2">
          <button onClick={downloadReport} className="btn-secondary flex items-center text-sm">
            <Download className="w-3 h-3 mr-1" /> Download
          </button>
          <button onClick={() => navigate('/')} className="btn-primary flex items-center text-sm">
            <RotateCcw className="w-3 h-3 mr-1" /> New Interview
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-6">
          {[
            { id: 'overview', label: 'Analysis', icon: Target },
            { id: 'transcript', label: 'Full Transcript', icon: MessageSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1 py-3 border-b-2 text-sm font-medium ${
                activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" /><span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Category details */}
          {scores.category_scores?.map(c => (
            <div key={c.category} className="card">
              <div className="flex justify-between mb-2">
                <h4 className="font-semibold capitalize">{c.category}</h4>
                <span className={`font-bold ${color(c.score)}`}>{c.score}/100</span>
              </div>
              <div className="bg-gray-200 rounded-full h-1.5 mb-2">
                <div className={`h-1.5 rounded-full ${barColor(c.score)}`} style={{ width: `${c.score}%` }} />
              </div>
              <p className="text-sm text-gray-700">{c.feedback}</p>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center mb-3">
                <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
                <h4 className="font-semibold">Strengths</h4>
              </div>
              <ul className="space-y-1">
                {scores.strengths?.map((s, i) => (
                  <li key={i} className="flex items-start text-sm">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-1 mr-2 flex-shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <div className="flex items-center mb-3">
                <TrendingDown className="w-4 h-4 text-orange-600 mr-2" />
                <h4 className="font-semibold">Improvements</h4>
              </div>
              <ul className="space-y-1">
                {scores.improvements?.map((s, i) => (
                  <li key={i} className="flex items-start text-sm">
                    <Target className="w-3 h-3 text-orange-500 mt-1 mr-2 flex-shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transcript' && (
        <div className="card">
          <h3 className="font-semibold mb-4">Full Interview Transcript</h3>
          <div className="space-y-2">
            {transcript.length === 0 ? (
              <p className="text-gray-500 text-sm">No transcript available.</p>
            ) : transcript.map((entry, i) => (
              <div key={i} className={`flex ${entry.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  entry.role === 'ai' ? 'bg-blue-50 text-blue-900' : 'bg-green-50 text-green-900'
                }`}>
                  <span className="text-xs font-medium opacity-60 block mb-0.5">{entry.role === 'ai' ? '🤖 AI Interviewer' : '👤 Candidate'}</span>
                  <p>{entry.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Results
