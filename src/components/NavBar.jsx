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
} from "lucide-react";

const NavBar = () => {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [userStats, setUserStats] = useState({
    totalXP: 2847,
    badges: 12,
    streakDays: 15,
    level: 7,
    rank: "Scholar",
  });
  const [currentView, setCurrentView] = useState("dashboard");
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const subjects = [
    {
      id: "math",
      name: "Mathematics",
      icon: Calculator,
      color: "from-cyan-500 to-cyan-600",
      progress: 78,
      topics: ["Algebra", "Geometry", "Statistics"],
      nextMilestone: "Quadratic Equations",
    },
    {
      id: "science",
      name: "Science",
      icon: FlaskConical,
      color: "from-green-500 to-green-600",
      progress: 65,
      topics: ["Physics", "Chemistry", "Biology"],
      nextMilestone: "Chemical Reactions",
    },
    {
      id: "english",
      name: "English",
      icon: Book,
      color: "from-pink-500 to-pink-600",
      progress: 82,
      topics: ["Literature", "Grammar", "Writing"],
      nextMilestone: "Essay Writing",
    },
    {
      id: "history",
      name: "Social Studies",
      icon: Users,
      color: "from-orange-500 to-orange-600",
      progress: 45,
      topics: ["World History", "Geography", "Civics"],
      nextMilestone: "World Wars",
    },
  ];

  const achievements = [
    {
      name: "Math Prodigy",
      icon: Calculator,
      earned: true,
      difficulty: "Expert",
    },
    {
      name: "Science Explorer",
      icon: Atom,
      earned: true,
      difficulty: "Advanced",
    },
    { name: "Word Smith", icon: Book, earned: true, difficulty: "Expert" },
    { name: "Speed Demon", icon: Zap, earned: false, difficulty: "Master" },
    {
      name: "Quiz Master",
      icon: Trophy,
      earned: false,
      difficulty: "Legendary",
    },
    {
      name: "Study Streak",
      icon: Target,
      earned: true,
      difficulty: "Advanced",
    },
  ];

  const sampleQuestions = [
    {
      question: "If 3x + 7 = 22, what is the value of x?",
      options: ["x = 3", "x = 5", "x = 7", "x = 15"],
      correct: 1,
      subject: "math",
      explanation:
        "Subtract 7 from both sides: 3x = 15, then divide by 3: x = 5",
    },
    {
      question: "What is the powerhouse of the cell?",
      options: ["Nucleus", "Mitochondria", "Ribosome", "Cytoplasm"],
      correct: 1,
      subject: "science",
      explanation: "Mitochondria produce ATP, the energy currency of cells",
    },
  ];

  const studyTips = [
    "💡 The Feynman Technique: Explain concepts in simple terms to master them",
    "🧠 Spaced repetition helps move information from short-term to long-term memory",
    "📊 Active recall is more effective than passive reading - test yourself!",
    "🎯 Break large topics into smaller chunks for better understanding",
    "⚡ Take breaks every 25-50 minutes to maintain focus and retention",
  ];

  const [currentTip, setCurrentTip] = useState(0);

  const startQuiz = (subject) => {
    const subjectQuestions = sampleQuestions.filter(
      (q) => q.subject === subject.id
    );
    if (subjectQuestions.length > 0) {
      setQuizQuestion(subjectQuestions[0]);
      setCurrentView("quiz");
      setScore(0);
      setMobileMenuOpen(false);
    }
  };

  const handleAnswer = (answerIndex) => {
    if (answerIndex === quizQuestion.correct) {
      setScore(score + 1);
      setShowSuccess(true);
      setUserStats((prev) => ({ ...prev, totalXP: prev.totalXP + 25 }));

      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    }

    setTimeout(() => {
      setCurrentView("dashboard");
      setQuizQuestion(null);
    }, 3000);
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

  if (currentView === "quiz" && quizQuestion) {
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
                Think carefully and choose your answer
              </p>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border-l-4 border-blue-500">
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800 leading-relaxed">
                {quizQuestion.question}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {quizQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  className="p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-left font-medium transform hover:scale-[1.02] hover:shadow-md text-sm sm:text-base"
                >
                  <span className="inline-block w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-pink-500 to-cyan-500 text-white rounded-lg text-center leading-6 sm:leading-8 mr-3 sm:mr-4 text-xs sm:text-sm font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              ))}
            </div>

            {showSuccess && (
              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-xl border border-green-200 mb-4">
                <p className="text-base sm:text-lg font-bold text-green-700 mb-2">
                  🎉 Excellent! You got it right!
                </p>
                <p className="text-xs sm:text-sm text-green-600 mb-2">
                  {quizQuestion.explanation}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-green-700">
                  +25 XP earned!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
                    ✦
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
              <div className="flex items-center space-x-2 sm:space-x-3 bg-yellow-50 px-3 sm:px-4 py-2 rounded-xl border border-yellow-200">
                <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                <a href="#ganesh">
                  {" "}
                  <span className="font-semibold text-yellow-700 text-sm sm:text-base">
                    Hangman Game
                  </span>
                </a>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 bg-pink-50 px-3 sm:px-4 py-2 rounded-xl border border-pink-200">
                <Pilcrow className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
                <a href="#another">
                  <span className="font-semibold text-pink-700 text-sm sm:text-base">
                    Typing Game
                  </span>
                </a>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 bg-cyan-50 px-3 sm:px-4 py-2 rounded-xl border border-cyan-200">
                <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />
                <a href="#">
                  <span className="font-semibold text-cyan-700 text-sm sm:text-base">
                    Track with AI
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
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                <span className="font-semibold text-yellow-700 text-xs sm:text-sm">
                  {userStats.totalXP} XP
                </span>
              </div>
              <div className="flex items-center space-x-2 bg-pink-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-pink-200 flex-1">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-pink-600" />
                <span className="font-semibold text-pink-700 text-xs sm:text-sm">
                  {userStats.rank}
                </span>
              </div>
              <div className="flex items-center space-x-2 bg-cyan-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-cyan-200 flex-1">
                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-600" />
                <span className="font-semibold text-cyan-700 text-xs sm:text-sm">
                  {userStats.streakDays} days
                </span>
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
                  <p className="text-xs text-gray-600">Current Rank</p>
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
                {subjects.map((subject) => {
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
                          <ProgressRing progress={subject.progress} size={50} />
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
                          <span>Practice</span>
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
                {achievements.map((achievement, index) => {
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

            {/* Leaderboard Preview */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-yellow-600" />
                Top Performers
              </h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                      1
                    </span>
                    <span className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                      Sarah M.
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
                    3,240 XP
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-400 text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                      2
                    </span>
                    <span className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                      Alex K.
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
                    2,980 XP
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 sm:p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-400 text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                      3
                    </span>
                    <span className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                      You!
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
                    2,847 XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;
