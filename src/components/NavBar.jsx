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

// Enhanced progress calculation with more granular scoring
const calculateSubjectProgress = (subjectData) => {
  const {
    weeklySessions = 0,
    bestScore = 0,
    topicsCompleted = [],
    lastPracticedAt,
    totalQuizzes = 0,
    averageScore = 0,
  } = subjectData;

  let progress = 0;

  // Weekly sessions contribution (max 35 points)
  progress += Math.min(weeklySessions * 3, 35);

  // Best score contribution (max 25 points)
  progress += (bestScore / 10) * 25;

  // Average score contribution (max 20 points)
  progress += (averageScore / 10) * 20;

  // Topics completed contribution (max 15 points)
  progress += Math.min(topicsCompleted.length * 5, 15);

  // Recency bonus (max 5 points)
  if (lastPracticedAt) {
    const daysSinceLastPractice =
      (Date.now() - new Date(lastPracticedAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPractice < 7) {
      progress += Math.max(0, 5 - daysSinceLastPractice);
    }
  }

  return Math.min(Math.round(progress), 100);
};

// Calculate weekly goal progress
const calculateWeeklyProgress = (quizHistory = []) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const weeklyQuizzes = quizHistory.filter(
    (quiz) => new Date(quiz.takenAt) > oneWeekAgo
  );

  return {
    completed: weeklyQuizzes.length,
    total: 20,
    percentage: Math.min((weeklyQuizzes.length / 20) * 100, 100),
  };
};

// Calculate user level based on total XP
const calculateUserLevel = (totalXP) => {
  const level = Math.floor(totalXP / 1000) + 1;
  const currentLevelXP = (level - 1) * 1000;
  const nextLevelXP = level * 1000;
  const progressToNextLevel =
    ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  return {
    level,
    progressToNextLevel: Math.min(progressToNextLevel, 100),
    currentLevelXP,
    nextLevelXP,
    xpToNextLevel: nextLevelXP - totalXP,
  };
};

// Determine user rank based on level and achievements
const calculateUserRank = (level, achievementsCount) => {
  if (level >= 20 && achievementsCount >= 15) return "Master";
  if (level >= 15 && achievementsCount >= 10) return "Expert";
  if (level >= 10 && achievementsCount >= 8) return "Scholar";
  if (level >= 5 && achievementsCount >= 5) return "Apprentice";
  return "Novice";
};

