import React, { useState, useEffect } from "react";
import logo from "../assets/GyanTapari.png";
import {
  Star,
  Trophy,
  Book,
  Calculator,
  Atom,
  Gamepad2,
  Clock,
  Target,
  Zap,
  Heart,
  Award,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  Gift,
  Brain,
  FlaskConical,
  Users,
  TrendingUp,
  Menu,
  X,
  Pilcrow,
  BrainCircuit,
  UserRoundCheck,
} from "lucide-react";
// IMPORTANT: adjust this import path if your AI.jsx is located elsewhere.
import { generateQuestions } from "./AI";

// This NavBar has been adapted for the "no-login / initial-phase" scenario.
// Behavior summary (implemented in-code):
// - If no user exists on the server, a default user is created automatically.
// - All progress (XP, subject stats, quiz history, achievements) is updated locally
//   and persisted immediately to the json-server (PATCH to /users/:id).
// - The UI derives its display from the single user object, and remains functional
//   if the server is unreachable (falls back to local state).

const NavBar = () => {
  // single user object (null while loading)
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // used to persist small partial updates to the user on the server
  const saveUserPartial = async (patch) => {
    if (!user || !user.id) return;
    try {
      const res = await fetch(`http://localhost:3001/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`PATCH failed ${res.status}`);
      const updated = await res.json();
      // merge updated fields into local user state
      setUser((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      console.error("Failed to save user partial:", err);
    }
  };

  // create a sensible default user when none exists (neglecting signup/login)
  const createInitialUser = async () => {
    const now = new Date().toISOString();
    const initial = {
      username: "guest",
      email: "guest@example.com",
      passwordHash: "guest", // placeholder — for demo only
      profile: {
        displayName: "Guest",
        avatar: "/avatars/guest.png",
        level: 1,
        rank: "Novice",
        streakDays: 0,
        totalXP: 0,
        badges: 0,
        bio: "",
      },
      subjects: {
        math: {
          progress: 0,
          topicsCompleted: [],
          nextMilestone: "Quadratic Equations",
          lastPracticedAt: null,
          weeklySessions: 0,
          bestScore: 0,
        },
        science: {
          progress: 0,
          topicsCompleted: [],
          nextMilestone: "Chemical Reactions",
          lastPracticedAt: null,
          weeklySessions: 0,
          bestScore: 0,
        },
        english: {
          progress: 0,
          topicsCompleted: [],
          nextMilestone: "Essay Writing",
          lastPracticedAt: null,
          weeklySessions: 0,
          bestScore: 0,
        },
        history: {
          progress: 0,
          topicsCompleted: [],
          nextMilestone: "World Wars",
          lastPracticedAt: null,
          weeklySessions: 0,
          bestScore: 0,
        },
      },
      achievements: [],
      quizHistory: [],
      settings: {
        dailyReminder: true,
        dailyReminderTime: "18:30",
        language: "ne",
        notifications: { email: false, push: true, sms: false },
        theme: "system",
      },
      preferences: {
        preferredStudyDurationMins: 30,
        preferredStudyDays: ["mon", "wed", "fri"],
        showHints: true,
      },
      activity: {
        createdAt: now,
        updatedAt: now,
        lastLogin: now,
      },
    };

    try {
      const res = await fetch("http://localhost:3001/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initial),
      });
      const created = await res.json();
      setUser(created);
      setLoadingUser(false);
      return created;
    } catch (err) {
      console.error("Failed to create initial user:", err);
      setLoadingUser(false);
      return null;
    }
  };

  // load user(s) on mount. If none exist, create the initial user.
  useEffect(() => {
    let mounted = true;
    setLoadingUser(true);
    fetch("http://localhost:3001/users")
      .then((res) => res.json())
      .then(async (data) => {
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          // pick the first user by default for this "no-login" demo
          setUser(data[0]);
        } else {
          // create default
          await createInitialUser();
        }
      })
      .catch((err) => {
        console.error("Failed to fetch users:", err);
        // keep UI usable with a local fallback initial user
        const fallback = {
          username: "guest",
          profile: {
            displayName: "Guest",
            totalXP: 0,
            badges: 0,
            streakDays: 0,
            level: 1,
            rank: "Novice",
          },
          subjects: {},
          achievements: [],
          quizHistory: [],
        };
        setUser(fallback);
      })
      .finally(() => {
        if (mounted) setLoadingUser(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // local UI-only stats (kept in sync with user.profile when available)
  const [userStats, setUserStats] = useState({
    totalXP: 0,
    badges: 0,
    streakDays: 0,
    level: 1,
    rank: "Novice",
  });

  useEffect(() => {
    if (!user) return;
    setUserStats({
      totalXP: user.profile?.totalXP ?? 0,
      badges: user.profile?.badges ?? 0,
      streakDays: user.profile?.streakDays ?? 0,
      level: user.profile?.level ?? 1,
      rank: user.profile?.rank ?? "Novice",
    });
  }, [user]);

  const [currentView, setCurrentView] = useState("dashboard");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // track which subject the active quiz belongs to (so we can update subject stats)
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [quizStartTime, setQuizStartTime] = useState(null);

  // templates for rendering subjects with icons/colors
  const subjectTemplates = {
    math: {
      id: "math",
      name: "Mathematics",
      icon: Calculator,
      color: "from-cyan-500 to-cyan-600",
      topics: ["Algebra", "Geometry", "Statistics"],
    },
    science: {
      id: "science",
      name: "Science",
      icon: FlaskConical,
      color: "from-green-500 to-green-600",
      topics: ["Physics", "Chemistry", "Biology"],
    },
    english: {
      id: "english",
      name: "English",
      icon: Book,
      color: "from-pink-500 to-pink-600",
      topics: ["Literature", "Grammar", "Writing"],
    },
    history: {
      id: "history",
      name: "Social Studies",
      icon: Users,
      color: "from-orange-500 to-orange-600",
      topics: ["World History", "Geography", "Civics"],
    },
  };

  // build subjectsDisplay from templates and user's saved data
  const subjectsDisplay = Object.keys(subjectTemplates).map((id) => {
    const tmpl = subjectTemplates[id];
    const userSub = user?.subjects?.[id] ?? {};
    return {
      id,
      name: tmpl.name,
      icon: tmpl.icon,
      color: tmpl.color,
      progress: userSub.progress ?? 0,
      topics: tmpl.topics,
      nextMilestone: userSub.nextMilestone ?? tmpl.nextMilestone ?? "",
      lastPracticedAt: userSub.lastPracticedAt ?? null,
      weeklySessions: userSub.weeklySessions ?? 0,
      bestScore: userSub.bestScore ?? 0,
    };
  });

  // study tips (kept in component so user preferences could later toggle)
  const studyTips = [
    "💡 The Feynman Technique: Explain concepts in simple terms to master them",
    "🧠 Spaced repetition helps move information from short-term to long-term memory",
    "📊 Active recall is more effective than passive reading - test yourself!",
    "🎯 Break large topics into smaller chunks for better understanding",
    "⚡ Take breaks every 25-50 minutes to maintain focus and retention",
  ];
  const [currentTip, setCurrentTip] = useState(0);
  // achievements UI merge
  const achievementTemplates = {
    math_prodigy: {
      id: "math_prodigy",
      name: "Math Prodigy",
      icon: Calculator,
      difficulty: "Expert",
    },
    speed_demon: {
      id: "speed_demon",
      name: "Speed Demon",
      icon: Zap,
      difficulty: "Master",
    },
    science_explorer: {
      id: "science_explorer",
      name: "Science Explorer",
      icon: Atom,
      difficulty: "Advanced",
    },
    word_smith: {
      id: "word_smith",
      name: "Word Smith",
      icon: Book,
      difficulty: "Expert",
    },
    quiz_master: {
      id: "quiz_master",
      name: "Quiz Master",
      icon: Trophy,
      difficulty: "Legendary",
    },
    study_streak: {
      id: "study_streak",
      name: "Study Streak",
      icon: Target,
      difficulty: "Advanced",
    },
  };

  const achievementsDisplay = (user?.achievements ?? []).map((ach) => {
    const tpl = achievementTemplates[ach.id] ?? {
      id: ach.id,
      name: ach.name || ach.id,
      icon: Trophy,
      difficulty: "Unknown",
    };
    return {
      id: ach.id,
      name: tpl.name,
      icon: tpl.icon,
      earned: !!ach.earned,
      difficulty: tpl.difficulty,
      earnedAt: ach.earnedAt ?? null,
    };
  });

  const achievementsFallback = Object.values(achievementTemplates).map((t) => ({
    ...t,
    earned: false,
    earnedAt: null,
  }));

  const startQuiz = async (subject) => {
    setLoadingQuiz(true);
    setMobileMenuOpen(false);
    setActiveSubjectId(subject.id);
    setQuizStartTime(Date.now());

    try {
      const generated = await generateQuestions(subject.name, 10);

      if (Array.isArray(generated) && generated.length > 0) {
        setQuizQuestions(generated);
        setCurrentQuestionIndex(0);
        setScore(0);
        setCurrentView("quiz");
      } else {
        console.warn("No questions generated, falling back to local sample.");
      }
    } catch (err) {
      console.error("Error generating quiz:", err);
    } finally {
      setLoadingQuiz(false);
    }
  };

  // called whenever the user answers a question
  const handleAnswer = async (answerIndex) => {
    const current = quizQuestions[currentQuestionIndex];
    if (!current) return;

    const isCorrect = (() => {
      if (typeof current.correct === "number")
        return answerIndex === current.correct;
      if (typeof current.correct === "string")
        return current.options[answerIndex] === current.correct;
      return false;
    })();

    if (isCorrect) {
      setScore((s) => s + 1);
      setShowSuccess(true);

      // update local UI stats immediately
      setUserStats((prev) => ({ ...prev, totalXP: prev.totalXP + 25 }));

      // persist XP and simple subject progress increment to the server
      if (user && user.id) {
        const now = new Date().toISOString();
        const updatedProfile = { ...(user.profile || {}) };
        updatedProfile.totalXP = (updatedProfile.totalXP || 0) + 25;

        // update subject stats (weeklySessions and lastPracticedAt)
        const updatedSubjects = { ...(user.subjects || {}) };
        const sid = activeSubjectId || current.subject || "math";
        updatedSubjects[sid] = { ...(updatedSubjects[sid] || {}) };
        updatedSubjects[sid].weeklySessions =
          (updatedSubjects[sid].weeklySessions || 0) + 1;
        updatedSubjects[sid].lastPracticedAt = now;

        // patch server (profile + subjects)
        const patch = {
          profile: updatedProfile,
          subjects: updatedSubjects,
          activity: { ...(user.activity || {}), updatedAt: now },
        };
        // optimistically update local user
        setUser((prev) => ({
          ...prev,
          profile: updatedProfile,
          subjects: updatedSubjects,
          activity: { ...(prev?.activity || {}), updatedAt: now },
        }));
        saveUserPartial(patch);
      }
    } else {
      setShowSuccess(false);
    }

    setShowExplanation(true);

    // after a short delay, advance or finish
    setTimeout(async () => {
      setShowExplanation(false);
      setShowSuccess(false);

      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < quizQuestions.length) {
        setCurrentQuestionIndex(nextIndex);
      } else {
        // quiz finished: record history, update bestScore and return to dashboard
        const durationSeconds = Math.max(
          0,
          Math.floor((Date.now() - (quizStartTime || Date.now())) / 1000)
        );
        const quizRecord = {
          quizId: `quiz-${new Date().toISOString().replace(/[:.]/g, "-")}`,
          subject: activeSubjectId || current.subject || "math",
          score: score,
          total: quizQuestions.length,
          takenAt: new Date().toISOString(),
          durationSeconds,
        };

        // update local user object and persist
        if (user && user.id) {
          const now = new Date().toISOString();
          const updatedSubjects = { ...(user.subjects || {}) };
          const sid = activeSubjectId || current.subject || "math";
          updatedSubjects[sid] = { ...(updatedSubjects[sid] || {}) };
          updatedSubjects[sid].lastPracticedAt = now;
          updatedSubjects[sid].weeklySessions =
            (updatedSubjects[sid].weeklySessions || 0) + 0; // already incremented per-answer
          updatedSubjects[sid].bestScore = Math.max(
            updatedSubjects[sid].bestScore || 0,
            score
          );

          const updatedQuizHistory = [...(user.quizHistory || []), quizRecord];

          // update profile XP already incremented per-correct answer; ensure updatedAt
          const updatedProfile = {
            ...(user.profile || {}),
            totalXP: user.profile?.totalXP ?? userStats.totalXP,
          };

          // optimistic local update
          setUser((prev) => ({
            ...prev,
            subjects: updatedSubjects,
            quizHistory: updatedQuizHistory,
            profile: updatedProfile,
            activity: { ...(prev?.activity || {}), updatedAt: now },
          }));

          // persist all important fields
          const patch = {
            subjects: updatedSubjects,
            quizHistory: updatedQuizHistory,
            profile: updatedProfile,
            activity: { ...(user.activity || {}), updatedAt: now },
          };
          await saveUserPartial(patch);
        }

        // reset quiz state and return to dashboard
        setCurrentView("dashboard");
        setQuizQuestions([]);
        setCurrentQuestionIndex(0);
        setActiveSubjectId(null);
        setQuizStartTime(null);
        setScore(0);
      }
    }, 1200);
  };

  const ProgressRing = ({ progress, size = 70 }) => {
    const radius = (size - 8) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${
      (progress / 100) * circumference
    } ${circumference}`;

    return (
      <div
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth="6"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-700">{progress}%</span>
        </div>
      </div>
    );
  };

  // QUIZ VIEW
  if (currentView === "quiz" && quizQuestions.length > 0) {
    const q = quizQuestions[currentQuestionIndex];

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-cyan-50 p-2 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-gray-200">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
                Challenge Mode
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Question {currentQuestionIndex + 1} of {quizQuestions.length} —
                Score: {score}
              </p>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border-l-4 border-blue-500">
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800 leading-relaxed">
                {q.question}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {q.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={showExplanation}
                  className="p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-left font-medium transform hover:scale-[1.02] hover:shadow-md text-sm sm:text-base disabled:opacity-60"
                >
                  <span className="inline-block w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-pink-500 to-cyan-500 text-white rounded-lg text-center leading-6 sm:leading-8 mr-3 sm:mr-4 text-xs sm:text-sm font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              ))}
            </div>

            {showExplanation && (
              <div
                className={`text-center p-3 sm:p-4 rounded-xl mb-4 ${
                  showSuccess
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {showSuccess ? (
                  <>
                    <p className="text-base sm:text-lg font-bold text-green-700 mb-2">
                      🎉 Correct!
                    </p>
                    {q.explanation && (
                      <p className="text-xs sm:text-sm text-green-600 mb-2">
                        {q.explanation}
                      </p>
                    )}
                    <p className="text-xs sm:text-sm font-semibold text-green-700">
                      +25 XP earned!
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base sm:text-lg font-bold text-red-700 mb-2">
                      ❌ Not quite.
                    </p>
                    {q.explanation && (
                      <p className="text-xs sm:text-sm text-red-600 mb-2">
                        {q.explanation}
                      </p>
                    )}
                    <p className="text-xs sm:text-sm font-semibold text-red-700">
                      Keep trying!
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setCurrentView("dashboard");
                  setQuizQuestions([]);
                }}
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              >
                Exit Quiz
              </button>

              <div className="text-sm text-gray-500">
                If the AI returns invalid data the quiz will gracefully exit.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD view (renders from derived user state)
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200 ">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center shadow-lg">
                <img
                  className="rounded-[5vw]"
                  src={logo}
                  alt="gyantaparilogo"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-3xl font-bold truncate">
                  <span className="bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
                    ज्ञान
                  </span>
                  <span className="mx-1 sm:mx-2 text-yellow-500 text-sm sm:text-base lg:text-xl">
                    {" "}
                    ✦{" "}
                  </span>
                  <span className="bg-gradient-to-r from-cyan-600 to-cyan-500 bg-clip-text text-transparent">
                    टपरी
                  </span>
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium truncate">
                  GAMIFYING EDUCATION
                </p>
              </div>
            </div>

            {/* Desktop Stats */}
            <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
              <div className="flex items-center space-x-2 sm:space-x-3 bg-cyan-50 px-3 sm:px-4 py-2 rounded-xl border border-cyan-200">
                <UserRoundCheck className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />
                <a href="#">
                  <span className="font-semibold text-cyan-700 text-sm sm:text-base">
                    {loadingUser
                      ? "Hello!"
                      : user
                      ? `Hello, ${
                          user.profile?.displayName ?? user.username ?? "Guest"
                        }!`
                      : "No valid user"}
                  </span>
                </a>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 bg-yellow-50 px-3 sm:px-4 py-2 rounded-xl border border-yellow-200">
                <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                <a href="#hangman">
                  <span className="font-semibold text-yellow-700 text-sm sm:text-base">
                    Hangman Game
                  </span>
                </a>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 bg-pink-50 px-3 sm:px-4 py-2 rounded-xl border border-pink-200">
                <Pilcrow className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
                <a href="#typing">
                  <span className="font-semibold text-pink-700 text-sm sm:text-base">
                    Typing Game
                  </span>
                </a>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Mobile Stats */}
          <div className="lg:hidden mt-3 sm:mt-4">
            <div className="flex items-center justify-between space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2 bg-yellow-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-yellow-200 flex-1">
                <UserRoundCheck className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                <span className="font-semibold text-yellow-700 text-xs sm:text-sm">
                  {loadingUser
                    ? "Hello!"
                    : user
                    ? `Hello, ${
                        user.profile?.displayName ?? user.username ?? "Guest"
                      }!`
                    : "No valid user"}
                </span>
              </div>
              <div className="flex items-center space-x-2 bg-pink-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-pink-200 flex-1">
                <Gamepad2 className="w-3 h-3 sm:w-4 sm:h-4 text-pink-600" />
                <a href="#hangman">
                  <span className="font-semibold text-pink-700 text-xs sm:text-sm">
                    Hangman
                  </span>
                </a>
              </div>
              <div className="flex items-center space-x-2 bg-cyan-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-cyan-200 flex-1">
                <Pilcrow className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-600" />
                <a href="#typing">
                  <span className="font-semibold text-cyan-700 text-xs sm:text-sm">
                    Typing
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Welcome Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                    Welcome back! Ready to level up? 🚀
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Continue your learning journey and unlock new achievements
                  </p>
                </div>
                <div className="flex items-center sm:flex-col sm:items-end space-x-4 sm:space-x-0 sm:space-y-1">
                  <div className="flex items-center space-x-2 text-orange-600">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-bold text-sm sm:text-base">
                      Level {userStats.level}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Next: Level {userStats.level + 1}
                  </p>
                  <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2 mt-1 sm:mt-2">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full"
                      style={{ width: "68%" }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-3 sm:p-4 text-center border border-yellow-200">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-base sm:text-lg font-bold text-gray-800">
                    {userStats.totalXP}
                  </p>
                  <p className="text-xs text-gray-600">Total XP</p>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-3 sm:p-4 text-center border border-pink-200">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 mx-auto mb-2" />
                  <p className="text-base sm:text-lg font-bold text-gray-800">
                    {userStats.badges}
                  </p>
                  <p className="text-xs text-gray-600">Achievements</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-3 sm:p-4 text-center border border-cyan-200">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600 mx-auto mb-2" />
                  <p className="text-base sm:text-lg font-bold text-gray-800">
                    {userStats.streakDays}
                  </p>
                  <p className="text-xs text-gray-600">Day Streak</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 sm:p-4 text-center border border-green-200">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-base sm:text-lg font-bold text-gray-800">
                    {userStats.rank}
                  </p>
                  <p className="text-xs sm:text-gray-600">Current Rank</p>
                </div>
              </div>
            </div>

            {/* Subjects Grid */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                <Book className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-pink-600" />
                Your Subjects
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {subjectsDisplay.map((subject) => {
                  const IconComponent = subject.icon;
                  return (
                    <div
                      key={subject.id}
                      className="group bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${subject.color} rounded-lg flex items-center justify-center shadow-md flex-shrink-0`}
                          >
                            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-base sm:text-lg font-bold text-gray-800 truncate">
                              {subject.name}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">
                              Next: {subject.nextMilestone}
                            </p>
                          </div>
                        </div>
                        <div className="ml-3">
                          <ProgressRing
                            progress={subject.progress ?? 0}
                            size={50}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {subject.topics.slice(0, 3).map((topic, index) => (
                            <span
                              key={index}
                              className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                        <button
                          onClick={() => startQuiz(subject)}
                          className={`flex-1 bg-gradient-to-r ${subject.color} text-white px-3 sm:px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md text-sm sm:text-base`}
                        >
                          <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>
                            {loadingQuiz && activeSubjectId === subject.id
                              ? "Preparing..."
                              : "Practice"}
                          </span>
                        </button>
                        <button className="flex-1 bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base">
                          <Book className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Study</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Weekly Goal */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-cyan-600" />
                Weekly Goal
              </h3>
              <div className="bg-gradient-to-r from-cyan-50 to-pink-50 rounded-xl p-3 sm:p-4 mb-4 border border-cyan-200">
                <p className="text-gray-800 font-semibold mb-3 text-sm sm:text-base">
                  Complete 20 practice sessions
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-2">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-pink-500 h-2 sm:h-3 rounded-full transition-all duration-1000"
                    style={{ width: "65%" }}
                  ></div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">
                  13 of 20 completed
                </p>
              </div>
              <p className="text-xs sm:text-sm text-gray-600">
                Reward: 200 XP + Achievement Badge
              </p>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-pink-600" />
                Achievements
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {(achievementsDisplay.length > 0
                  ? achievementsDisplay
                  : achievementsFallback
                ).map((achievement, index) => {
                  const IconComponent = achievement.icon;
                  return (
                    <div
                      key={index}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center p-2 sm:p-3 border transition-all duration-200 hover:scale-105 ${
                        achievement.earned
                          ? "bg-gradient-to-br from-cyan-50 to-pink-50 border-cyan-200 text-cyan-700"
                          : "bg-gray-50 border-gray-200 text-gray-400"
                      }`}
                    >
                      <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                      <p className="text-xs text-center font-semibold mb-1 leading-tight">
                        {achievement.name}
                      </p>
                      <span
                        className={`text-xs px-1 sm:px-2 py-1 rounded-full leading-none ${
                          achievement.earned
                            ? "bg-cyan-100 text-cyan-600"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {achievement.difficulty}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Study Tips */}
            <div className="bg-gradient-to-br from-pink-500 to-cyan-500 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
              <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Study Smart Tips
              </h3>
              <div className="bg-white/20 rounded-xl p-3 sm:p-4 mb-4 backdrop-blur-sm border border-white/20">
                <p className="text-white text-xs sm:text-sm leading-relaxed">
                  {studyTips[currentTip]}
                </p>
              </div>
              <button
                onClick={() =>
                  setCurrentTip((currentTip + 1) % studyTips.length)
                }
                className="bg-white/20 hover:bg-white/30 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center space-x-2 mx-auto border border-white/20"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Next Tip</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;
