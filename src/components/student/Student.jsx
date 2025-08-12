import React, { useState, useEffect, useCallback, useRef } from 'react';
import { styles } from '../common/styles';
import LoadingError from '../common/LoadingError';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import QuestionNavigation from '../common/QuestionNavigation';
const Student = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [studentView, setStudentView] = useState('codeEntry');
  const [quizCode, setQuizCode] = useState('');
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [studentInfo, setStudentInfo] = useState({ name: '', regNo: '', department: '' });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(90 * 60);
  const [showWarning, setShowWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState('');
  const [suspensionMessage, setSuspensionMessage] = useState('');
  const [violationId, setViolationId] = useState(null);
  const [isResuming, setIsResuming] = useState(false);
  const [originalTimeAllotted, setOriginalTimeAllotted] = useState(90 * 60);
  const [timeSpent, setTimeSpent] = useState(0);
  const [violationCount, setViolationCount] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [showPassageModal, setShowPassageModal] = useState(false);

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

  function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  const handleJoinQuiz = async () => {
    try {
      const quiz = await apiCall(`/api/quiz-sessions/${quizCode.toUpperCase()}`);
      if (quiz) {
        if (quiz.isActive && quiz.questions.length > 0) {
          const shuffledQuestions = shuffleArray(quiz.questions).map((q) => {
            const optionsArray = [
              { label: 'A', text: q.options.a },
              { label: 'B', text: q.options.b },
              { label: 'C', text: q.options.c },
              { label: 'D', text: q.options.d },
            ];
            const shuffledOptions = shuffleArray(optionsArray);
            const newOptions = {};
            let newCorrect = '';
            shuffledOptions.forEach((opt, idx) => {
              const label = ['a', 'b', 'c', 'd'][idx];
              newOptions[label] = opt.text;
              if (opt.label === q.correct) {
                newCorrect = label.toUpperCase();
              }
            });
            return { ...q, options: newOptions, correct: newCorrect };
          });

          if (quiz.audioFiles && quiz.audioFiles.length > 0) {
  quiz.audioUrl = `${API_BASE_URL}${quiz.audioFiles[0].path}`;
}

          setCurrentQuiz({ ...quiz, questions: shuffledQuestions });
          setStudentView('form');
          setUserAnswers(new Array(shuffledQuestions.length).fill(null));
        } else if (!quiz.isActive) {
          toast.info('This quiz is not currently active. Please contact your instructor.');
        } else {
          toast.info('This quiz has no questions yet. Please try again later.');
        }
      }
    } catch (error) {
      toast.error('Invalid quiz code or quiz not found. Please check and try again.');
    }
  };

  const startStudentQuiz = async () => {
    if (!studentInfo.name.trim() || !studentInfo.regNo.trim() || !studentInfo.department) {
      toast.info('Please fill in all required fields!');
      return;
    }
    const pending = await checkPendingResume(studentInfo.name, studentInfo.regNo, currentQuiz.sessionId);
    if (pending) {
      return;
    }
    setStudentView('quiz');
    setCurrentQuestion(0);
    setTimeLeft(90 * 60);
    setTabSwitchCount(0);
  };

  const selectOption = (optionIndex) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = ['A', 'B', 'C', 'D'][optionIndex];
    setUserAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion === currentQuiz.questions.length - 1) {
      const unansweredCount = userAnswers.filter((a) => a === null).length;
      if (unansweredCount > 0 && timeLeft > 0) {
        setWarningMessage(`Please answer all questions before submitting. ${unansweredCount} question(s) remaining.`);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 4000);
        return;
      }
      submitQuiz();
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const submitQuiz = useCallback(
    async (isAutoSubmit = false, violationType = null) => {
      if (!currentQuiz) return;
      try {
        if (!isAutoSubmit) {
          const unanswered = userAnswers.filter((a) => a === null).length;
          if (unanswered > 0 && timeLeft > 0) {
            setWarningMessage(`You still have ${unanswered} unanswered question(s). Please answer all questions before submitting.`);
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 4000);
            return;
          }
        }
        const correctAnswers = userAnswers.reduce((count, answer, index) => {
          return answer === currentQuiz.questions[index].correct ? count + 1 : count;
        }, 0);
        if (isAutoSubmit && violationType) {
          const violationData = {
            sessionId: currentQuiz.sessionId,
            studentName: studentInfo.name,
            regNo: studentInfo.regNo,
            department: studentInfo.department,
            currentQuestion,
            userAnswers,
            timeLeft,
            violationType,
            tabSwitchCount,
            timeSpent: originalTimeAllotted - timeLeft,
          };
          const response = await apiCall('/api/quiz-violations', 'POST', violationData);
          setViolationId(response.violationId);
          setStudentView('waitingForAdmin');
          setSuspensionMessage(`Your quiz has been suspended due to ${violationType.replace('_', ' ')}.\n\nPlease contact your instructor for assistance.`);
        } else {
          const resultData = {
            sessionId: currentQuiz.sessionId,
            studentName: studentInfo.name,
            regNo: studentInfo.regNo,
            department: studentInfo.department,
            answers: userAnswers,
            score: correctAnswers,
            totalQuestions: currentQuiz.questions.length,
            percentage: Math.round((correctAnswers / currentQuiz.questions.length) * 100),
            isAutoSubmit,
            isResumed: isResuming,
            timeSpent: originalTimeAllotted - timeLeft,
          };
          await apiCall('/api/quiz-results', 'POST', resultData);
          setStudentView('result');
        }
      } catch (error) {
        toast.error('Failed to submit quiz: ' + error.message);
      }
    },
    [userAnswers, currentQuiz, studentInfo, currentQuestion, timeLeft, tabSwitchCount, isResuming, originalTimeAllotted]
  );

  const restartStudent = () => {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsAudioPlaying(false);
    setStudentView('codeEntry');
    setQuizCode('');
    setCurrentQuiz(null);
    setStudentInfo({ name: '', regNo: '', department: '' });
    setCurrentQuestion(0);
    setUserAnswers([]);
    setTimeLeft(90 * 60);
    setTabSwitchCount(0);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateStudentResults = () => {
    if (!currentQuiz) return { correctAnswers: 0, wrongAnswers: 0, scorePercentage: 0, grade: 'F' };
    const correctAnswers = userAnswers.reduce((count, answer, index) => {
      return answer === currentQuiz.questions[index].correct ? count + 1 : count;
    }, 0);
    const totalQuestions = currentQuiz.questions.length;
    const wrongAnswers = totalQuestions - correctAnswers;
    const scorePercentage = Math.round((correctAnswers / totalQuestions) * 100);
    let grade;
    if (scorePercentage >= 90) grade = 'A+';
    else if (scorePercentage >= 80) grade = 'A';
    else if (scorePercentage >= 70) grade = 'B';
    else if (scorePercentage >= 60) grade = 'C';
    else if (scorePercentage >= 50) grade = 'D';
    else grade = 'F';
    return { correctAnswers, wrongAnswers, scorePercentage, grade };
  };

  const handleResumeQuiz = async () => {
    if (!violationId) {
      toast.info('Waiting for admin approval...');
      return;
    }
    try {
      const response = await apiCall(`/api/quiz-violations/${violationId}/continue`, 'POST');
      if (response.success) {
        try {
          const audioResponse = await fetch(`${API_BASE_URL}/api/quiz-sessions/${response.quizData.sessionId}/audio`, {
            method: 'HEAD',
            headers: { Accept: 'audio/*' },
          });
          response.quizData.hasAudio = audioResponse.ok && audioResponse.status === 200;
        } catch (e) {
          response.quizData.hasAudio = false;
        }
        if (response.actionType === 'resume') {
          setCurrentQuiz(response.quizData);
          setStudentInfo(response.studentInfo);
          setCurrentQuestion(response.currentQuestion);
          setUserAnswers(response.userAnswers);
          setTimeLeft(response.timeLeft);
          setTabSwitchCount(0);
          setIsResuming(true);
          setStudentView('quiz');
          toast.success('Quiz resumed successfully!');
        } else if (response.actionType === 'restart') {
          setCurrentQuiz(response.quizData);
          setStudentInfo(response.studentInfo);
          setCurrentQuestion(0);
          setUserAnswers(new Array(response.quizData.questions.length).fill(null));
          setTimeLeft(response.quizData.timeLimit || 90 * 60);
          setOriginalTimeAllotted(response.quizData.timeLimit || 90 * 60);
          setTabSwitchCount(0);
          setIsResuming(true);
          setStudentView('quiz');
          toast.success('Quiz restarted successfully!');
        }
      }
    } catch (error) {
      toast.error(error?.message || 'Approval not ready yet.');
    }
  };

  const tryAutoResume = useCallback(async () => {
    if (!violationId || studentView !== 'waitingForAdmin') return;
    try {
      const response = await apiCall(`/api/quiz-violations/${violationId}/continue`, 'POST');
      if (!response?.success) return;
      try {
        const audioResponse = await fetch(`${API_BASE_URL}/api/quiz-sessions/${response.quizData.sessionId}/audio`, {
          method: 'HEAD',
          headers: { Accept: 'audio/*' },
        });
        response.quizData.hasAudio = audioResponse.ok && audioResponse.status === 200;
      } catch {
        response.quizData.hasAudio = false;
      }
      if (response.actionType === 'resume') {
        setCurrentQuiz(response.quizData);
        setStudentInfo(response.studentInfo);
        setCurrentQuestion(response.currentQuestion);
        setUserAnswers(response.userAnswers);
        setTimeLeft(response.timeLeft);
        setTabSwitchCount(0);
        setIsResuming(true);
        setStudentView('quiz');
      } else if (response.actionType === 'restart') {
        setCurrentQuiz(response.quizData);
        setStudentInfo(response.studentInfo);
        setCurrentQuestion(0);
        setUserAnswers(new Array(response.quizData.questions.length).fill(null));
        setTimeLeft(response.quizData.timeLimit || 90 * 60);
        setOriginalTimeAllotted(response.quizData.timeLimit || 90 * 60);
        setTabSwitchCount(0);
        setIsResuming(true);
        setStudentView('quiz');
      }
    } catch {
      // Ignore until approved
    }
  }, [violationId, studentView, API_BASE_URL]);

  const checkPendingResume = async (studentName, regNo, sessionId) => {
    try {
      const response = await apiCall('/api/quiz-violations/check-pending', 'POST', { studentName, regNo, sessionId });
      if (response.hasPendingViolation) {
        setViolationId(response.violationId);
        setStudentView('waitingForAdmin');
        setSuspensionMessage(
          `Your quiz was suspended due to ${response.violationType.replace(
            '_',
            ' '
          )}.\n\nPlease wait for your instructor to approve your quiz continuation.`
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking pending resume:', error);
      return false;
    }
  };

  useEffect(() => {
    let timerInterval;
    if (studentView === 'quiz' && timeLeft > 0) {
      timerInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            submitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [studentView, timeLeft, submitQuiz]);

  useEffect(() => {
    if (studentView !== 'quiz') return;
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'x')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [studentView]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (studentView === 'quiz') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden && studentView === 'quiz') {
        setTabSwitchCount((prev) => {
          const newCount = prev + 1;
          if (newCount === 1) {
            setWarningMessage('⚠️ WARNING: Do not switch tabs! Next time your quiz will be auto-submitted!');
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 4000);
            return newCount;
          } else if (newCount >= 2) {
            setWarningMessage('🚫 QUIZ AUTO-SUBMITTED: You switched tabs multiple times!');
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 4000);
            submitQuiz(true, 'tab_switch_violation');
            return newCount;
          }
          return newCount;
        });
      }
    };
    const handleKeyDown = (e) => {
      if (
        studentView === 'quiz' &&
        (e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.key === 'u') ||
          (e.ctrlKey && e.key === 'r') ||
          e.key === 'F5')
      ) {
        e.preventDefault();
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
      }
    };
    const handleContextMenu = (e) => {
      if (studentView === 'quiz') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [studentView, submitQuiz]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const widthRatio = width / screenWidth;
      const heightRatio = height / screenHeight;
      if ((widthRatio < 0.8 || heightRatio < 0.8) && studentView === 'quiz') {
        if (violationCount === 0) {
          setViolationCount(1);
          setWarningMessage('⚠️ SPLIT SCREEN DETECTED: Please maximize your screen. Split screen is not allowed during the quiz.');
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 4000);
        } else {
          setWarningMessage('Split screen detected again. Your quiz has been auto-submitted.');
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 4000);
          submitQuiz(true, 'split_screen_violation');
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [studentView, submitQuiz, violationCount]);

  useEffect(() => {
    if (studentView === 'waitingForAdmin' && violationId) {
      const id = setInterval(() => {
        tryAutoResume();
      }, 3000);
      return () => clearInterval(id);
    }
  }, [studentView, violationId, tryAutoResume]);

  if (studentView === 'codeEntry') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <ToastContainer />
          <LoadingError loading={loading} error={error} />
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2>Join a Quiz</h2>
            <p style={{ color: '#666' }}>Enter the quiz code provided by your instructor</p>
          </div>
          <input
            type="text"
            placeholder="Enter quiz code"
            value={quizCode}
            onChange={(e) => setQuizCode(e.target.value)}
            style={styles.input}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinQuiz()}
            disabled={loading}
          />
          <div style={{ textAlign: 'center' }}>
            <button style={styles.button} onClick={handleJoinQuiz} disabled={loading}>
              {loading ? 'Joining...' : 'Join Quiz'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (studentView === 'form') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <ToastContainer />
          <LoadingError loading={loading} error={error} />
 <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <button style={{...styles.button, marginBottom: '20px'}} onClick={() => setStudentView('codeEntry')} disabled={loading}>
                ← Back
              </button>
              <h2>Student Information</h2>
              <p style={{ color: '#666' }}>Quiz: {currentQuiz?.name}</p>
              <p style={{ color: '#666' }}>Questions: {currentQuiz?.questions?.length || 0} | Time: 90 minutes</p>
            </div>
          
          <input
            type="text"
            placeholder="Full Name"
            value={studentInfo.name}
            onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Register Number"
            value={studentInfo.regNo}
            onChange={(e) => setStudentInfo({ ...studentInfo, regNo: e.target.value })}
            style={styles.input}
          />
          <select
            value={studentInfo.department}
            onChange={(e) => setStudentInfo({ ...studentInfo, department: e.target.value })}
            style={styles.select}
          >
              <option value="">Select Department *</option>
<option value="Civil">Civil Engineering</option>
<option value="Mechanical">Mechanical Engineering</option>
<option value="EEE">Electrical and Electronics Engineering</option>
<option value="ECE">Electronics and Communication Engineering</option>
<option value="CSE AIML">CSE - Artificial Intelligence and Machine Learning</option>
<option value="IT">Information Technology</option>
<option value="Mechatronics">Mechatronics</option>
<option value="AMCS">Applied Mathematics and Computational Sciences</option>
<option value="CSBS">Computer Science and Business Systems</option>
  
              </select>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button style={styles.button} onClick={startStudentQuiz} disabled={loading}>
                  {loading ? 'Starting...' : 'Start Quiz'}
                </button>
              </div>

<div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
                <strong style={{ color: '#856404' }}>⚠️ Important Instructions:</strong>
                <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#856404' }}>
                  <li>Do not refresh, minimize, resize, or switch tabs during the quiz.</li>
    <li>Any attempt to switch tabs, copy content, or navigate away will result in immediate termination and auto-submission of the quiz.</li>
    <li>You are allotted 90 minutes to complete the quiz.</li>
    <li>All fields must be filled before starting the quiz.</li>
                </ul>
              </div>  
  <div style={{ marginTop: '15px', padding: '15px', background: '#e8f5e8', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
    <strong style={{ color: '#155724' }}>🎵 Audio Quiz Information:</strong>
    <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#155724' }}>
      <li>This quiz contains audio reference material</li>
      <li>Make sure your volume is at a comfortable level</li>
      <li>You can play, pause, and restart the audio anytime</li>
      <li>Audio will continue playing as you navigate between questions</li>
    </ul>
  </div>


        </div>
      </div>
    );
  }

  if (studentView === 'quiz') {
    const question = currentQuiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / currentQuiz.questions.length) * 100;

    // Calculate answered questions (0-based index)
    const answeredQuestions = userAnswers
      .map((ans, idx) => (ans !== null ? idx : null))
      .filter((v) => v !== null);

    return (
      <div style={styles.container}>
        <ToastContainer />
        {showWarning && <div style={styles.warningBanner}>{warningMessage}</div>}
        <div style={styles.card}>
          <div style={styles.timer}>{formatTime(timeLeft)}</div>
          <div style={styles.progressBar}>
            <div style={styles.progressFill(progress)}></div>
          </div>
          {currentQuiz?.audioUrl && (
      <div style={{ marginBottom: '20px' }}>
        <audio controls src={currentQuiz.audioUrl} style={{ width: '100%' }} />
      </div>
    )}

          <div style={styles.questionCard}>
            <h3>
              Question {currentQuestion + 1} of {currentQuiz.questions.length}
            </h3>
            <p>{question.question}</p>
          </div>

          {currentQuiz.hasAudio && (
            <div style={styles.audioPlayer}>
              <audio
                ref={audioRef}
                src={`${API_BASE_URL}/api/quiz-sessions/${currentQuiz.sessionId}/audio`}
                onPlay={() => setIsAudioPlaying(true)}
                onPause={() => setIsAudioPlaying(false)}
                controls
              />
            </div>
          )}

          {currentQuiz.passages && currentQuiz.passages.length > 0 && (
            <div>
              {currentQuiz.passages.map((passage) => (
                <button
                  key={passage._id}
                  style={styles.passageButton}
                  onClick={() => {
                    setSelectedPassage(passage);
                    setShowPassageModal(true);
                  }}
                >
                  View Passage: {passage.title}
                </button>
              ))}
            </div>
          )}

          <div>
            {Object.entries(question.options).map(([key, value], index) => (
              <div
                key={key}
                style={styles.option(userAnswers[currentQuestion] === key.toUpperCase())}
                onClick={() => selectOption(index)}
              >
                {key.toUpperCase()}: {value}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button style={styles.button} onClick={previousQuestion} disabled={currentQuestion === 0}>
              ← Previous
            </button>
            <button style={styles.button} onClick={nextQuestion}>
              {currentQuestion === currentQuiz.questions.length - 1 ? 'Submit' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Footer Navigation Panel */}
        <QuestionNavigation
          totalQuestions={currentQuiz.questions.length}
          answeredQuestions={answeredQuestions}
          currentQuestion={currentQuestion}
          onNavigate={setCurrentQuestion}
        />

        {showPassageModal && selectedPassage && (
          <div style={styles.passageModal}>
            <div style={styles.passageContent}>
              <button onClick={() => setShowPassageModal(false)} style={{ float: 'right' }}>
                Close
              </button>
              <h3>{selectedPassage.title}</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{selectedPassage.content}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (studentView === 'result') {
    const { scorePercentage } = calculateStudentResults();
    return (
      <div style={styles.container}>
        <ToastContainer />
        <div style={{ ...styles.card, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{
            ...styles.resultCard,
            animation: 'popIn 0.7s cubic-bezier(0.23, 1, 0.32, 1)',
            boxShadow: '0 8px 32px rgba(102,126,234,0.15)',
            maxWidth: 350,
            width: '100%'
          }}>
            <h2>Quiz Result</h2>
            <div style={styles.scoreCircle(scorePercentage)}>{scorePercentage}%</div>
            <div style={{
              marginTop: 32,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 24,
              fontSize: 17,
              color: '#333',
              fontWeight: 500,
              textAlign: 'center',
              background: 'rgba(245,247,250,0.85)',
              borderRadius: 16,
              padding: '12px 18px',
              boxShadow: '0 2px 8px rgba(102,126,234,0.07)'
            }}>
              <div><span style={{ color: '#667eea', fontWeight: 700 }}>Name:</span> {studentInfo.name}</div>
              <div style={{ borderLeft: '1.5px solid #e0e0e0', height: 24 }}></div>
              <div><span style={{ color: '#667eea', fontWeight: 700 }}>Reg No:</span> {studentInfo.regNo}</div>
              <div style={{ borderLeft: '1.5px solid #e0e0e0', height: 24 }}></div>
              <div><span style={{ color: '#667eea', fontWeight: 700 }}>Dept:</span> {studentInfo.department}</div>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes popIn {
            0% { opacity: 0; transform: scale(0.7); }
            60% { opacity: 1; transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  if (studentView === 'waitingForAdmin') {
    return (
      <div style={styles.container}>
        <div style={styles.waitingCard}>
          <ToastContainer />
          <h2>Quiz Suspended</h2>
          <p>{suspensionMessage}</p>
          <button style={styles.button} onClick={handleResumeQuiz} disabled={loading}>
              {loading ? 'Checking...' : 'Check for Approval'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default Student;