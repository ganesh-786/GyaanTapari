import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, X, Trophy, Clock, Zap, RotateCcw } from "lucide-react";

/**
 * TypingRace component (single-player)
 *
 * Props:
 * - passages?: string[]        // array of passages to race on (defaults included)
 * - timeLimit?: number         // time limit seconds (optional, 0 = no limit)
 * - rewardXP?: number          // how much XP to reward for a win (optional)
 * - onFinish?: (result) => {}  // callback called when race ends, receives result object
 *
 * Integrate into your dashboard similarly to Hangman:
 * import TypingRace from "../components/TypingRace";
 * <TypingRace onFinish={(r) => console.log(r)} />
 */

const DEFAULT_PASSAGES = [
  "Typing fast comes from consistent practice. Keep calm and focus on accuracy first.",
  "React components let you build UI with reusable pieces and state handled with hooks.",
  "A journey of a thousand miles begins with a single step — keep learning every day.",
  "Small, focused practice sessions beat long, unfocused ones. Try the Pomodoro rhythm.",
];

const TypingRace = ({
  passages = DEFAULT_PASSAGES,
  timeLimit = 0,
  rewardXP = 75,
  onFinish = null,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [passageIndex, setPassageIndex] = useState(0);
  const passage = useMemo(
    () => passages[passageIndex % passages.length],
    [passages, passageIndex]
  );

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const [typed, setTyped] = useState(""); // exact typed characters including mistakes/backspaces
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("typing_best")) || null;
    } catch {
      return null;
    }
  });
  const timerRef = useRef(null);

  // local leaderboard (store array of results)
  const [leaderboard, setLeaderboard] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("typing_leaderboard")) || [];
    } catch {
      return [];
    }
  });

  // focus capture ref (hidden input)
  const inputRef = useRef(null);

  // Reset whenever passage changes / modal opens
  useEffect(() => {
    resetRace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageIndex, modalOpen]);

  useEffect(() => {
    if (!started) return;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 250);
    return () => clearInterval(timerRef.current);
  }, [started, startTime]);

  useEffect(() => {
    if (!started) return;
    if (timeLimit > 0 && elapsed >= timeLimit) {
      endRace();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  // Stats computed
  const stats = useMemo(() => {
    const totalTyped = typed.length;
    const expected = passage.length;
    // compute correct characters (character-by-character)
    let correctCount = 0;
    for (let i = 0; i < Math.min(totalTyped, expected); i++) {
      if (typed[i] === passage[i]) correctCount++;
    }
    // accuracy
    const accuracy =
      totalTyped === 0
        ? 100
        : Math.max(0, Math.round((correctCount / totalTyped) * 100));
    // WPM = correct chars / 5 / minutes
    const minutes = Math.max(1 / 60, elapsed / 60); // avoid divide by zero
    const wpm = Math.round(correctCount / 5 / minutes);
    const progress = Math.min(100, Math.round((correctCount / expected) * 100));
    return { totalTyped, correctCount, accuracy, wpm, progress };
  }, [typed, passage, elapsed]);

  // Capture keyboard globally while modal open
  useEffect(() => {
    if (!modalOpen) return;
    // prefer hidden input for mobile IME; focus it
    inputRef.current?.focus();
  }, [modalOpen]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    // if race not started and user types, start race
    if (!started) {
      setStarted(true);
      setStartTime(Date.now());
      setElapsed(0);
    }
    // compute mistakes as typed chars that don't match passage at same index
    let m = 0;
    for (let i = 0; i < value.length; i++) {
      if (i >= passage.length) {
        m++;
      } else if (value[i] !== passage[i]) {
        m++;
      }
    }
    setTyped(value);
    setMistakes(m);

    // finish if user completed full passage
    if (
      value.length >= passage.length &&
      value.slice(0, passage.length) === passage
    ) {
      endRace();
    }
  };

  const handleKeyDown = (e) => {
    if (!modalOpen) return;
    // support shortcut: Esc to close when not started or finished
    if (e.key === "Escape") {
      if (finished || !started) setModalOpen(false);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, started, finished]);

  function resetRace() {
    clearInterval(timerRef.current);
    setTyped("");
    setStarted(false);
    setFinished(false);
    setStartTime(null);
    setElapsed(0);
    setMistakes(0);
  }

  function startRace() {
    resetRace();
    setModalOpen(true);
    // focus input after a short delay for modal animation
    setTimeout(() => inputRef.current?.focus(), 120);
  }

  function endRace() {
    if (finished) return;
    clearInterval(timerRef.current);
    setFinished(true);
    setStarted(false);
    const result = {
      passageIndex,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      mistakes,
      elapsed,
      timestamp: Date.now(),
      rewardXP:
        stats.wpm >= 20 && stats.accuracy >= 80
          ? rewardXP
          : Math.round(rewardXP / 3),
    };

    // update best
    const newBest = best && best.wpm >= result.wpm ? best : result;
    setBest(newBest);
    // leaderboard push top 10
    const newBoard = [result, ...leaderboard]
      .sort((a, b) => b.wpm - a.wpm)
      .slice(0, 10);
    setLeaderboard(newBoard);

    try {
      localStorage.setItem("typing_best", JSON.stringify(newBest));
      localStorage.setItem("typing_leaderboard", JSON.stringify(newBoard));
    } catch {}

    if (typeof onFinish === "function") {
      try {
        onFinish(result);
      } catch {}
    }
  }

  function nextPassage() {
    setPassageIndex((i) => i + 1);
    resetRace();
    inputRef.current?.focus();
  }

  return (
    <>
      {/* Card preview */}
      <div className="group bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h4 className="text-base sm:text-lg font-bold text-gray-800 truncate">
                Typing Race
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Improve your speed & accuracy — race against the clock
              </p>
            </div>
          </div>

          <button
            onClick={startRace}
            className="ml-3 bg-gradient-to-r from-cyan-500 to-pink-500 text-white px-3 py-2 rounded-lg font-semibold hover:opacity-95 transition"
          >
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4" />
              <span>Start</span>
            </div>
          </button>
        </div>

        <div className="text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>
                Time limit: {timeLimit > 0 ? `${timeLimit}s` : "none"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">
                Reward: {rewardXP} XP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-pink-500 flex items-center justify-center shadow">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    Typing Race
                  </h2>
                  <p className="text-xs text-gray-600">
                    Type the passage accurately and fast
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-xs px-2 py-1 rounded bg-yellow-50 border border-yellow-100 flex items-center space-x-1 text-yellow-700">
                  <Trophy className="w-3 h-3" />
                  <span>{best ? `${best.wpm} WPM` : `${rewardXP} XP`}</span>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Passage and typing area (main) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 sm:p-6 border-l-4 border-blue-500">
                  <div className="text-sm sm:text-base font-semibold text-gray-800 mb-2">
                    Passage
                  </div>
                  <div className="prose-sm break-words text-gray-700 leading-relaxed">
                    {/* highlighted characters */}
                    <div className="flex flex-wrap gap-1">
                      {passage.split("").map((ch, idx) => {
                        const typedCh = typed[idx] || "";
                        const status =
                          idx < typed.length
                            ? typedCh === ch
                              ? "correct"
                              : "wrong"
                            : idx === typed.length
                            ? "current"
                            : "pending";
                        return (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono ${
                              status === "correct"
                                ? "bg-green-50 border border-green-100 text-green-700"
                                : status === "wrong"
                                ? "bg-red-50 border border-red-100 text-red-700 line-through"
                                : status === "current"
                                ? "bg-blue-50 border border-blue-100 text-blue-700"
                                : "bg-white border border-gray-100 text-gray-700"
                            }`}
                          >
                            {ch === " " ? "·" : ch}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Your typing
                  </label>
                  {/* real input hidden but visible box above */}
                  <textarea
                    ref={inputRef}
                    value={typed}
                    onChange={handleInputChange}
                    placeholder="Start typing here to begin the race..."
                    rows={4}
                    className="mt-2 w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none"
                    aria-label="Typing input"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Tip: use Backspace to correct mistakes. Finish the passage
                    to complete the race.
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={resetRace}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold hover:bg-gray-50"
                    >
                      Reset
                    </button>
                    <button
                      onClick={nextPassage}
                      className="px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 text-sm font-semibold hover:bg-gray-200"
                    >
                      Next Passage
                    </button>
                    <button
                      onClick={() => {
                        setPassageIndex(0);
                        resetRace();
                      }}
                      className="px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-semibold hover:opacity-95 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Restart
                    </button>
                  </div>

                  <div className="text-right text-xs text-gray-500">
                    {timeLimit > 0
                      ? `Time: ${elapsed}s / ${timeLimit}s`
                      : `Time: ${elapsed}s`}
                  </div>
                </div>
              </div>

              {/* Right column: stats + leaderboard */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">WPM</div>
                      <div className="text-xl font-bold text-gray-800">
                        {stats.wpm}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Accuracy</div>
                      <div className="text-xl font-bold text-gray-800">
                        {stats.accuracy}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="rounded-full h-2 bg-gradient-to-r from-cyan-500 to-pink-500 transition-all"
                        style={{ width: `${stats.progress}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {stats.progress}% progress
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Mistakes: {mistakes} • Typed: {stats.totalTyped} chars
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-800">
                      Leaderboard
                    </div>
                    <div className="text-xs text-gray-500">
                      Top {leaderboard.length}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {leaderboard.length === 0 && (
                      <div className="text-xs text-gray-500">
                        No runs yet — be the first!
                      </div>
                    )}
                    {leaderboard.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] ${
                              i === 0 ? "bg-yellow-400" : "bg-gray-300"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <div className="truncate">
                            <div className="font-semibold text-gray-800">
                              Run #{i + 1}
                            </div>
                            <div className="text-gray-500">
                              {new Date(r.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{r.wpm} WPM</div>
                          <div className="text-gray-500 text-xs">
                            {r.accuracy}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center text-xs text-gray-500">
                  Finish the passage to complete. Good luck — aim for accuracy!
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Best: {best ? `${best.wpm} WPM • ${best.accuracy}%` : "—"}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(passage)
                      .then(() => alert("Passage copied!"))
                      .catch(() => {});
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                >
                  Copy
                </button>
                <button
                  onClick={() => {
                    resetRace();
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                >
                  Focus
                </button>
                <button
                  onClick={() => {
                    setModalOpen(false);
                  }}
                  className="px-3 py-2 rounded-lg text-sm border border-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TypingRace;
