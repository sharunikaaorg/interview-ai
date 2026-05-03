import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, Loader2, AlertCircle, ChevronRight } from 'lucide-react'
import { createJD, listJDs } from '../services/api'

const JDList = () => {
  const navigate = useNavigate()
  const [jds, setJds] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchJDs() }, [])

  const fetchJDs = async () => {
    try {
      const res = await listJDs()
      setJds(res.data)
    } catch { setError('Failed to load JDs') }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return setError('Title and description required')
    setLoading(true)
    setError('')
    try {
      await createJD({ title: title.trim(), description: description.trim() })
      setTitle('')
      setDescription('')
      fetchJDs()
    } catch { setError('Failed to create JD') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Job Descriptions</h2>
        <p className="text-gray-600">Create a JD first, then add candidates to it</p>
      </div>

      {/* Create JD Form */}
      <form onSubmit={handleCreate} className="card mb-8">
        <div className="flex items-center mb-4">
          <Plus className="w-5 h-5 text-primary-600 mr-2" />
          <h3 className="text-lg font-semibold">Create New JD</h3>
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Job title (e.g. Senior React Developer)"
          className="input-field mb-3"
          required
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Full job description — responsibilities, requirements, skills..."
          rows={6}
          className="textarea-field mb-4"
          required
        />
        <button type="submit" disabled={loading} className="btn-primary flex items-center">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          {loading ? 'Creating...' : 'Create JD'}
        </button>
      </form>

      {error && (
        <div className="card border-red-200 bg-red-50 mb-6 flex items-center text-red-800">
          <AlertCircle className="w-5 h-5 mr-2" />{error}
        </div>
      )}

      {/* JD List */}
      <div className="space-y-3">
        {jds.length === 0 ? (
          <div className="card text-center text-gray-500 py-12">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No job descriptions yet. Create one above to get started.</p>
          </div>
        ) : jds.map(jd => (
          <div
            key={jd.id}
            onClick={() => navigate(`/jd/${jd.id}`)}
            className="card cursor-pointer hover:border-primary-300 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div>
              <h4 className="font-semibold text-gray-900">{jd.title}</h4>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{jd.description.substring(0, 120)}...</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default JDList
