import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, Volume2, AlertCircle, Loader2, Clock, CheckCircle } from 'lucide-react'
import { getJD, getCandidate, saveTranscript, scoreCandidate } from '../services/api'

const ANSWER_TIME_LIMIT = 60
const SILENCE_REPEAT_DELAY = 5000

const VoiceInterview = () => {
  const { jdId, cid } = useParams()
  const navigate = useNavigate()

  const [jd, setJd] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [status, setStatus] = useState('loading')
  const [currentQ, setCurrentQ] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [liveText, setLiveText] = useState('')
  const [timer, setTimer] = useState(0)
  const [error, setError] = useState('')
  const [voicesReady, setVoicesReady] = useState(false)

  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const resumeTimerRef = useRef(null)
  const postSpeechSilenceRef = useRef(null)
  const gotSpeechRef = useRef(false)
  const accumulatedTextRef = useRef('')
  const questionsRef = useRef([])
  const transcriptRef = useRef([])
  const currentQRef = useRef(0)
  const statusRef = useRef('loading')
  const candidateRef = useRef(null)
  const jdRef = useRef(null)
  const listenStartTimeRef = useRef(0)
  const restartCountRef = useRef(0)
  const intentionalStopRef = useRef(false)
  const suppressOnEndRef = useRef(false)

  useEffect(() => { statusRef.current = status }, [status])
  useEffect(() => { currentQRef.current = currentQ }, [currentQ])
  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  // Load voices — this is the key fix
  useEffect(() => {
    const synth = window.speechSynthesis
    const loadVoices = () => {
      const voices = synth.getVoices()
      if (voices.length > 0) {
        setVoicesReady(true)
      }
    }
    loadVoices()
    synth.onvoiceschanged = loadVoices
    return () => { synth.onvoiceschanged = null }
  }, [])

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const [jdRes, cRes] = await Promise.all([getJD(jdId), getCandidate(jdId, cid)])
        setJd(jdRes.data)
        setCandidate(cRes.data)
        jdRef.current = jdRes.data
        candidateRef.current = cRes.data
        questionsRef.current = cRes.data.questions
        if (!cRes.data.questions?.length) {
          setError('No questions generated for this candidate')
          setStatus('error')
          return
        }
        setStatus('ready')
      } catch { setError('Failed to load interview data'); setStatus('error') }
    })()
    return () => { cleanup() }
  }, [jdId, cid])

  const cleanup = () => {
    clearInterval(timerRef.current)
    clearTimeout(silenceTimerRef.current)
    clearTimeout(postSpeechSilenceRef.current)
    clearInterval(resumeTimerRef.current)
    try { recognitionRef.current?.abort() } catch {}
    window.speechSynthesis.cancel()
  }

  // --- Speech Synthesis (fixed) ---
  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis
      synth.cancel()

      // Small delay after cancel to avoid Chrome race condition
      setTimeout(() => {
        const utt = new SpeechSynthesisUtterance(text)
        utt.rate = 0.95
        utt.pitch = 1
        utt.volume = 1

        const voices = synth.getVoices()
        const preferred = voices.find(v =>
          v.name.includes('Samantha') ||
          v.name.includes('Google US English') ||
          v.name.includes('Microsoft Zira')
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0]

        if (preferred) utt.voice = preferred

        let done = false
        const finish = () => {
          if (done) return
          done = true
          clearInterval(resumeTimerRef.current)
          resolve()
        }

        utt.onend = finish
        utt.onerror = (e) => {
          // 'interrupted' fires when we cancel intentionally — ignore it
          if (e.error === 'interrupted') return
          console.error('Speech error:', e.error)
          finish()
        }

        setStatus('speaking')
        synth.speak(utt)

        // Chrome bug: speech pauses after ~15s. Resume periodically.
        // Only start this after 5s so it doesn't interfere with short utterances.
        clearInterval(resumeTimerRef.current)
        resumeTimerRef.current = setInterval(() => {
          if (synth.speaking && !synth.paused) {
            synth.pause()
            synth.resume()
          }
        }, 12000)

        // Safety: if onend never fires (another Chrome bug), resolve after a generous timeout
        const wordCount = text.split(/\s+/).length
        const estimatedMs = Math.max(3000, wordCount * 400) // ~150 wpm = 400ms/word
        setTimeout(() => {
          if (!done && !synth.speaking) finish()
        }, estimatedMs)
      }, 100)
    })
  }, [])

  // --- Speech Recognition ---
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { setError('Speech recognition not supported. Use Chrome.'); return }

    // Fresh instance every time to avoid Chrome session limit bug
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    accumulatedTextRef.current = ''
    gotSpeechRef.current = false
    intentionalStopRef.current = false
    listenStartTimeRef.current = Date.now()
    setLiveText('')
    setTimer(0)
    setStatus('listening')

    // Hard time limit (60s)
    let elapsed = 0
    timerRef.current = setInterval(() => {
      elapsed++
      setTimer(elapsed)
      if (elapsed >= ANSWER_TIME_LIMIT) {
        intentionalStopRef.current = true
        clearAll()
        try { recognition.stop() } catch {}
      }
    }, 1000)

    // 5s initial silence → repeat question
    silenceTimerRef.current = setTimeout(() => {
      if (!gotSpeechRef.current && statusRef.current === 'listening') {
        repeatCurrentQuestion()
      }
    }, SILENCE_REPEAT_DELAY)

    recognition.onresult = (event) => {
      gotSpeechRef.current = true
      clearTimeout(silenceTimerRef.current)

      let final = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t + ' '
        else interim = t
      }
      accumulatedTextRef.current = (final + interim).trim()
      setLiveText(accumulatedTextRef.current)

      // Reset the 10s post-speech silence timer on every new speech
      clearTimeout(postSpeechSilenceRef.current)
      postSpeechSilenceRef.current = setTimeout(() => {
        // User has been silent for 10s after speaking → auto-submit
        if (accumulatedTextRef.current.trim()) {
          intentionalStopRef.current = true
          clearAll()
          try { recognition.stop() } catch {}
        }
      }, 10000)
    }

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return
      if (e.error === 'aborted') return // we handle restart in onend
      console.error('Recognition error:', e.error)
      if (e.error === 'network') {
        intentionalStopRef.current = true
        clearAll()
        finishAnswer(accumulatedTextRef.current.trim())
      }
    }

    recognition.onend = () => {
      // Suppressed — e.g. repeating question, don't submit
      if (suppressOnEndRef.current) {
        suppressOnEndRef.current = false
        return
      }

      // If we intentionally stopped (timeout, got answer, etc.), submit
      if (intentionalStopRef.current) {
        clearAll()
        finishAnswer(accumulatedTextRef.current.trim())
        return
      }

      // Chrome killed recognition prematurely — auto-restart if < 3s elapsed
      const elapsed = Date.now() - listenStartTimeRef.current
      if (elapsed < 3000 && restartCountRef.current < 5) {
        console.warn(`Recognition died after ${elapsed}ms, restarting (attempt ${restartCountRef.current + 1})`)
        restartCountRef.current++
        // Small delay before restart to avoid rapid-fire
        setTimeout(() => {
          if (statusRef.current === 'listening') {
            try {
              const fresh = new SpeechRecognition()
              fresh.continuous = true
              fresh.interimResults = true
              fresh.lang = 'en-US'
              fresh.onresult = recognition.onresult
              fresh.onerror = recognition.onerror
              fresh.onend = recognition.onend
              recognitionRef.current = fresh
              listenStartTimeRef.current = Date.now()
              fresh.start()
            } catch (e) {
              console.error('Restart failed:', e)
              clearAll()
              finishAnswer(accumulatedTextRef.current.trim())
            }
          }
        }, 300)
        return
      }

      // If user already spoke something, submit it
      if (accumulatedTextRef.current.trim()) {
        clearAll()
        finishAnswer(accumulatedTextRef.current.trim())
        return
      }

      // Genuinely no response after reasonable time
      clearAll()
      finishAnswer('')
    }

    try {
      restartCountRef.current = 0
      recognition.start()
    } catch (e) {
      console.error('Failed to start recognition:', e)
      clearAll()
      finishAnswer('')
    }
  }, [])

  const clearAll = () => {
    clearInterval(timerRef.current)
    clearTimeout(silenceTimerRef.current)
    clearTimeout(postSpeechSilenceRef.current)
  }

  const repeatCurrentQuestion = useCallback(async () => {
    suppressOnEndRef.current = true
    clearAll()
    try { recognitionRef.current?.abort() } catch {}

    const q = questionsRef.current[currentQRef.current]
    await speak(`I'll repeat the question. ${q.text}`)
    startListening()
  }, [speak, startListening])

  const finishAnswer = useCallback(async (answerText) => {
    const qi = currentQRef.current
    const wasTimeout = !answerText

    const newEntries = []
    if (wasTimeout) {
      newEntries.push({ role: 'ai', text: 'Time exceeded. Moving to the next question.', question_index: qi })
      await speak('Time exceeded. Moving to the next question.')
    } else {
      newEntries.push({ role: 'user', text: answerText, question_index: qi })
      await speak('Thank you.')
    }

    setTranscript(prev => [...prev, ...newEntries])

    const nextQ = qi + 1
    if (nextQ < questionsRef.current.length) {
      setCurrentQ(nextQ)
      askQuestion(nextQ)
    } else {
      finishInterview([...transcriptRef.current, ...newEntries])
    }
  }, [speak])

  const startInterview = async () => {
    setError('')
    const c = candidateRef.current
    const j = jdRef.current
    const greeting = `Hello ${c.name}! Welcome to your interview for the ${j.title} position. I'll ask you ${questionsRef.current.length} questions. You have up to 60 seconds per answer. Let's begin.`
    setTranscript([{ role: 'ai', text: greeting, question_index: -1 }])
    await speak(greeting)
    await new Promise(r => setTimeout(r, 800))
    askQuestion(0)
  }

  const askQuestion = async (qi) => {
    const q = questionsRef.current[qi]
    const text = `Question ${qi + 1} of ${questionsRef.current.length}. ${q.text}`
    setTranscript(prev => [...prev, { role: 'ai', text, question_index: qi }])
    await speak(text)
    startListening()
  }

  const finishInterview = async (fullTranscript) => {
    setStatus('processing')
    try {
      const c = candidateRef.current
      await speak(`That concludes our interview. Thank you ${c.name}. Let me process your results.`)
      await saveTranscript(jdId, cid, fullTranscript)
      await scoreCandidate(jdId, cid)
      setStatus('done')
      setTimeout(() => navigate(`/jd/${jdId}/candidate/${cid}/results`), 1500)
    } catch (e) {
      console.error(e)
      setError('Failed to save/score interview')
      setStatus('error')
    }
  }

  const questions = candidate?.questions || []
  const progress = questions.length > 0 ? ((currentQ + (status === 'done' ? 1 : 0)) / questions.length) * 100 : 0

  if (status === 'loading') return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">AI Interview</h2>
        <p className="text-gray-600">{candidate?.name} — {jd?.title}</p>
      </div>

      {status !== 'ready' && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Question {Math.min(currentQ + 1, questions.length)} of {questions.length}</span>
            {status === 'listening' && (
              <span className={`flex items-center ${timer > 50 ? 'text-red-600' : timer > 30 ? 'text-yellow-600' : 'text-gray-600'}`}>
                <Clock className="w-3 h-3 mr-1" />{timer}s / {ANSWER_TIME_LIMIT}s
              </span>
            )}
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div className="bg-primary-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="card mb-6">
        {status === 'ready' && (
          <div className="text-center py-8">
            <Mic className="w-16 h-16 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready to Begin</h3>
            <p className="text-gray-600 mb-2 text-sm">
              {questions.length} questions • 60s per answer • AI will ask automatically
            </p>
            <p className="text-gray-500 mb-6 text-xs">
              If you don't respond within 5 seconds, the question will be repeated.
            </p>
            {!voicesReady && (
              <p className="text-yellow-600 text-sm mb-4">⏳ Loading speech engine...</p>
            )}
            <button onClick={startInterview} disabled={!voicesReady} className="btn-primary text-lg px-8 py-3 disabled:opacity-50">
              🎤 Start Interview
            </button>
          </div>
        )}

        {status === 'speaking' && (
          <div className="text-center py-8">
            <Volume2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
            <p className="text-blue-700 font-medium">AI is speaking...</p>
            <div className="mt-4 bg-blue-50 rounded-lg p-4 text-left">
              <p className="text-blue-900">{questions[currentQ]?.text}</p>
            </div>
          </div>
        )}

        {status === 'listening' && (
          <div className="text-center py-6">
            <div className="relative inline-block mb-4">
              <Mic className="w-12 h-12 text-red-500" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
            </div>
            <p className="text-red-600 font-medium mb-2">Listening...</p>
            <div className="bg-blue-50 rounded-lg p-3 mb-4 text-left">
              <p className="text-sm text-blue-800 font-medium">Q: {questions[currentQ]?.text}</p>
            </div>
            {liveText ? (
              <div className="bg-green-50 rounded-lg p-3 text-left">
                <p className="text-xs text-green-700 font-medium mb-1">Your response:</p>
                <p className="text-green-900 text-sm">{liveText}</p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Speak now... (repeats in 5s if silent)</p>
            )}
            <div className="mt-4 bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-1000 ${timer > 50 ? 'bg-red-500' : timer > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${(timer / ANSWER_TIME_LIMIT) * 100}%` }}
              />
            </div>
          </div>
        )}

        {status === 'processing' && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-700 font-medium">Saving transcript & scoring...</p>
          </div>
        )}

        {status === 'done' && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-green-700 font-medium">Interview complete! Redirecting to results...</p>
          </div>
        )}
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 mb-6 flex items-center text-red-800">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />{error}
        </div>
      )}

      {transcript.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Conversation</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transcript.map((entry, i) => (
              <div key={i} className={`flex ${entry.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  entry.role === 'ai' ? 'bg-blue-50 text-blue-900' : 'bg-green-50 text-green-900'
                }`}>
                  <span className="text-xs font-medium opacity-60">{entry.role === 'ai' ? 'AI' : 'You'}</span>
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

export default VoiceInterview
