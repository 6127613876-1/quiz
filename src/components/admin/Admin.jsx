import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from '../common/styles';
import LoadingError from '../common/LoadingError';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [activeAdminSection, setActiveAdminSection] = useState(null);
  const [quizSessions, setQuizSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [entryMethod, setEntryMethod] = useState('manual');
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOption, setCorrectOption] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [passageTitle, setPassageTitle] = useState('');
  const [passageText, setPassageText] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [resultSessionCode, setResultSessionCode] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [resultFilter, setResultFilter] = useState('all');
  const [violationSessionCode, setViolationSessionCode] = useState('');
  const [quizViolations, setQuizViolations] = useState([]);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [showViolationDetails, setShowViolationDetails] = useState(false);
  const [showQuestionsPreview, setShowQuestionsPreview] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editQuestionData, setEditQuestionData] = useState({
    question: '',
    options: { a: '', b: '', c: '', d: '' },
    correct: ''
  });
  const [editingSession, setEditingSession] = useState(null);
  const [editSessionData, setEditSessionData] = useState({
    name: '',
    questions: [],
    passages: [],
    audioFiles: []
  });
  const [newQuestionData, setNewQuestionData] = useState({
    question: '',
    options: { a: '', b: '', c: '', d: '' },
    correct: ''
  });

  const API_BASE_URL = 'https://tce-quiz-app.onrender.com';

  
  const apiCall = async (endpoint, method = 'GET', data = null) => {
    setLoading(true);
    setError('');
    try {
      const config = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (data) config.body = JSON.stringify(data);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      setError(error.message);
      console.error('API Error:', error);
      throw error;
    }
  };

  const handleAdminLogin = async () => {
    try {
      const response = await apiCall('/api/admin/login', 'POST', { adminCode });
      if (response.success) {
        setUser({ role: 'admin' }); // Set user state
        setIsAdminAuthenticated(true);
        await loadQuizSessions();
      } else {
        toast.error('Invalid admin code!');
      }
    } catch (error) {
      toast.error('Login failed: ' + error.message);
    }
  };

  const loadQuizSessions = async () => {
    try {
      const sessions = await apiCall('/api/quiz-sessions');
      setQuizSessions(sessions);
    } catch (error) {
      toast.error('Failed to load quiz sessions: ' + error.message);
    }
  };

  const handleCreateSession = async () => {
    const sessionName = prompt('Enter Quiz Session Name:');
    if (sessionName) {
      try {
        const newSession = await apiCall('/api/quiz-sessions', 'POST', { name: sessionName, createdBy: 'admin' });
        setCurrentSessionId(newSession.sessionId);
        setActiveAdminSection('create');
        await loadQuizSessions();
        toast.success(`Session created with ID: ${newSession.sessionId}`);
      } catch (error) {
        toast.error('Failed to create session: ' + error.message);
      }
    }
  };

  const handleAddQuestion = async () => {
    if (questionText && optionA && optionB && optionC && optionD && correctOption && currentSessionId) {
      try {
        const questionData = {
          question: questionText,
          options: { a: optionA, b: optionB, c: optionC, d: optionD },
          correct: correctOption,
        };
        await apiCall(`/api/quiz-sessions/${currentSessionId}/questions`, 'POST', questionData);
        setQuestionText('');
        setOptionA('');
        setOptionB('');
        setOptionC('');
        setOptionD('');
        setCorrectOption('');
        await loadQuizSessions();
        toast.success('Question added successfully!');
        setShowQuestionsPreview(true); // Show preview after adding
      } catch (error) {
        toast.error('Failed to add question: ' + error.message);
      }
    } else {
      toast.info('Please fill all fields!');
    }
  };

  const parseCsvFile = (file) => {
    import('papaparse').then((Papa) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            const errorMessages = results.errors.map((e) => `Row ${e.row + 1}: ${e.message}`);
            setCsvErrors(errorMessages);
            toast.error('CSV parsing errors found. Check the preview section.');
            return;
          }
          const requiredColumns = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer'];
          const csvColumns = Object.keys(results.data[0] || {});
          const missingColumns = requiredColumns.filter((col) => !csvColumns.includes(col));
          if (missingColumns.length > 0) {
            setCsvErrors([`Missing required columns: ${missingColumns.join(', ')}`]);
            toast.error(`Missing required columns: ${missingColumns.join(', ')}\n\nRequired columns: ${requiredColumns.join(', ')}`);
            return;
          }
          const questions = results.data.map((row, index) => {
            const correctAnswer = row['Correct Answer']?.toString().trim().toUpperCase();
            return {
              question: row['Question']?.toString().trim(),
              options: {
                a: row['Option A']?.toString().trim(),
                b: row['Option B']?.toString().trim(),
                c: row['Option C']?.toString().trim(),
                d: row['Option D']?.toString().trim(),
              },
              correct: correctAnswer,
              rowIndex: index + 2,
            };
          });
          const validationErrors = [];
          questions.forEach((q, index) => {
            if (!q.question) validationErrors.push(`Row ${q.rowIndex}: Question is empty`);
            if (!q.options.a) validationErrors.push(`Row ${q.rowIndex}: Option A is empty`);
            if (!q.options.b) validationErrors.push(`Row ${q.rowIndex}: Option B is empty`);
            if (!q.options.c) validationErrors.push(`Row ${q.rowIndex}: Option C is empty`);
            if (!q.options.d) validationErrors.push(`Row ${q.rowIndex}: Option D is empty`);
            if (!['A', 'B', 'C', 'D'].includes(q.correct)) {
              validationErrors.push(`Row ${q.rowIndex}: Correct answer must be A, B, C, or D (found: ${q.correct})`);
            }
          });
          if (validationErrors.length > 0) {
            setCsvErrors(validationErrors);
          } else {
            setCsvErrors([]);
          }
          setCsvPreview(questions);
          setShowCsvPreview(true);
        },
        error: (error) => {
          setCsvErrors([`Error reading CSV file: ${error.message}`]);
          toast.error('Error reading CSV file: ' + error.message);
        },
      });
    });
  };

  const handleCsvUpload = async () => {
    if (!csvPreview.length || !currentSessionId) {
      toast.error('No questions to upload or session not selected');
      return;
    }
    if (csvErrors.length > 0) {
      toast.error('Please fix the errors before uploading');
      return;
    }
    try {
      await apiCall(`/api/quiz-sessions/${currentSessionId}/questions/csv`, 'POST', { questions: csvPreview });
      setCsvFile(null);
      setCsvPreview([]);
      setShowCsvPreview(false);
      setCsvErrors([]);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      await loadQuizSessions();
      toast.success(`Successfully uploaded ${csvPreview.length} questions!`);
      setShowQuestionsPreview(true); // Show preview after CSV upload
    } catch (error) {
      toast.error('Failed to upload CSV questions: ' + error.message);
    }
  };

  const clearCsvUpload = () => {
    setCsvFile(null);
    setCsvPreview([]);
    setShowCsvPreview(false);
    setCsvErrors([]);
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  const handleAddPassage = async () => {
    if (!passageTitle.trim() || !passageText.trim() || !currentSessionId) {
      toast.info('Please fill in both title and passage text!');
      return;
    }
    try {
      const passageData = { title: passageTitle.trim(), content: passageText.trim() };
      await apiCall(`/api/quiz-sessions/${currentSessionId}/passages`, 'POST', passageData);
      setPassageTitle('');
      setPassageText('');
      await loadQuizSessions();
      toast.success('Passage added successfully!');
    } catch (error) {
      toast.error('Failed to add passage: ' + error.message);
    }
  };

  const handleEditQuestion = (question, index) => {
    setEditingQuestion(index);
    setEditQuestionData({
      question: question.question,
      options: { ...question.options },
      correct: question.correct
    });
  };

  const handleUpdateQuestion = async () => {
    if (!currentSessionId || editingQuestion === null) return;
    
    try {
      const currentSession = quizSessions.find(s => s.sessionId === currentSessionId);
      if (!currentSession || !currentSession.questions[editingQuestion]) {
        toast.error('Question not found');
        return;
      }

      // Update the question in the local state first
      const updatedQuestions = [...currentSession.questions];
      updatedQuestions[editingQuestion] = {
        ...updatedQuestions[editingQuestion],
        ...editQuestionData
      };

      // Update the session in the database
      await apiCall(`/api/quiz-sessions/${currentSessionId}`, 'PUT', {
        questions: updatedQuestions
      });

      await loadQuizSessions();
      setEditingQuestion(null);
      setEditQuestionData({ question: '', options: { a: '', b: '', c: '', d: '' }, correct: '' });
      toast.success('Question updated successfully!');
    } catch (error) {
      toast.error('Failed to update question: ' + error.message);
    }
  };

  const handleDeleteQuestion = async (questionIndex) => {
    if (!currentSessionId) return;
    
    const confirmDelete = window.confirm('Are you sure you want to delete this question?');
    if (!confirmDelete) return;

    try {
      const currentSession = quizSessions.find(s => s.sessionId === currentSessionId);
      if (!currentSession) {
        toast.error('Session not found');
        return;
      }

      const updatedQuestions = currentSession.questions.filter((_, index) => index !== questionIndex);
      
      await apiCall(`/api/quiz-sessions/${currentSessionId}`, 'PUT', {
        questions: updatedQuestions
      });

      await loadQuizSessions();
      toast.success('Question deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete question: ' + error.message);
    }
  };

  const cancelEdit = () => {
    setEditingQuestion(null);
    setEditQuestionData({ question: '', options: { a: '', b: '', c: '', d: '' }, correct: '' });
  };

  const handleAddAudio = async () => {
    if (!audioFile) {
      toast.info('Please select an audio file first!');
      return;
    }
    if (!currentSessionId) {
      toast.info('Please create or select a quiz session first!');
      return;
    }
    const formData = new FormData();
    formData.append('audio', audioFile);
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/quiz-sessions/${currentSessionId}/audio`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
  const result = await response.json();
  toast.success('Audio uploaded successfully!');
  setAudioFile(null);
  // set to public URL from backend
  setAudioUrl(`${API_BASE_URL}${result.audioFile.path}`);
  const fileInput = document.querySelector('input[type="file"][accept="audio/*"]');
  if (fileInput) fileInput.value = '';
  await loadQuizSessions();
}

       else {
        const error = await response.text();
        toast.error('Failed to upload audio: ' + error);
      }
    } catch (error) {
      toast.error('Failed to upload audio: ' + error.message);
    }
  };

  const handleStartQuiz = async (sessionId) => {
    try {
      await apiCall(`/api/quiz-sessions/${sessionId}/start`, 'PUT');
      await loadQuizSessions();
      toast.info(`Quiz Started! Students can join using code: ${sessionId}`);
    } catch (error) {
      toast.error('Failed to start quiz: ' + error.message);
    }
  };

  const handleEndQuiz = async (sessionId) => {
    try {
      await apiCall(`/api/quiz-sessions/${sessionId}/end`, 'PUT');
      await loadQuizSessions();
      toast.info('Quiz Ended!');
    } catch (error) {
      toast.error('Failed to end quiz: ' + error.message);
    }
  };

  const handleGenerateLink = (sessionId) => {
    const currentSession = quizSessions.find((s) => s.sessionId === sessionId);
    if (currentSession && currentSession.questions.length > 0) {
      toast.info(`Quiz Code: ${sessionId}\nShare this code with students to join the quiz.`);
    } else {
      toast.info('Please add at least one question before generating the code.');
    }
  };

  const loadSessionResults = async (sessionId) => {
    try {
      const results = await apiCall(`/api/quiz-results/${sessionId}`);
      setStudentResults(results);
    } catch (error) {
      toast.error('Failed to load results: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    if (!resultSessionCode) {
      toast.info('Please enter a quiz code first!');
      return;
    }
    if (studentResults.length === 0) {
      toast.error('No results found to export!');
      return;
    }
    const currentSession = quizSessions.find((s) => s.sessionId === resultSessionCode);
    const sessionName = currentSession ? currentSession.name : resultSessionCode;
    const filename = `Quiz_Results_${sessionName}_${resultSessionCode}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(studentResults, filename);
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data to export!');
      return;
    }
    const headers = [
      'Student Name',
      'Registration Number',
      'Department',
      'Score',
      'Total Questions',
      'Percentage',
      'Grade',
      'Submission Date',
      'Submission Time',
    ];
    const csvContent = [
      headers.join(','),
      ...data.map((result) => {
        const submissionDate = new Date(result.submittedAt);
        const grade = getGradeFromPercentage(result.percentage);
        return [
          `"${result.studentName}"`,
          `"${result.regNo}"`,
          `"${result.department}"`,
          result.score,
          result.totalQuestions,
          result.percentage,
          `"${grade}"`,
          submissionDate.toLocaleDateString(),
          submissionDate.toLocaleTimeString(),
        ].join(',');
      }),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const loadQuizViolations = async (sessionId) => {
    try {
      setLoading(true);
      const violations = await apiCall(`/api/quiz-violations/${sessionId}`);
      const uniqueViolations = [];
      const seenRegNos = new Set();
      for (const v of violations) {
        if (!seenRegNos.has(v.regNo)) {
          seenRegNos.add(v.regNo);
          uniqueViolations.push(v);
        }
      }
      setQuizViolations(uniqueViolations);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error('Failed to load violations: ' + error.message);
    }
  };

  const handleApproveResume = async (violationId) => {
    try {
      const response = await apiCall(`/api/quiz-violations/${violationId}/resume`, 'POST');
      if (response && response.success) {
        toast.success('Resume approved. The student can now continue the quiz.');
      } else {
        toast.success(response?.message || 'Resume approved.');
      }
      if (violationSessionCode) {
        await loadQuizViolations(violationSessionCode);
      }
    } catch (error) {
      toast.error('Failed to approve resume: ' + error.message);
    }
  };

  const handleRestartStudentQuiz = async (violation) => {
    const confirmRestart = window.confirm(
      `Are you sure you want to restart the quiz for ${violation.studentName} (${violation.regNo})?\n\nThis will:\n\u2022 Allow them to restart from question 1\n\u2022 Give them full time allocation\n\u2022 Reset their violation count\n\u2022 Mark this violation as resolved`
    );
    if (!confirmRestart) return;
    try {
      const response = await apiCall(`/api/quiz-violations/${violation._id}/restart`, 'POST', {
        adminAction: true,
        restartReason: 'Admin approved restart due to violations',
      });
      if (response.success) {
        toast.info(`Quiz restart approved for ${violation.studentName}! The student can restart without a token.`);
        if (violationSessionCode) {
          await loadQuizViolations(violationSessionCode);
        }
      }
    } catch (error) {
      toast.error('Failed to approve quiz restart: ' + error.message);
    }
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    setEditSessionData({
      name: session.name,
      questions: [...session.questions],
      passages: session.passages || [],
      audioFiles: session.audioFiles || []
    });
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;
    
    try {
      const response = await apiCall(`/api/quiz-sessions/${editingSession.sessionId}`, 'PUT', editSessionData);
      if (response.success) {
        await loadQuizSessions();
        setEditingSession(null);
        setEditSessionData({ name: '', questions: [], passages: [], audioFiles: [] });
        toast.success('Quiz session updated successfully!');
      }
    } catch (error) {
      toast.error('Failed to update quiz session: ' + error.message);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this quiz session? This will also delete all associated results and violations.');
    if (!confirmDelete) return;

    try {
      await apiCall(`/api/quiz-sessions/${sessionId}`, 'DELETE');
      await loadQuizSessions();
      toast.success('Quiz session deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete quiz session: ' + error.message);
    }
  };

  const cancelEditSession = () => {
    setEditingSession(null);
    setEditSessionData({ name: '', questions: [], passages: [], audioFiles: [] });
  };

  const handleAddQuestionToSession = () => {
    if (!newQuestionData.question || !newQuestionData.options.a || !newQuestionData.options.b || 
        !newQuestionData.options.c || !newQuestionData.options.d || !newQuestionData.correct) {
      toast.info('Please fill all question fields!');
      return;
    }

    const newQuestion = {
      question: newQuestionData.question,
      options: { ...newQuestionData.options },
      correct: newQuestionData.correct
    };

    setEditSessionData({
      ...editSessionData,
      questions: [...editSessionData.questions, newQuestion]
    });

    // Clear the form
    setNewQuestionData({
      question: '',
      options: { a: '', b: '', c: '', d: '' },
      correct: ''
    });

    toast.success('Question added to session!');
  };

  useEffect(() => {
    if (resultSessionCode && activeAdminSection === 'results') {
      loadSessionResults(resultSessionCode);
    }
  }, [resultSessionCode, activeAdminSection]);

  useEffect(() => {
    if (violationSessionCode && activeAdminSection === 'violations') {
      loadQuizViolations(violationSessionCode);
    }
  }, [violationSessionCode, activeAdminSection]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      setIsAdminAuthenticated(true);
      loadQuizSessions();
    }
  }, [user]);

  if (!isAdminAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <ToastContainer />
          <LoadingError loading={loading} error={error} />
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2>Admin Login</h2>
            <p style={{ color: '#666' }}>Enter admin code to continue</p>
          </div>
          <input
            type="password"
            placeholder="Enter admin code"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            style={styles.input}
            onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
            disabled={loading}
          />
          <div style={{ textAlign: 'center' }}>
            <button style={styles.button} onClick={handleAdminLogin} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeAdminSection) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <ToastContainer />
          <LoadingError loading={loading} error={error} />
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1>Admin Dashboard</h1>
            <p style={{ color: '#666' }}>Total Sessions: {quizSessions.length}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', padding: '30px', border: '2px solid #ddd', borderRadius: '15px', minWidth: '200px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📝</div>
              <h3>Create Quiz</h3>
              <button style={styles.button} onClick={handleCreateSession} disabled={loading}>
                Create
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '30px', border: '2px solid #ddd', borderRadius: '15px', minWidth: '200px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📊</div>
              <h3>View Results</h3>
              <button style={styles.button} onClick={() => setActiveAdminSection('results')} disabled={loading}>
                View
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '30px', border: '2px solid #ddd', borderRadius: '15px', minWidth: '200px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📋</div>
              <h3>Quiz Sessions</h3>
              <button style={styles.button} onClick={() => setActiveAdminSection('sessions')} disabled={loading}>
                Manage
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '30px', border: '2px solid #ddd', borderRadius: '15px', minWidth: '200px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚠️</div>
              <h3>Quiz Violations</h3>
              <button style={styles.button} onClick={() => setActiveAdminSection('violations')} disabled={loading}>
                View
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeAdminSection === 'create') {
    const currentSession = quizSessions.find((s) => s.sessionId === currentSessionId);
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <ToastContainer />
          <LoadingError loading={loading} error={error} />
          <button style={{ ...styles.button, marginBottom: '20px' }} onClick={() => setActiveAdminSection(null)} disabled={loading}>
            ← Back to Dashboard
          </button>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2>Create Quiz: {currentSession?.name}</h2>
            <p style={{ color: '#666', fontSize: '18px' }}>
              Quiz Code: <strong>{currentSessionId}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'inline-flex', background: '#f0f0f0', borderRadius: '25px', padding: '5px' }}>
              <button
                style={{
                  ...styles.button,
                  background: entryMethod === 'manual' ? 'linear-gradient(45deg, #667eea, #764ba2)' : 'transparent',
                  color: entryMethod === 'manual' ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '20px',
                  margin: '0 5px',
                  padding: '10px 20px',
                }}
                onClick={() => setEntryMethod('manual')}
                disabled={loading}
              >
                ✏️ Manual Entry
              </button>
              <button
                style={{
                  ...styles.button,
                  background: entryMethod === 'csv' ? 'linear-gradient(45deg, #667eea, #764ba2)' : 'transparent',
                  color: entryMethod === 'csv' ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '20px',
                  margin: '0 5px',
                  padding: '10px 20px',
                }}
                onClick={() => setEntryMethod('csv')}
                disabled={loading}
              >
                📊 CSV Upload
              </button>
              <button
                style={{
                  ...styles.button,
                  background: entryMethod === 'comprehension' ? 'linear-gradient(45deg, #667eea, #764ba2)' : 'transparent',
                  color: entryMethod === 'comprehension' ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '20px',
                  margin: '0 5px',
                  padding: '10px 20px',
                }}
                onClick={() => setEntryMethod('comprehension')}
                disabled={loading}
              >
                📖 Comprehension
              </button>
              <button
                style={{
                  ...styles.button,
                  background: entryMethod === 'audio' ? 'linear-gradient(45deg, #667eea, #764ba2)' : 'transparent',
                  color: entryMethod === 'audio' ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '20px',
                  margin: '0 5px',
                  padding: '10px 20px',
                }}
                onClick={() => setEntryMethod('audio')}
                disabled={loading}
              >
                🎵 Audio Upload
              </button>
            </div>
          </div>

          {entryMethod === 'manual' && (
            <div style={{ marginBottom: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '15px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>✏️</div>
                <h3 style={{ color: '#667eea' }}>Add Questions Manually</h3>
              </div>
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter your question"
                style={styles.input}
                disabled={loading}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  placeholder="Option A"
                  style={styles.input}
                  disabled={loading}
                />
                <input
                  type="text"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  placeholder="Option B"
                  style={styles.input}
                  disabled={loading}
                />
                <input
                  type="text"
                  value={optionC}
                  onChange={(e) => setOptionC(e.target.value)}
                  placeholder="Option C"
                  style={styles.input}
                  disabled={loading}
                />
                <input
                  type="text"
                  value={optionD}
                  onChange={(e) => setOptionD(e.target.value)}
                  placeholder="Option D"
                  style={styles.input}
                  disabled={loading}
                />
              </div>
              <select
                value={correctOption}
                onChange={(e) => setCorrectOption(e.target.value)}
                style={styles.select}
                disabled={loading}
              >
                <option value="">Select Correct Answer</option>
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <button style={styles.button} onClick={handleAddQuestion} disabled={loading}>
                  {loading ? 'Adding...' : '➕ Add Question'}
                </button>
              </div>
            </div>
          )}

          {entryMethod === 'csv' && (
            <div style={{ marginBottom: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '15px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📊</div>
                <h3 style={{ color: '#667eea' }}>Upload Questions via CSV</h3>
              </div>
              <input type="file" accept=".csv" onChange={(e) => parseCsvFile(e.target.files[0])} style={styles.input} />
              {csvErrors.length > 0 && (
                <div style={{ color: 'red' }}>
                  <h4>CSV Errors:</h4>
                  <ul>
                    {csvErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {showCsvPreview && (
                <div>
                  <h4>CSV Preview:</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ border: '1px solid #ddd', padding: '8px' }}>Question</th>
                          <th style={{ border: '1px solid #ddd', padding: '8px' }}>A</th>
                          <th style={{ border: '1px solid #ddd', padding: '8px' }}>B</th>
                          <th style={{ border: '1px solid #ddd', padding: '8px' }}>C</th>
                          <th style={{ border: '1px solid #ddd', padding: '8px' }}>D</th>
                          <th style={{ border: '1px solid #ddd', padding: '8px' }}>Correct</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((q, index) => (
                          <tr key={index}>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{q.question}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{q.options.a}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{q.options.b}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{q.options.c}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{q.options.d}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{q.correct}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button style={styles.button} onClick={handleCsvUpload} disabled={loading || csvErrors.length > 0}>
                      {loading ? 'Uploading...' : 'Upload CSV'}
                    </button>
                    <button style={{ ...styles.button, background: 'grey' }} onClick={clearCsvUpload} disabled={loading}>
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {entryMethod === 'comprehension' && (
            <div style={{ marginBottom: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '15px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📖</div>
                <h3 style={{ color: '#667eea' }}>Add Comprehension Passage</h3>
              </div>
              <input
                type="text"
                value={passageTitle}
                onChange={(e) => setPassageTitle(e.target.value)}
                placeholder="Passage Title"
                style={styles.input}
                disabled={loading}
              />
              <textarea
                value={passageText}
                onChange={(e) => setPassageText(e.target.value)}
                placeholder="Passage Text"
                style={{ ...styles.input, height: '200px' }}
                disabled={loading}
              />
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <button style={styles.button} onClick={handleAddPassage} disabled={loading}>
                  {loading ? 'Adding...' : '➕ Add Passage'}
                </button>
              </div>
            </div>
          )}

          {entryMethod === 'audio' && (
            <div style={{ marginBottom: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '15px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎵</div>
                <h3 style={{ color: '#667eea' }}>Upload Audio File</h3>
              </div>
              <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} style={styles.input} />

              {audioUrl && (
  <div style={{ marginTop: '10px' }}>
    <p>Preview:</p>
    <audio controls src={audioUrl} style={{ width: '100%' }} />
  </div>
)}

              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <button style={styles.button} onClick={handleAddAudio} disabled={loading}>
                  {loading ? 'Uploading...' : '➕ Upload Audio'}
                </button>
              </div>
            </div>
          )}

          {/* Questions Preview Section */}
          {currentSessionId && (
            <div style={{ marginTop: '40px', padding: '20px', background: '#f0f8ff', borderRadius: '15px', border: '2px solid #667eea' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>👁️</div>
                <h3 style={{ color: '#667eea' }}>Questions Preview</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  {quizSessions.find(s => s.sessionId === currentSessionId)?.questions?.length || 0} questions added
                </p>
                <button 
                  style={{ ...styles.button, background: 'linear-gradient(45deg, #4CAF50, #45a049)' }}
                  onClick={() => setShowQuestionsPreview(!showQuestionsPreview)}
                >
                  {showQuestionsPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>

              {showQuestionsPreview && (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {quizSessions.find(s => s.sessionId === currentSessionId)?.questions?.map((question, index) => (
                    <div key={index} style={styles.questionPreviewCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <h4 style={{ margin: 0, color: '#333' }}>Question {index + 1}</h4>
                        <div>
                          <button 
                            style={{ ...styles.resumeButton, background: 'linear-gradient(45deg, #2196F3, #1976D2)', marginRight: '5px' }}
                            onClick={() => handleEditQuestion(question, index)}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            style={{ ...styles.resumeButton, background: 'linear-gradient(45deg, #f44336, #d32f2f)' }}
                            onClick={() => handleDeleteQuestion(index)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      {editingQuestion === index ? (
                        <div style={styles.editQuestionForm}>
                          <input
                            type="text"
                            value={editQuestionData.question}
                            onChange={(e) => setEditQuestionData({ ...editQuestionData, question: e.target.value })}
                            placeholder="Question text"
                            style={styles.input}
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <input
                              type="text"
                              value={editQuestionData.options.a}
                              onChange={(e) => setEditQuestionData({ 
                                ...editQuestionData, 
                                options: { ...editQuestionData.options, a: e.target.value } 
                              })}
                              placeholder="Option A"
                              style={styles.input}
                            />
                            <input
                              type="text"
                              value={editQuestionData.options.b}
                              onChange={(e) => setEditQuestionData({ 
                                ...editQuestionData, 
                                options: { ...editQuestionData.options, b: e.target.value } 
                              })}
                              placeholder="Option B"
                              style={styles.input}
                            />
                            <input
                              type="text"
                              value={editQuestionData.options.c}
                              onChange={(e) => setEditQuestionData({ 
                                ...editQuestionData, 
                                options: { ...editQuestionData.options, c: e.target.value } 
                              })}
                              placeholder="Option C"
                              style={styles.input}
                            />
                            <input
                              type="text"
                              value={editQuestionData.options.d}
                              onChange={(e) => setEditQuestionData({ 
                                ...editQuestionData, 
                                options: { ...editQuestionData.options, d: e.target.value } 
                              })}
                              placeholder="Option D"
                              style={styles.input}
                            />
                          </div>
                          <select
                            value={editQuestionData.correct}
                            onChange={(e) => setEditQuestionData({ ...editQuestionData, correct: e.target.value })}
                            style={styles.select}
                          >
                            <option value="">Select Correct Answer</option>
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                          </select>
                          <div style={{ textAlign: 'center', marginTop: '15px' }}>
                            <button style={styles.button} onClick={handleUpdateQuestion}>
                              Update Question
                            </button>
                            <button style={{ ...styles.button, background: 'grey', marginLeft: '10px' }} onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p style={{ marginBottom: '15px', fontSize: '16px', lineHeight: '1.5' }}>
                            <strong>Q:</strong> {question.question}
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={styles.previewOption(question.correct === 'A')}>
                              <strong>A:</strong> {question.options.a}
                            </div>
                            <div style={styles.previewOption(question.correct === 'B')}>
                              <strong>B:</strong> {question.options.b}
                            </div>
                            <div style={styles.previewOption(question.correct === 'C')}>
                              <strong>C:</strong> {question.options.c}
                            </div>
                            <div style={styles.previewOption(question.correct === 'D')}>
                              <strong>D:</strong> {question.options.d}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', marginTop: '15px' }}>
                            <span style={styles.correctAnswerBadge}>
                              ✓ Correct Answer: {question.correct}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {(!quizSessions.find(s => s.sessionId === currentSessionId)?.questions || 
                    quizSessions.find(s => s.sessionId === currentSessionId)?.questions.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📝</div>
                      <h4>No questions added yet</h4>
                      <p>Add questions using the methods above to see them here</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeAdminSection === 'results') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <ToastContainer />
          <LoadingError loading={loading} error={error} />
          <button style={{ ...styles.button, marginBottom: '20px' }} onClick={() => setActiveAdminSection(null)} disabled={loading}>
            ← Back to Dashboard
          </button>
          <div style={styles.resultsHeader}>
            <h2>Quiz Results</h2>
            <button style={styles.csvButton} onClick={handleExportCSV} disabled={loading}>
              Export to CSV
            </button>
          </div>
          <input
            type="text"
            placeholder="Enter Quiz Code to see results"
            value={resultSessionCode}
            onChange={(e) => setResultSessionCode(e.target.value)}
            style={styles.input}
            disabled={loading}
          />
          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} style={styles.select}>
            <option value="all">All Results</option>
            <option value=">=80">≥ 80%</option>
            <option value="<=40">≤ 40%</option>
          </select>
          <div>
            {studentResults
              .filter((result) => {
                if (resultFilter === '>=80') return result.percentage >= 80;
                if (resultFilter === '<=40') return result.percentage <= 40;
                return true;
              })
              .map((result, index) => {
                const grade = getGradeFromPercentage(result.percentage);
                const isPass = grade !== 'F';
                return (
                  <div
                    key={index}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                      borderLeft: `6px solid ${isPass ? '#4caf50' : '#f44336'}`,
                      margin: '18px 0',
                      padding: '24px 32px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      maxWidth: 700
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, flexWrap: 'wrap', gap: 12 }}>
                      <div><b>Name:</b> {result.studentName}</div>
                      <div><b>Reg No:</b> {result.regNo}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <b>Score:</b> {result.score}/{result.totalQuestions} ({result.percentage}%)
                        <span style={{
                          marginLeft: 8,
                          padding: '2px 12px',
                          borderRadius: 12,
                          background: isPass ? '#4caf50' : '#f44336',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 15
                        }}>{grade}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 16, flexWrap: 'wrap', gap: 12 }}>
                      <div><b>Department:</b> {result.department}</div>
                      <div><b>Submitted:</b> {new Date(result.submittedAt).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  if (activeAdminSection === 'sessions') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <ToastContainer />
          <LoadingError loading={loading} error={error} />
          <button style={{ ...styles.button, marginBottom: '20px' }} onClick={() => setActiveAdminSection(null)} disabled={loading}>
            ← Back to Dashboard
          </button>
          <h2>Quiz Sessions</h2>
          <div>
            {quizSessions.map((session) => (
              <div key={session.sessionId} style={styles.questionCard}>
                {editingSession && editingSession.sessionId === session.sessionId ? (
                  <div style={styles.editSessionForm}>
                    <h3>Edit Quiz Session</h3>
                    <input
                      type="text"
                      value={editSessionData.name}
                      onChange={(e) => setEditSessionData({ ...editSessionData, name: e.target.value })}
                      placeholder="Quiz Session Name"
                      style={styles.input}
                    />
                    <div style={{ marginTop: '15px' }}>
                      <h4>Questions ({editSessionData.questions.length})</h4>
                      
                      {/* Add New Question Form */}
                      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                        <h5 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>➕ Add New Question</h5>
                        <input
                          type="text"
                          value={newQuestionData.question}
                          onChange={(e) => setNewQuestionData({ ...newQuestionData, question: e.target.value })}
                          placeholder="Enter new question"
                          style={styles.input}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <input
                            type="text"
                            value={newQuestionData.options.a}
                            onChange={(e) => setNewQuestionData({ 
                              ...newQuestionData, 
                              options: { ...newQuestionData.options, a: e.target.value } 
                            })}
                            placeholder="Option A"
                            style={styles.input}
                          />
                          <input
                            type="text"
                            value={newQuestionData.options.b}
                            onChange={(e) => setNewQuestionData({ 
                              ...newQuestionData, 
                              options: { ...newQuestionData.options, b: e.target.value } 
                            })}
                            placeholder="Option B"
                            style={styles.input}
                          />
                          <input
                            type="text"
                            value={newQuestionData.options.c}
                            onChange={(e) => setNewQuestionData({ 
                              ...newQuestionData, 
                              options: { ...newQuestionData.options, c: e.target.value } 
                            })}
                            placeholder="Option C"
                            style={styles.input}
                          />
                          <input
                            type="text"
                            value={newQuestionData.options.d}
                            onChange={(e) => setNewQuestionData({ 
                              ...newQuestionData, 
                              options: { ...newQuestionData.options, d: e.target.value } 
                            })}
                            placeholder="Option D"
                            style={styles.input}
                          />
                        </div>
                        <select
                          value={newQuestionData.correct}
                          onChange={(e) => setNewQuestionData({ ...newQuestionData, correct: e.target.value })}
                          style={styles.select}
                        >
                          <option value="">Select Correct Answer</option>
                          <option value="A">Option A</option>
                          <option value="B">Option B</option>
                          <option value="C">Option C</option>
                          <option value="D">Option D</option>
                        </select>
                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                          <button 
                            style={{ ...styles.button, background: 'linear-gradient(45deg, #4CAF50, #45a049)' }}
                            onClick={handleAddQuestionToSession}
                          >
                            Add Question
                          </button>
                        </div>
                      </div>

                      <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '15px' }}>
                        {editSessionData.questions.map((question, index) => (
                          <div key={index} style={styles.questionPreviewCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                              <h5 style={{ margin: 0 }}>Question {index + 1}</h5>
                              <button 
                                style={{ ...styles.resumeButton, background: 'linear-gradient(45deg, #f44336, #d32f2f)', padding: '4px 8px', fontSize: '10px' }}
                                onClick={() => {
                                  const newQuestions = editSessionData.questions.filter((_, i) => i !== index);
                                  setEditSessionData({ ...editSessionData, questions: newQuestions });
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                            <p style={{ fontSize: '14px', marginBottom: '8px' }}><strong>Q:</strong> {question.question}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '12px' }}>
                              <span style={styles.previewOption(question.correct === 'A')}><strong>A:</strong> {question.options.a}</span>
                              <span style={styles.previewOption(question.correct === 'B')}><strong>B:</strong> {question.options.b}</span>
                              <span style={styles.previewOption(question.correct === 'C')}><strong>C:</strong> {question.options.c}</span>
                              <span style={styles.previewOption(question.correct === 'D')}><strong>D:</strong> {question.options.d}</span>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '8px' }}>
                              <span style={styles.correctAnswerBadge}>✓ {question.correct}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {editSessionData.passages && editSessionData.passages.length > 0 && (
                      <div style={{ marginTop: '15px' }}>
                        <h4>Passages ({editSessionData.passages.length})</h4>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {editSessionData.passages.map((passage, index) => (
                            <div key={index} style={styles.passagePreview}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>{passage.title}</strong>
                                <button 
                                  style={{ ...styles.resumeButton, background: 'linear-gradient(45deg, #f44336, #d32f2f)', padding: '4px 8px', fontSize: '10px' }}
                                  onClick={() => {
                                    const newPassages = editSessionData.passages.filter((_, i) => i !== index);
                                    setEditSessionData({ ...editSessionData, passages: newPassages });
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                {passage.content.substring(0, 100)}...
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {editSessionData.audioFiles && editSessionData.audioFiles.length > 0 && (
                      <div style={{ marginTop: '15px' }}>
                        <h4>Audio Files ({editSessionData.audioFiles.length})</h4>
                        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                          {editSessionData.audioFiles.map((audio, index) => (
                            <div key={index} style={styles.audioPreview}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px' }}>🎵 {audio.originalName}</span>
                                <button 
                                  style={{ ...styles.resumeButton, background: 'linear-gradient(45deg, #f44336, #d32f2f)', padding: '4px 8px', fontSize: '10px' }}
                                  onClick={() => {
                                    const newAudioFiles = editSessionData.audioFiles.filter((_, i) => i !== index);
                                    setEditSessionData({ ...editSessionData, audioFiles: newAudioFiles });
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                      <button style={styles.button} onClick={handleUpdateSession}>
                        Update Session
                      </button>
                      <button style={{ ...styles.button, background: 'grey', marginLeft: '10px' }} onClick={cancelEditSession}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>{session.name}</h3>
                    <p>ID: {session.sessionId}</p>
                    <p>Status: {session.isActive ? '🟢 Active' : '🔴 Inactive'}</p>
                    <p>Questions: {session.questions.length}</p>
                    {session.passages && session.passages.length > 0 && (
                      <p>Passages: {session.passages.length}</p>
                    )}
                    {session.audioFiles && session.audioFiles.length > 0 && (
                      <p>Audio Files: {session.audioFiles.length}</p>
                    )}
                    <p>Created: {new Date(session.createdAt).toLocaleDateString()}</p>
                    
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
                      <button style={styles.button} onClick={() => handleStartQuiz(session.sessionId)} disabled={loading || session.isActive}>
                        Start
                      </button>
                      <button style={styles.button} onClick={() => handleEndQuiz(session.sessionId)} disabled={loading || !session.isActive}>
                        End
                      </button>
                      <button style={styles.button} onClick={() => handleGenerateLink(session.sessionId)} disabled={loading}>
                        Link
                      </button>
                      <button 
                        style={{ ...styles.button, background: 'linear-gradient(45deg, #2196F3, #1976D2)' }}
                        onClick={() => handleEditSession(session)}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        style={{ ...styles.button, background: 'linear-gradient(45deg, #f44336, #d32f2f)' }}
                        onClick={() => handleDeleteSession(session.sessionId)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeAdminSection === 'violations') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <ToastContainer />
          <LoadingError loading={loading} error={error} />
          <button style={{ ...styles.button, marginBottom: '20px' }} onClick={() => setActiveAdminSection(null)} disabled={loading}>
            ← Back to Dashboard
          </button>
          <h2>Quiz Violations</h2>
          <input
            type="text"
            placeholder="Enter Quiz Code to see violations"
            value={violationSessionCode}
            onChange={(e) => setViolationSessionCode(e.target.value)}
            style={styles.input}
          />
          <div>
            {quizViolations.map((violation) => (
              <div key={violation._id} style={styles.violationCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <p style={{ margin: '5px 0', fontSize: '16px' }}>
                      <strong>{violation.studentName}</strong> ({violation.regNo})
                    </p>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      <strong>Department:</strong> {violation.department}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={styles.violationStatusBadge(violation.isResolved, violation.adminAction)}>
                      {violation.isResolved ? '✅ Resolved' : 
                       violation.adminAction === 'resume_approved' ? '🔄 Resume Approved' :
                       violation.adminAction === 'restart_approved' ? '🔄 Restart Approved' :
                       '⏳ Pending'}
                    </div>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      {new Date(violation.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>Violation Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <p style={{ margin: '5px 0' }}>
                        <strong>Type:</strong> 
                        <span style={styles.violationTypeBadge(violation.violationType)}>
                          {violation.violationType.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </p>
                      <p style={{ margin: '5px 0' }}>
                        <strong>Current Question:</strong> {violation.currentQuestion || 'N/A'}
                      </p>
                      <p style={{ margin: '5px 0' }}>
                        <strong>Time Left:</strong> {Math.floor((violation.timeLeft || 0) / 60)}m {(violation.timeLeft || 0) % 60}s
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '5px 0' }}>
                        <strong>Tab Switches:</strong> {violation.tabSwitchCount || 0}
                      </p>
                      <p style={{ margin: '5px 0' }}>
                        <strong>Time Spent:</strong> {Math.floor((violation.timeSpent || 0) / 60)}m {(violation.timeSpent || 0) % 60}s
                      </p>
                      {violation.resolvedAt && (
                        <p style={{ margin: '5px 0', color: '#28a745' }}>
                          <strong>Resolved:</strong> {new Date(violation.resolvedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {false && violation.userAnswers && violation.userAnswers.length > 0 && (
                  <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                    <h5 style={{ margin: '0 0 10px 0', color: '#856404' }}>Student's Answers</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: '8px' }}>
                      {violation.userAnswers.map((answer, index) => (
                        <div key={index} style={styles.answerBadge(answer)}>
                          Q{index + 1}: {answer || 'No Answer'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    style={styles.resumeButton}
                    onClick={() => {
                      setSelectedViolation(violation);
                      setShowViolationDetails(true);
                    }}
                  >
                    📋 Details
                  </button>
                  
                  {!violation.isResolved && (
                    <>
                      {violation.adminAction !== 'resume_approved' && (
                        <button 
                          style={{ ...styles.resumeButton, background: 'linear-gradient(45deg, #28a745, #20c997)' }}
                          onClick={() => handleApproveResume(violation._id)} 
                          disabled={loading}
                        >
                          ✅ Approve Resume
                        </button>
                      )}
                      
                      {violation.adminAction !== 'restart_approved' && (
                        <button 
                          style={{ ...styles.resumeButton, background: 'linear-gradient(45deg, #ffc107, #fd7e14)' }}
                          onClick={() => handleRestartStudentQuiz(violation)} 
                          disabled={loading}
                        >
                          🔄 Approve Restart
                        </button>
                      )}
                    </>
                  )}
                  
                  {violation.isResolved && (
                    <span style={styles.resolvedBadge}>
                      ✅ Issue Resolved
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {quizViolations.length === 0 && violationSessionCode && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>✅</div>
                <h4>No violations found</h4>
                <p>Great! No students have violated quiz rules in this session.</p>
              </div>
            )}
          </div>
          
          {showViolationDetails && selectedViolation && (
            <div style={styles.passageModal}>
              <div style={styles.passageContent}>
                <button onClick={() => setShowViolationDetails(false)} style={{ float: 'right' }}>
                  Close
                </button>
                <h3>Violation Details - {selectedViolation.studentName}</h3>
                
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4>Status Information</h4>
                  <div style={styles.violationStatusBadge(selectedViolation.isResolved, selectedViolation.adminAction)}>
                    {selectedViolation.isResolved ? '✅ Resolved' : 
                     selectedViolation.adminAction === 'resume_approved' ? '🔄 Resume Approved' :
                     selectedViolation.adminAction === 'restart_approved' ? '🔄 Restart Approved' :
                     '⏳ Pending'}
                  </div>
                  <p><strong>Created:</strong> {new Date(selectedViolation.createdAt).toLocaleString()}</p>
                  {selectedViolation.resolvedAt && (
                    <p><strong>Resolved:</strong> {new Date(selectedViolation.resolvedAt).toLocaleString()}</p>
                  )}
                </div>

                <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4>Violation Details</h4>
                  <p><strong>Student:</strong> {selectedViolation.studentName} ({selectedViolation.regNo})</p>
                  <p><strong>Department:</strong> {selectedViolation.department}</p>
                  <p><strong>Violation Type:</strong> {selectedViolation.violationType.replace(/_/g, ' ').toUpperCase()}</p>
                  <p><strong>Current Question:</strong> {selectedViolation.currentQuestion || 'N/A'}</p>
                  <p><strong>Time Left:</strong> {Math.floor((selectedViolation.timeLeft || 0) / 60)}m {(selectedViolation.timeLeft || 0) % 60}s</p>
                  <p><strong>Time Spent:</strong> {Math.floor((selectedViolation.timeSpent || 0) / 60)}m {(selectedViolation.timeSpent || 0) % 60}s</p>
                  <p><strong>Tab Switch Count:</strong> {selectedViolation.tabSwitchCount || 0}</p>
                </div>

                {false && selectedViolation.userAnswers && selectedViolation.userAnswers.length > 0 && (
                  <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
                    <h4>Student's Answers</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '10px' }}>
                      {selectedViolation.userAnswers.map((answer, index) => (
                        <div key={index} style={styles.answerBadge(answer)}>
                          Q{index + 1}: {answer || 'No Answer'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default Admin;