import React, { useState, useEffect, useRef } from "react";
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
import { generateQuestions } from "./AI";

const API_BASE = "http://localhost:3001/users";

const calculateSubjectProgress = (subjectData) => {
  const {
    weeklySessions = 0,
    bestScore = 0,
    topicsCompleted = [],
    lastPracticedAt,
  } = subjectData;
  let progress = 0;
  progress += Math.min(weeklySessions * 4, 40);
  progress += (bestScore / 10) * 30;
  progress += Math.min(topicsCompleted.length * 4, 20);
  if (lastPracticedAt) {
    const daysSince =
      (Date.now() - new Date(lastPracticedAt)) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) progress += 10 - Math.min(daysSince, 7);
  }
  return Math.min(Math.round(progress), 100);
};

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

const NavBar = () => {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentView, setCurrentView] = useState("dashboard");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [quizStartTime, setQuizStartTime] = useState(null);

  const scoreRef = useRef(0);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Simplified persistence helpers
  const persistLocalSnapshot = (u) => {
    try {
      localStorage.setItem("gt_user_snapshot", JSON.stringify(u));
    } catch (e) {
      console.warn("Failed to write local snapshot", e);
    }
  };

  const queuePendingPatch = async (id, patch) => {
    try {
      const raw = localStorage.getItem("gt_pending_patches");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ id, patch, ts: new Date().toISOString() });
      localStorage.setItem("gt_pending_patches", JSON.stringify(arr));
    } catch (e) {
      console.warn("Failed to queue pending patch", e);
    }
  };

  const flushPendingPatches = async () => {
    try {
      const raw = localStorage.getItem("gt_pending_patches");
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr) || arr.length === 0) return;

      const toKeep = [];
      for (const item of arr) {
        try {
          const res = await fetch(`${API_BASE}/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.patch),
          });
          if (!res.ok) throw new Error(`PATCH failed ${res.status}`);
          const updated = await res.json();
          setUser((prev) => ({ ...(prev || {}), ...(updated || {}) }));
        } catch (err) {
          toKeep.push(item);
        }
      }
      localStorage.setItem("gt_pending_patches", JSON.stringify(toKeep));
    } catch (e) {
      console.warn("Failed to flush pending patches", e);
    }
  };

  // Unified patch function
  const patchUser = async (patch) => {
    const cur = userRef.current;
    if (!cur || !cur.id) {
      const merged = { ...(cur || {}), ...patch };
      setUser(merged);
      persistLocalSnapshot(merged);
      return merged;
    }

    const optimistic = { ...(cur || {}), ...patch };
    setUser(optimistic);
    persistLocalSnapshot(optimistic);

    try {
      const res = await fetch(`${API_BASE}/${cur.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`PATCH failed ${res.status}`);
      const updated = await res.json();
      const final = { ...(optimistic || {}), ...(updated || {}) };
      setUser(final);
      persistLocalSnapshot(final);
      flushPendingPatches();
      return final;
    } catch (err) {
      console.warn("Network patch failed, queuing patch", err);
      await queuePendingPatch(cur.id, patch);
      return optimistic;
    }
  };

  // Simplified update functions
  const updateUserData = async (updates) => {
    return await patchUser({
      ...updates,
      activity: {
        ...(user?.activity || {}),
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const updateSubject = async (subjectId, partialSubject) => {
    const updatedSubjects = { ...(user?.subjects || {}) };
    updatedSubjects[subjectId] = {
      ...(updatedSubjects[subjectId] || {}),
      ...partialSubject,
    };
    return await updateUserData({ subjects: updatedSubjects });
  };

  const addQuizRecord = async (quizRecord) => {
    const updatedQuizHistory = [...(user?.quizHistory || []), quizRecord];
    const sid = quizRecord.subject || "math";
    const updatedSubjects = { ...(user?.subjects || {}) };
    const subjectData = { ...(updatedSubjects[sid] || {}) };

    subjectData.lastPracticedAt = quizRecord.takenAt;
    subjectData.weeklySessions = (subjectData.weeklySessions || 0) + 1;
    subjectData.bestScore = Math.max(
      subjectData.bestScore || 0,
      quizRecord.score
    );
    subjectData.progress = calculateSubjectProgress(subjectData);

    if (quizRecord.score === quizRecord.total) {
      const currentTopics = subjectData.topicsCompleted || [];
      const template = subjectTemplates[sid];
      if (template?.topics) {
        const availableTopics = template.topics.filter(
          (topic) => !currentTopics.includes(topic)
        );
        if (availableTopics.length > 0) {
          const randomTopic =
            availableTopics[Math.floor(Math.random() * availableTopics.length)];
          subjectData.topicsCompleted = [...currentTopics, randomTopic];
          subjectData.progress = calculateSubjectProgress(subjectData);
        }
      }
    }

    updatedSubjects[sid] = subjectData;
    return await updateUserData({
      quizHistory: updatedQuizHistory,
      subjects: updatedSubjects,
    });
  };

  // Create initial user
  const createInitialUser = async () => {
    const now = new Date().toISOString();
    const initial = {
      username: "guest",
      email: "guest@example.com",
      passwordHash: "guest",
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
      subjects: Object.fromEntries(
        Object.keys(subjectTemplates).map((id) => [
          id,
          {
            progress: 0,
            topicsCompleted: [],
            nextMilestone: subjectTemplates[id].topics[0],
            lastPracticedAt: null,
            weeklySessions: 0,
            bestScore: 0,
          },
        ])
      ),
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
      activity: { createdAt: now, updatedAt: now, lastLogin: now },
    };

    try {
      const res = await fetch(`${API_BASE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initial),
      });
      if (!res.ok) throw new Error("Create initial user failed");
      const created = await res.json();
      setUser(created);
      persistLocalSnapshot(created);
      setLoadingUser(false);
      return created;
    } catch (err) {
      console.warn("Failed to create initial user, using fallback", err);
      setUser(initial);
      persistLocalSnapshot(initial);
      setLoadingUser(false);
      return initial;
    }
  };

  // Load users on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingUser(true);
      try {
        const res = await fetch(`${API_BASE}`);
        if (!res.ok) throw new Error("fetch users failed");
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          setUser(data[0]);
          persistLocalSnapshot(data[0]);
        } else {
          await createInitialUser();
        }
        await flushPendingPatches();
      } catch (err) {
        console.warn("Failed to fetch users, trying local snapshot", err);
        try {
          const raw = localStorage.getItem("gt_user_snapshot");
          const snapshot = raw ? JSON.parse(raw) : null;
          if (snapshot) setUser(snapshot);
          else await createInitialUser();
        } catch (e) {
          console.warn("Failed to parse local snapshot", e);
          await createInitialUser();
        }
      } finally {
        if (mounted) setLoadingUser(false);
      }
    };
    load();
    return () => (mounted = false);
  }, []);

  // Update progress calculation effect
  useEffect(() => {
    if (!user?.subjects) return;
    let needsUpdate = false;
    const updatedSubjects = { ...user.subjects };

    Object.keys(updatedSubjects).forEach((subjectId) => {
      const subjectData = updatedSubjects[subjectId];
      if (
        typeof subjectData.progress === "undefined" ||
        subjectData.progress === 0
      ) {
        const calculatedProgress = calculateSubjectProgress(subjectData);
        if (calculatedProgress > 0) {
          updatedSubjects[subjectId] = {
            ...subjectData,
            progress: calculatedProgress,
          };
          needsUpdate = true;
        }
      }
    });

    if (needsUpdate) patchUser({ subjects: updatedSubjects });
  }, [user?.subjects]);

  // Quiz functions
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
        scoreRef.current = 0;
        setCurrentView("quiz");
      }
    } catch (err) {
      console.error("Error generating quiz:", err);
    } finally {
      setLoadingQuiz(false);
    }
  };

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
      setShowSuccess(true);
      scoreRef.current += 1;

      const updatedProfile = {
        ...(user?.profile || {}),
        totalXP: (user?.profile?.totalXP || 0) + 25,
      };
      const sid = activeSubjectId || current.subject || "math";
      const updatedSubjects = { ...(user?.subjects || {}) };
      updatedSubjects[sid] = {
        ...(updatedSubjects[sid] || {}),
        weeklySessions: (updatedSubjects[sid]?.weeklySessions || 0) + 1,
        lastPracticedAt: new Date().toISOString(),
      };

      setUser((prev) => ({
        ...(prev || {}),
        profile: updatedProfile,
        subjects: updatedSubjects,
      }));

      patchUser({ profile: updatedProfile, subjects: updatedSubjects });
    } else {
      setShowSuccess(false);
    }

    setShowExplanation(true);

    setTimeout(async () => {
      setShowExplanation(false);
      setShowSuccess(false);

      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < quizQuestions.length) {
        setCurrentQuestionIndex(nextIndex);
      } else {
        const durationSeconds = Math.max(
          0,
          Math.floor((Date.now() - (quizStartTime || Date.now())) / 1000)
        );
        const quizRecord = {
          quizId: `quiz-${new Date().toISOString().replace(/[:.]/g, "-")}`,
          subject: activeSubjectId || current.subject || "math",
          score: scoreRef.current,
          total: quizQuestions.length,
          takenAt: new Date().toISOString(),
          durationSeconds,
        };

        await addQuizRecord(quizRecord);
        setCurrentView("dashboard");
        setQuizQuestions([]);
        setCurrentQuestionIndex(0);
        setActiveSubjectId(null);
        setQuizStartTime(null);
        scoreRef.current = 0;
      }
    }, 1200);
  };

  // Progress ring component
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

  // Prepare display data
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
      nextMilestone: userSub.nextMilestone ?? tmpl.topics?.[0] ?? "",
      lastPracticedAt: userSub.lastPracticedAt ?? null,
      weeklySessions: userSub.weeklySessions ?? 0,
      bestScore: userSub.bestScore ?? 0,
    };
  });

  const userStats = {
    totalXP: user?.profile?.totalXP ?? 0,
    badges: user?.profile?.badges ?? 0,
    streakDays: user?.profile?.streakDays ?? 0,
    level: user?.profile?.level ?? 1,
    rank: user?.profile?.rank ?? "Novice",
  };

  // Quiz view
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
                Score: {scoreRef.current}
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
                AI-powered quiz system
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
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

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
              {[
                {
                  icon: UserRoundCheck,
                  text: loadingUser
                    ? "Hello!"
                    : user
                    ? `Hello, ${
                        user.profile?.displayName ?? user.username ?? "Guest"
                      }!`
                    : "No valid user",
                  color: "cyan",
                  href: "#",
                },
                {
                  icon: Gamepad2,
                  text: "Hangman Game",
                  color: "yellow",
                  href: "#hangman",
                },
                {
                  icon: Pilcrow,
                  text: "Typing Game",
                  color: "pink",
                  href: "#typing",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center space-x-2 sm:space-x-3 bg-${item.color}-50 px-3 sm:px-4 py-2 rounded-xl border border-${item.color}-200`}
                >
                  <item.icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-${item.color}-600`}
                  />
                  <a href={item.href}>
                    <span
                      className={`font-semibold text-${item.color}-700 text-sm sm:text-base`}
                    >
                      {item.text}
                    </span>
                  </a>
                </div>
              ))}
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

          {/* Mobile Navigation */}
          <div className="lg:hidden mt-3 sm:mt-4">
            <div className="flex items-center justify-between space-x-2 sm:space-x-4">
              {[
                {
                  icon: UserRoundCheck,
                  text: loadingUser
                    ? "Hello!"
                    : user
                    ? `Hello, ${
                        user.profile?.displayName ?? user.username ?? "Guest"
                      }!`
                    : "No valid user",
                  color: "yellow",
                },
                {
                  icon: Gamepad2,
                  text: "Hangman",
                  color: "pink",
                  href: "#hangman",
                },
                {
                  icon: Pilcrow,
                  text: "Typing",
                  color: "cyan",
                  href: "#typing",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center space-x-2 bg-${item.color}-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-${item.color}-200 flex-1`}
                >
                  <item.icon
                    className={`w-3 h-3 sm:w-4 sm:h-4 text-${item.color}-600`}
                  />
                  {item.href ? (
                    <a href={item.href}>
                      <span
                        className={`font-semibold text-${item.color}-700 text-xs sm:text-sm`}
                      >
                        {item.text}
                      </span>
                    </a>
                  ) : (
                    <span
                      className={`font-semibold text-${item.color}-700 text-xs sm:text-sm`}
                    >
                      {item.text}
                    </span>
                  )}
                </div>
              ))}
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
                {[
                  {
                    icon: Sparkles,
                    value: userStats.totalXP,
                    label: "Total XP",
                    color: "yellow",
                  },
                  {
                    icon: Award,
                    value: userStats.badges,
                    label: "Achievements",
                    color: "pink",
                  },
                  {
                    icon: Target,
                    value: userStats.streakDays,
                    label: "Day Streak",
                    color: "cyan",
                  },
                  {
                    icon: TrendingUp,
                    value: userStats.rank,
                    label: "Current Rank",
                    color: "green",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className={`bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100 rounded-xl p-3 sm:p-4 text-center border border-${stat.color}-200`}
                  >
                    <stat.icon
                      className={`w-5 h-5 sm:w-6 sm:h-6 text-${stat.color}-600 mx-auto mb-2`}
                    />
                    <p className="text-base sm:text-lg font-bold text-gray-800">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-600">{stat.label}</p>
                  </div>
                ))}
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
                        <button
                          onClick={() =>
                            updateSubject(subject.id, {
                              lastPracticedAt: new Date().toISOString(),
                              weeklySessions:
                                (user?.subjects?.[subject.id]?.weeklySessions ||
                                  0) + 1,
                            })
                          }
                          className="flex-1 bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base"
                        >
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
                {(user?.achievements && user.achievements.length > 0
                  ? user.achievements
                  : [
                      {
                        id: "placeholder",
                        name: "No achievements yet",
                        earned: false,
                      },
                    ]
                ).map((achievement, index) => (
                  <div
                    key={index}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center p-2 sm:p-3 border transition-all duration-200 hover:scale-105 ${
                      achievement.earned
                        ? "bg-gradient-to-br from-cyan-50 to-pink-50 border-cyan-200 text-cyan-700"
                        : "bg-gray-50 border-gray-200 text-gray-400"
                    }`}
                  >
                    <Trophy className="w-4 h-4 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                    <p className="text-xs text-center font-semibold mb-1 leading-tight">
                      {achievement.name || achievement.id}
                    </p>
                    <span
                      className={`text-xs px-1 sm:px-2 py-1 rounded-full leading-none ${
                        achievement.earned
                          ? "bg-cyan-100 text-cyan-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {achievement.earned ? "Earned" : "Locked"}
                    </span>
                  </div>
                ))}
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
                  💡 The Feynman Technique: Explain concepts in simple terms to
                  master them
                </p>
              </div>
              <button className="bg-white/20 hover:bg-white/30 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center space-x-2 mx-auto border border-white/20">
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
