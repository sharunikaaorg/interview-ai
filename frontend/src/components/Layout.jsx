import { useLocation } from 'react-router-dom'
import { Brain, Briefcase, Users, Mic, BarChart3 } from 'lucide-react'

const Layout = ({ children }) => {
  const location = useLocation()
  const path = location.pathname

  const getStep = () => {
    if (path === '/') return 1
    if (path.match(/^\/jd\/[^/]+$/)) return 2
    if (path.includes('/interview')) return 3
    if (path.includes('/results')) return 4
    return 1
  }

  const step = getStep()
  const steps = [
    { n: 1, title: 'Job Descriptions', icon: Briefcase },
    { n: 2, title: 'Candidates', icon: Users },
    { n: 3, title: 'Interview', icon: Mic },
    { n: 4, title: 'Results', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-14">
          <div className="flex items-center justify-center w-8 h-8 bg-primary-600 rounded-lg mr-2">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">AI Interview Agent</h1>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  s.n < step ? 'bg-green-500 border-green-500 text-white'
                    : s.n === step ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <span className={`ml-2 text-xs font-medium hidden sm:inline ${
                  s.n === step ? 'text-primary-600' : s.n < step ? 'text-green-600' : 'text-gray-400'
                }`}>{s.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 sm:w-16 h-px mx-2 ${s.n < step ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <p className="text-center text-xs text-gray-500">AI Interview Agent — Powered by Groq LLM</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
