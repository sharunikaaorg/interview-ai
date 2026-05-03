import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { UserPlus, FileText, Loader2, AlertCircle, Play, CheckCircle, ArrowLeft } from 'lucide-react'
import { getJD, listCandidates, addCandidate, generateQuestions, processFile } from '../services/api'

const Candidates = () => {
  const { jdId } = useParams()
  const navigate = useNavigate()
  const [jd, setJd] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [name, setName] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [loading, setLoading] = useState({ page: true, add: false, gen: null })
  const [error, setError] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)

  useEffect(() => { fetchData() }, [jdId])

  const fetchData = async () => {
    try {
      const [jdRes, candRes] = await Promise.all([getJD(jdId), listCandidates(jdId)])
      setJd(jdRes.data)
      setCandidates(candRes.data)
    } catch { setError('Failed to load data') }
    finally { setLoading(p => ({ ...p, page: false })) }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const res = await processFile(file)
      setResumeText(res.data.text)
      setUploadedFile(res.data.filename)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process file')
    }
  }

  const handleAddCandidate = async (e) => {
    e.preventDefault()
    if (!name.trim() || !resumeText.trim()) return setError('Name and resume required')
    setLoading(p => ({ ...p, add: true }))
    setError('')
    try {
      await addCandidate(jdId, { name: name.trim(), resume_text: resumeText.trim() })
      setName('')
      setResumeText('')
      setUploadedFile(null)
      fetchData()
    } catch { setError('Failed to add candidate') }
    finally { setLoading(p => ({ ...p, add: false })) }
  }

  const handleGenerateQuestions = async (cid) => {
    setLoading(p => ({ ...p, gen: cid }))
    setError('')
    try {
      await generateQuestions(jdId, cid)
      fetchData()
    } catch { setError('Failed to generate questions') }
    finally { setLoading(p => ({ ...p, gen: null })) }
  }

  if (loading.page) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to JDs
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{jd?.title}</h2>
        <p className="text-gray-600 mt-1 text-sm">{jd?.description?.substring(0, 200)}...</p>
      </div>

      {/* Add Candidate Form */}
      <form onSubmit={handleAddCandidate} className="card mb-8">
        <div className="flex items-center mb-4">
          <UserPlus className="w-5 h-5 text-primary-600 mr-2" />
          <h3 className="text-lg font-semibold">Add Candidate</h3>
        </div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Candidate name"
          className="input-field mb-3"
          required
        />
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume</label>
          <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFileUpload} className="input-field" />
          {uploadedFile && <p className="text-xs text-green-600 mt-1">✓ {uploadedFile} processed</p>}
        </div>
        <textarea
          value={resumeText}
          onChange={e => setResumeText(e.target.value)}
          placeholder="Or paste resume text..."
          rows={4}
          className="textarea-field mb-4"
          required
        />
        <button type="submit" disabled={loading.add} className="btn-primary flex items-center">
          {loading.add ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
          {loading.add ? 'Adding...' : 'Add Candidate'}
        </button>
      </form>

      {error && (
        <div className="card border-red-200 bg-red-50 mb-6 flex items-center text-red-800">
          <AlertCircle className="w-5 h-5 mr-2" />{error}
        </div>
      )}

      {/* Candidates List */}
      <h3 className="text-lg font-semibold mb-4">Candidates ({candidates.length})</h3>
      {candidates.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">No candidates yet. Add one above.</div>
      ) : (
        <div className="space-y-3">
          {candidates.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{c.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {c.questions.length > 0
                      ? `${c.questions.length} questions generated`
                      : 'No questions yet'}
                    {c.scores && ' • Scored ✓'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {c.questions.length === 0 ? (
                    <button
                      onClick={() => handleGenerateQuestions(c.id)}
                      disabled={loading.gen === c.id}
                      className="btn-primary text-sm flex items-center"
                    >
                      {loading.gen === c.id
                        ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</>
                        : <><FileText className="w-3 h-3 mr-1" />Generate Questions</>}
                    </button>
                  ) : !c.scores ? (
                    <button
                      onClick={() => navigate(`/jd/${jdId}/candidate/${c.id}/interview`)}
                      className="btn-primary text-sm flex items-center"
                    >
                      <Play className="w-3 h-3 mr-1" /> Start Interview
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/jd/${jdId}/candidate/${c.id}/results`)}
                      className="btn-secondary text-sm flex items-center"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> View Results
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Candidates