const NavBar = () => {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState({
    completed: 0,
    total: 20,
    percentage: 0,
  });

  // Refs for values updated rapidly inside handlers (to avoid stale closures)
  const scoreRef = useRef(0);
  const userRef = useRef(null);

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // --- Persistence helpers ---
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
      subjects: {
        math: {
          progress: 0,
          topicsCompleted: [],
          nextMilestone: "Quadratic Equations",
          lastPracticedAt: null,
          weeklySessions: 0,
          bestScore: 0,
          totalQuizzes: 0,
          averageScore: 0,
        },
        science: {
          progress: 0,
          topicsCompleted: [],
          nextMilestone: "Chemical Reactions",
          lastPracticedAt: null,
          weeklySessions: 0,
          bestScore: 0,
          totalQuizzes: 0,
          averageScore: 0,
        },
        english: {
          progress: 0,
          topicsCompleted: [],
          nextMilestone: "Essay Writing",
          lastPracticedAt: null,
          weeklySessions: 0,
          bestScore: 0,
          totalQuizzes: 0,
          averageScore: 0,
        },
        history: {
          progress: 0,
          topicsCompleted: [],
          nextMilestone: "World Wars",
          lastPracticedAt: null,
          weeklySessions: 0,
          bestScore: 0,
          totalQuizzes: 0,
          averageScore: 0,
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
      console.warn(
        "Failed to create initial user, using fallback local user",
        err
      );
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

  // Update weekly goal progress whenever user changes
  useEffect(() => {
    if (user && user.quizHistory) {
      const weeklyProgress = calculateWeeklyProgress(user.quizHistory);
      setWeeklyGoal(weeklyProgress);
    }
  }, [user]);

  // --- Enhanced update helpers ---
  const updateProfile = async (partialProfile) => {
    const merged = { ...(user?.profile || {}), ...partialProfile };
    return await patchUser({
      profile: merged,
      activity: {
        ...(user?.activity || {}),
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const updateSettings = async (partialSettings) => {
    const merged = { ...(user?.settings || {}), ...partialSettings };
    return await patchUser({
      settings: merged,
      activity: {
        ...(user?.activity || {}),
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const updatePreferences = async (partialPreferences) => {
    const merged = { ...(user?.preferences || {}), ...partialPreferences };
    return await patchUser({
      preferences: merged,
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

    // Recalculate progress
    updatedSubjects[subjectId].progress = calculateSubjectProgress(
      updatedSubjects[subjectId]
    );

    return await patchUser({
      subjects: updatedSubjects,
      activity: {
        ...(user?.activity || {}),
        updatedAt: new Date().toISOString(),
      },
    });
  };

  // Enhanced achievement system
  const checkAndAwardAchievements = async (quizRecord, updatedUser) => {
    const newAchievements = [];
    const currentAchievements = updatedUser.achievements || [];

    // Helper to check if achievement already exists
    const hasAchievement = (achievementId) =>
      currentAchievements.some((a) => a.id === achievementId && a.earned);

    // Perfect Score Achievement
    if (
      quizRecord.score === quizRecord.total &&
      !hasAchievement("perfect_score")
    ) {
      newAchievements.push({
        id: "perfect_score",
        name: "Perfect Score",
        description: "Got 100% on a quiz!",
        earned: true,
        earnedAt: new Date().toISOString(),
        xpReward: 100,
      });
    }

    // Quiz Master - 10 perfect scores
    const perfectScores = (updatedUser.quizHistory || []).filter(
      (q) => q.score === q.total
    ).length;
    if (perfectScores >= 10 && !hasAchievement("quiz_master")) {
      newAchievements.push({
        id: "quiz_master",
        name: "Quiz Master",
        description: "Achieved 10 perfect scores!",
        earned: true,
        earnedAt: new Date().toISOString(),
        xpReward: 500,
      });
    }

    // Speed Demon - Complete quiz in under 60 seconds
    if (quizRecord.durationSeconds < 60 && !hasAchievement("speed_demon")) {
      newAchievements.push({
        id: "speed_demon",
        name: "Speed Demon",
        description: "Completed a quiz in under 60 seconds!",
        earned: true,
        earnedAt: new Date().toISOString(),
        xpReward: 200,
      });
    }

    // Scholar - Reach level 10
    const userLevel = calculateUserLevel(updatedUser.profile?.totalXP || 0);
    if (userLevel.level >= 10 && !hasAchievement("scholar")) {
      newAchievements.push({
        id: "scholar",
        name: "Scholar",
        description: "Reached level 10!",
        earned: true,
        earnedAt: new Date().toISOString(),
        xpReward: 300,
      });
    }

    // Weekly Warrior - Complete 20 quizzes in a week
    const weeklyProgress = calculateWeeklyProgress(
      updatedUser.quizHistory || []
    );
    if (weeklyProgress.completed >= 20 && !hasAchievement("weekly_warrior")) {
      newAchievements.push({
        id: "weekly_warrior",
        name: "Weekly Warrior",
        description: "Completed 20 quizzes in one week!",
        earned: true,
        earnedAt: new Date().toISOString(),
        xpReward: 400,
      });
    }

    // Subject Specialist - Complete 50 quizzes in one subject
    const subjectQuizzes = (updatedUser.quizHistory || []).filter(
      (q) => q.subject === quizRecord.subject
    ).length;
    if (
      subjectQuizzes >= 50 &&
      !hasAchievement(`${quizRecord.subject}_specialist`)
    ) {
      newAchievements.push({
        id: `${quizRecord.subject}_specialist`,
        name: `${
          quizRecord.subject.charAt(0).toUpperCase() +
          quizRecord.subject.slice(1)
        } Specialist`,
        description: `Completed 50 ${quizRecord.subject} quizzes!`,
        earned: true,
        earnedAt: new Date().toISOString(),
        xpReward: 350,
      });
    }

    return newAchievements;
  };

  // Enhanced quiz record addition with comprehensive updates
  const addQuizRecord = async (quizRecord) => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    const updatedQuizHistory = [...(currentUser.quizHistory || []), quizRecord];
    const sid = quizRecord.subject || "math";
    const updatedSubjects = { ...(currentUser.subjects || {}) };

    // Initialize subject if it doesn't exist
    if (!updatedSubjects[sid]) {
      updatedSubjects[sid] = {
        progress: 0,
        topicsCompleted: [],
        nextMilestone: "",
        lastPracticedAt: null,
        weeklySessions: 0,
        bestScore: 0,
        totalQuizzes: 0,
        averageScore: 0,
      };
    }

    const subjectData = updatedSubjects[sid];

    // Update subject statistics
    subjectData.lastPracticedAt = quizRecord.takenAt;
    subjectData.weeklySessions = (subjectData.weeklySessions || 0) + 1;
    subjectData.bestScore = Math.max(
      subjectData.bestScore || 0,
      quizRecord.score
    );
    subjectData.totalQuizzes = (subjectData.totalQuizzes || 0) + 1;

    // Calculate new average score
    const totalPoints =
      subjectData.averageScore * (subjectData.totalQuizzes - 1) +
      quizRecord.score;
    subjectData.averageScore = totalPoints / subjectData.totalQuizzes;

    // Add completed topics for high scores
    if (quizRecord.score >= quizRecord.total * 0.8) {
      // 80% or higher
      const subjectTemplate = subjectTemplates[sid];
      if (subjectTemplate && subjectTemplate.topics) {
        const currentTopics = subjectData.topicsCompleted || [];
        const availableTopics = subjectTemplate.topics.filter(
          (topic) => !currentTopics.includes(topic)
        );
        if (availableTopics.length > 0) {
          const randomTopic =
            availableTopics[Math.floor(Math.random() * availableTopics.length)];
          subjectData.topicsCompleted = [...currentTopics, randomTopic];
        }
      }
    }

    // Calculate and update progress
    subjectData.progress = calculateSubjectProgress(subjectData);

    // Calculate XP earned
    const baseXP = quizRecord.score * 25; // 25 XP per correct answer
    const speedBonus = quizRecord.durationSeconds < 120 ? 50 : 0; // Speed bonus
    const perfectBonus = quizRecord.score === quizRecord.total ? 100 : 0; // Perfect score bonus
    const totalXPEarned = baseXP + speedBonus + perfectBonus;

    // Update profile
    const updatedProfile = { ...(currentUser.profile || {}) };
    updatedProfile.totalXP = (updatedProfile.totalXP || 0) + totalXPEarned;

    // Calculate new level and rank
    const levelInfo = calculateUserLevel(updatedProfile.totalXP);
    updatedProfile.level = levelInfo.level;
    updatedProfile.rank = calculateUserRank(
      levelInfo.level,
      updatedProfile.badges || 0
    );

    // Update streak days (simplified - could be enhanced with actual date checking)
    const lastQuiz = updatedQuizHistory[updatedQuizHistory.length - 2]; // Previous quiz
    if (lastQuiz) {
      const daysSinceLastQuiz =
        (new Date(quizRecord.takenAt) - new Date(lastQuiz.takenAt)) /
        (1000 * 60 * 60 * 24);
      if (daysSinceLastQuiz <= 1) {
        updatedProfile.streakDays = (updatedProfile.streakDays || 0) + 1;
      } else if (daysSinceLastQuiz > 2) {
        updatedProfile.streakDays = 1; // Reset streak
      }
    } else {
      updatedProfile.streakDays = 1; // First quiz
    }

    // Temporary user for achievement checking
    const tempUpdatedUser = {
      ...currentUser,
      quizHistory: updatedQuizHistory,
      subjects: updatedSubjects,
      profile: updatedProfile,
    };

    // Check for new achievements
    const newAchievements = await checkAndAwardAchievements(
      quizRecord,
      tempUpdatedUser
    );

    // Update achievements and badges
    let updatedAchievements = [...(currentUser.achievements || [])];
    let additionalXP = 0;

    for (const achievement of newAchievements) {
      updatedAchievements.push(achievement);
      additionalXP += achievement.xpReward || 0;
      updatedProfile.badges = (updatedProfile.badges || 0) + 1;
    }

    // Add achievement XP
    if (additionalXP > 0) {
      updatedProfile.totalXP += additionalXP;
      const newLevelInfo = calculateUserLevel(updatedProfile.totalXP);
      updatedProfile.level = newLevelInfo.level;
      updatedProfile.rank = calculateUserRank(
        newLevelInfo.level,
        updatedProfile.badges
      );
    }

    // Final patch
    return await patchUser({
      quizHistory: updatedQuizHistory,
      subjects: updatedSubjects,
      profile: updatedProfile,
      achievements: updatedAchievements,
      activity: {
        ...(currentUser.activity || {}),
        updatedAt: new Date().toISOString(),
      },
    });
  };

  // Enhanced study click handler
  const handleStudyClick = async (subject) => {
    const currentSubjectData = user?.subjects?.[subject.id] || {};
    const studyXP = 10; // XP for studying

    const updatedData = {
      lastPracticedAt: new Date().toISOString(),
      weeklySessions: (currentSubjectData.weeklySessions || 0) + 1,
    };

    updatedData.progress = calculateSubjectProgress({
      ...currentSubjectData,
      ...updatedData,
    });

    // Update subject
    await updateSubject(subject.id, updatedData);

    // Award study XP
    const updatedProfile = { ...(user?.profile || {}) };
    updatedProfile.totalXP = (updatedProfile.totalXP || 0) + studyXP;

    const levelInfo = calculateUserLevel(updatedProfile.totalXP);
    updatedProfile.level = levelInfo.level;
    updatedProfile.rank = calculateUserRank(
      levelInfo.level,
      updatedProfile.badges || 0
    );

    await updateProfile(updatedProfile);
  };

  // Auto-update progress on user changes
  useEffect(() => {
    if (!user || !user.subjects) return;

    let needsUpdate = false;
    const updatedSubjects = { ...user.subjects };

    Object.keys(updatedSubjects).forEach((subjectId) => {
      const subjectData = updatedSubjects[subjectId];
      const calculatedProgress = calculateSubjectProgress(subjectData);

      if (Math.abs((subjectData.progress || 0) - calculatedProgress) > 1) {
        updatedSubjects[subjectId] = {
          ...subjectData,
          progress: calculatedProgress,
        };
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      patchUser({ subjects: updatedSubjects });
    }
  }, [user?.subjects]);

  const toggleAchievement = async (achId, earned = true) => {
    const current = user?.achievements || [];
    const idx = current.findIndex((a) => a.id === achId);
    let next;
    if (idx >= 0) {
      next = current.map((a) =>
        a.id === achId
          ? { ...a, earned, earnedAt: earned ? new Date().toISOString() : null }
          : a
      );
    } else {
      next = [
        ...current,
        {
          id: achId,
          name: achId,
          earned,
          earnedAt: earned ? new Date().toISOString() : null,
        },
      ];
    }
    return await patchUser({ achievements: next });
  };

  // --- Derived UI helpers ---
  const subjectTemplates = {
    math: {
      id: "math",
      name: "Mathematics",
      icon: Calculator,
      color: "from-cyan-500 to-cyan-600",
      topics: ["Algebra", "Geometry", "Statistics", "Calculus", "Trigonometry"],
    },
    science: {
      id: "science",
      name: "Science",
      icon: FlaskConical,
      color: "from-green-500 to-green-600",
      topics: ["Physics", "Chemistry", "Biology", "Earth Science", "Astronomy"],
    },
    english: {
      id: "english",
      name: "English",
      icon: Book,
      color: "from-pink-500 to-pink-600",
      topics: ["Literature", "Grammar", "Writing", "Reading", "Vocabulary"],
    },
    history: {
      id: "history",
      name: "Social Studies",
      icon: Users,
      color: "from-orange-500 to-orange-600",
      topics: ["World History", "Geography", "Civics", "Economics", "Culture"],
    },
  };

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
      averageScore: userSub.averageScore ?? 0,
      totalQuizzes: userSub.totalQuizzes ?? 0,
    };
  });

  // Local UI stats
  const [userStats, setUserStats] = useState({
    totalXP: 0,
    badges: 0,
    streakDays: 0,
    level: 1,
    rank: "Novice",
    progressToNextLevel: 0,
    xpToNextLevel: 1000,
  });

  useEffect(() => {
    if (!user) return;
    const levelInfo = calculateUserLevel(user.profile?.totalXP ?? 0);
    setUserStats({
      totalXP: user.profile?.totalXP ?? 0,
      badges: user.profile?.badges ?? 0,
      streakDays: user.profile?.streakDays ?? 0,
      level: levelInfo.level,
      rank:
        user.profile?.rank ??
        calculateUserRank(levelInfo.level, user.profile?.badges ?? 0),
      progressToNextLevel: levelInfo.progressToNextLevel,
      xpToNextLevel: levelInfo.xpToNextLevel,
    });
  }, [user]);

  // --- Quiz state ---
  const [currentView, setCurrentView] = useState("dashboard");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [quizStartTime, setQuizStartTime] = useState(null);

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
      } else {
        console.warn("No questions generated, falling back to local sample.");
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
      scoreRef.current = scoreRef.current + 1;

      // Update user stats optimistically for immediate UI feedback
      setUserStats((prev) => ({
        ...prev,
        totalXP: prev.totalXP + 25,
      }));
    } else {
      setShowSuccess(false);
    }

    setShowExplanation(true);

    // After short delay advance or finish
    setTimeout(async () => {
      setShowExplanation(false);
      setShowSuccess(false);

      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < quizQuestions.length) {
        setCurrentQuestionIndex(nextIndex);
      } else {
        // Finish quiz: compute final quiz record using scoreRef
        const durationSeconds = Math.max(
          0,
          Math.floor((Date.now() - (quizStartTime || Date.now())) / 1000)
        );
        const finalScore = scoreRef.current;
        const quizRecord = {
          quizId: `quiz-${new Date().toISOString().replace(/[:.]/g, "-")}`,
          subject: activeSubjectId || current.subject || "math",
          score: finalScore,
          total: quizQuestions.length,
          takenAt: new Date().toISOString(),
          durationSeconds,
        };

        // Add quiz record and update all related data
        await addQuizRecord(quizRecord);

        // Reset quiz state
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

  // --- RENDER QUIZ VIEW ---
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
              <div className="flex justify-center items-center space-x-4 mt-3">
                <div className="flex items-center space-x-1 text-blue-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {Math.floor(
                      (Date.now() - (quizStartTime || Date.now())) / 1000
                    )}
                    s
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-green-600">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">+{scoreRef.current * 25} XP</span>
                </div>
              </div>
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
                Progress tracking enabled
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD view ---
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
            {/* Enhanced Welcome Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                    Welcome back! Ready to level up? 🚀
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Continue your learning journey and unlock new achievements
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs sm:text-sm text-green-600 font-medium">
                      {userStats.xpToNextLevel > 0
                        ? `${userStats.xpToNextLevel} XP to next level`
                        : "Max level reached!"}
                    </span>
                    <span className="text-xs sm:text-sm text-purple-600 font-medium">
                      {weeklyGoal.completed}/{weeklyGoal.total} weekly quizzes
                    </span>
                  </div>
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
                      className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${userStats.progressToNextLevel}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Enhanced Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-3 sm:p-4 text-center border border-yellow-200">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-base sm:text-lg font-bold text-gray-800">
                    {userStats.totalXP.toLocaleString()}
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

            {/* Enhanced Subjects Grid */}
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
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-xs text-green-600">
                                Best: {subject.bestScore}/10
                              </span>
                              <span className="text-xs text-blue-600">
                                Avg: {subject.averageScore.toFixed(1)}/10
                              </span>
                            </div>
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
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-500">
                            Topics Completed
                          </span>
                          <span className="text-xs text-gray-500">
                            {
                              subject.topics.filter((topic) =>
                                user?.subjects?.[
                                  subject.id
                                ]?.topicsCompleted?.includes(topic)
                              ).length
                            }
                            /{subject.topics.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {subject.topics.slice(0, 3).map((topic, index) => {
                            const isCompleted =
                              user?.subjects?.[
                                subject.id
                              ]?.topicsCompleted?.includes(topic);
                            return (
                              <span
                                key={index}
                                className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                                  isCompleted
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {topic} {isCompleted && "✓"}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <div className="font-semibold text-blue-700">
                            {subject.weeklySessions}
                          </div>
                          <div className="text-blue-600">This Week</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2 text-center">
                          <div className="font-semibold text-purple-700">
                            {subject.totalQuizzes || 0}
                          </div>
                          <div className="text-purple-600">Total Quizzes</div>
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
                          onClick={() => handleStudyClick(subject)}
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

          {/* Enhanced Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Enhanced Weekly Goal */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-cyan-600" />
                Weekly Goal
              </h3>
              <div className="bg-gradient-to-r from-cyan-50 to-pink-50 rounded-xl p-3 sm:p-4 mb-4 border border-cyan-200">
                <p className="text-gray-800 font-semibold mb-3 text-sm sm:text-base">
                  Complete {weeklyGoal.total} practice sessions
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-2">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-pink-500 h-2 sm:h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${weeklyGoal.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">
                  {weeklyGoal.completed} of {weeklyGoal.total} completed
                </p>
                {weeklyGoal.percentage >= 100 && (
                  <div className="mt-2 p-2 bg-green-100 rounded-lg">
                    <p className="text-xs text-green-700 font-semibold">
                      🎉 Goal Achieved! +400 XP
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">
                Reward: 400 XP + Achievement Badge
              </p>
            </div>

            {/* Enhanced Achievements */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-pink-600" />
                Recent Achievements
              </h3>
              <div className="space-y-3">
                {(user?.achievements || [])
                  .filter((a) => a.earned)
                  .slice(0, 3)
                  .map((achievement, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {achievement.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(achievement.earnedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {achievement.xpReward && (
                        <span className="text-xs font-bold text-green-600">
                          +{achievement.xpReward} XP
                        </span>
                      )}
                    </div>
                  ))}

                {(!user?.achievements ||
                  user.achievements.filter((a) => a.earned).length === 0) && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Trophy className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No achievements yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Complete quizzes to unlock achievements!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Study Tips */}
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
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">
                    {user?.quizHistory
                      ? Math.round(
                          (user.quizHistory.reduce(
                            (acc, quiz) => acc + quiz.score,
                            0
                          ) /
                            user.quizHistory.length) *
                            10
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-xs opacity-90">Avg Score</div>
                </div>
                <div className="bg-white/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">
                    {user?.quizHistory?.length || 0}
                  </div>
                  <div className="text-xs opacity-90">Total Quizzes</div>
                </div>
              </div>
              <button
                onClick={() => {}}
                className="bg-white/20 hover:bg-white/30 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center space-x-2 mx-auto border border-white/20"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Next Tip</span>
              </button>
            </div>

            {/* Performance Analytics */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
                This Week
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Quizzes Taken</span>
                  <span className="font-semibold text-gray-800">
                    {weeklyGoal.completed}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">XP Earned</span>
                  <span className="font-semibold text-gray-800">
                    {user?.quizHistory
                      ? user.quizHistory
                          .filter(
                            (quiz) =>
                              new Date(quiz.takenAt) >
                              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          )
                          .reduce((acc, quiz) => acc + quiz.score * 25, 0)
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Study Sessions</span>
                  <span className="font-semibold text-gray-800">
                    {Object.values(user?.subjects || {}).reduce(
                      (acc, subject) => acc + (subject.weeklySessions || 0),
                      0
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Streak</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-semibold text-gray-800">
                      {userStats.streakDays}
                    </span>
                    <span className="text-orange-500">🔥</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievement Notification (could be triggered by new achievements) */}
        {false && ( // This would be controlled by state showing when new achievements are earned
          <div className="fixed bottom-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-xl shadow-2xl animate-bounce z-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold">Achievement Unlocked!</p>
                <p className="text-sm opacity-90">
                  Quiz Master - 10 Perfect Scores
                </p>
                <p className="text-xs opacity-75">+500 XP</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavBar;
