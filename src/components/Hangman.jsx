import React, { useState, useEffect, useMemo } from "react";
import {
  Play,
  X,
  Sparkles,
  Gift,
  RotateCcw,
  PersonStandingIcon,
} from "lucide-react";

const DEFAULT_WORDS = [
  "REACT",
  "JAVASCRIPT",
  "COMPONENT",
  "TAILWIND",
  "EDUCATION",
  "ALGORITHM",
  "ASYNC",
  "FUNCTION",
  "PROGRAM",
  "DEBUG",
  "HANGMAN",
];

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const Hangman = ({ words = DEFAULT_WORDS, rewardXP = 50 }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [word, setWord] = useState("");
  const [guessed, setGuessed] = useState(new Set());
  const [wrong, setWrong] = useState(0);
  const maxWrong = 6;
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState("");
  const [xpEarned, setXpEarned] = useState(0);

  const pickWord = () => {
    const w = words[Math.floor(Math.random() * words.length)].toUpperCase();
    // sanitize: keep letters and spaces (but here words are single words)
    setWord(w);
    setGuessed(new Set());
    setWrong(0);
    setGameOver(false);
    setWon(false);
    setMessage("");
    setXpEarned(0);
  };

  useEffect(() => {
    if (modalOpen) pickWord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  const lettersInWord = useMemo(
    () => new Set(word.replace(/[^A-Z]/g, "").split("")),
    [word]
  );

  useEffect(() => {
    if (!word) return;
    // check win
    const guessedLetters = Array.from(guessed).filter((l) => /[A-Z]/.test(l));
    const guessedSet = new Set(guessedLetters);
    let all = true;
    lettersInWord.forEach((l) => {
      if (!guessedSet.has(l)) all = false;
    });
    if (all && lettersInWord.size > 0) {
      setWon(true);
      setGameOver(true);
      setMessage(`You won! +${rewardXP} XP`);
      setXpEarned(rewardXP);
    }
    if (wrong >= maxWrong) {
      setWon(false);
      setGameOver(true);
      setMessage(`You lost — the word was "${word}"`);
    }
  }, [guessed, wrong, lettersInWord, word, rewardXP]);

  const handleLetter = (letter) => {
    if (gameOver) return;
    if (guessed.has(letter)) return;
    const newSet = new Set(guessed);
    newSet.add(letter);
    setGuessed(newSet);

    if (lettersInWord.has(letter)) {
      // correct guess
    } else {
      setWrong((w) => w + 1);
    }
  };

  const revealWord = () => {
    // add all letters to guessed
    const all = new Set(guessed);
    lettersInWord.forEach((l) => all.add(l));
    setGuessed(all);
  };

  const restart = () => {
    pickWord();
  };

  // masked word display
  const masked = word.split("").map((ch, idx) => {
    if (!/[A-Z]/.test(ch)) return ch; // show spaces/punct
    return guessed.has(ch) ? ch : "_";
  });

  // Simple SVG hangman drawing: parts shown depending on wrong count
  const HangmanSVG = ({ wrongCount }) => {
    // parts: 0 base, 1 pole, 2 beam, 3 rope+head, 4 body, 5 arms, 6 legs
    return (
      <svg viewBox="0 0 120 160" width="160" height="200" className="mx-auto">
        {/* base */}
        <line
          x1="10"
          y1="150"
          x2="110"
          y2="150"
          stroke="#cbd5e1"
          strokeWidth="4"
        />
        {/* pole */}
        {wrongCount > 0 && (
          <line
            x1="30"
            y1="150"
            x2="30"
            y2="20"
            stroke="#94a3b8"
            strokeWidth="4"
          />
        )}
        {/* beam */}
        {wrongCount > 1 && (
          <line
            x1="30"
            y1="20"
            x2="80"
            y2="20"
            stroke="#94a3b8"
            strokeWidth="4"
          />
        )}
        {/* rope */}
        {wrongCount > 2 && (
          <line
            x1="80"
            y1="20"
            x2="80"
            y2="35"
            stroke="#64748b"
            strokeWidth="3"
          />
        )}
        {/* head */}
        {wrongCount > 2 && (
          <circle
            cx="80"
            cy="48"
            r="13"
            stroke="#334155"
            strokeWidth="3"
            fill="none"
          />
        )}
        {/* body */}
        {wrongCount > 3 && (
          <line
            x1="80"
            y1="61"
            x2="80"
            y2="100"
            stroke="#334155"
            strokeWidth="3"
          />
        )}
        {/* left arm */}
        {wrongCount > 4 && (
          <line
            x1="80"
            y1="72"
            x2="63"
            y2="86"
            stroke="#334155"
            strokeWidth="3"
          />
        )}
        {/* right arm */}
        {wrongCount > 4 && (
          <line
            x1="80"
            y1="72"
            x2="97"
            y2="86"
            stroke="#334155"
            strokeWidth="3"
          />
        )}
        {/* left leg */}
        {wrongCount > 5 && (
          <line
            x1="80"
            y1="100"
            x2="66"
            y2="126"
            stroke="#334155"
            strokeWidth="3"
          />
        )}
        {/* right leg */}
        {wrongCount > 5 && (
          <line
            x1="80"
            y1="100"
            x2="94"
            y2="126"
            stroke="#334155"
            strokeWidth="3"
          />
        )}
      </svg>
    );
  };

  return (
    <>
      {/* Responsive Hangman card */}
      <div className="group bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-6 md:p-8 border border-gray-200 hover:shadow-lg transition-all duration-300">
        {/* Top row: stacks on mobile, horizontal on sm+ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
          {/* Left: icon + title + description */}
          <div className="flex items-start sm:items-center space-x-3 min-w-0 w-full">
            <div className="w-12 h-12 sm:w-14 md:w-16 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
              <PersonStandingIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>

            <div className="min-w-0">
              <h4 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
                Hangman
              </h4>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 truncate">
                Word puzzle — guess the letters before you run out of tries
              </p>
            </div>
          </div>

          {/* Right: Play button - full width on mobile, auto width on sm+ */}
          <div className="w-full sm:w-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={!!modalOpen}
              aria-label="Play Hangman"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 ml-0 sm:ml-3 px-4 py-3 sm:px-3 sm:py-2 rounded-lg font-semibold text-sm sm:text-sm text-white
                   bg-gradient-to-r from-pink-500 to-cyan-500 shadow-md hover:opacity-95 active:scale-[0.98] transform transition
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-300"
            >
              <Play className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span className="leading-none">Play</span>
            </button>
          </div>
        </div>

        {/* Bottom row: reward and meta; stack vertically on mobile, horizontal on sm+ */}
        <div className="text-xs sm:text-sm text-gray-600">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="text-sm sm:text-sm">Reward: {rewardXP} XP</span>
            </div>

            <div className="text-right">
              <span className="text-xs sm:text-sm text-gray-500 block">
                Max mistakes: {maxWrong}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-pink-500 to-cyan-500 flex items-center justify-center shadow">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Hangman</h2>
                  <p className="text-xs text-gray-600">
                    Guess the word — one letter at a time
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="text-xs px-2 py-1 rounded bg-green-50 border border-green-100 flex items-center space-x-1 text-green-700">
                  <Sparkles className="w-3 h-3" />
                  <span>
                    {xpEarned > 0 ? `+${xpEarned} XP` : `${rewardXP} XP`}
                  </span>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Top row: hangman svg + masked word */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col items-center">
                  <HangmanSVG wrongCount={wrong} />
                  <p className="text-sm text-gray-600 mt-2">
                    {wrong} / {maxWrong} mistakes
                  </p>
                </div>

                <div>
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 sm:p-6 border-l-4 border-blue-500">
                    <div className="text-sm sm:text-base font-semibold text-gray-800 mb-2">
                      Word
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {masked.map((ch, idx) => (
                        <div
                          key={idx}
                          className="w-9 h-12 sm:w-12 sm:h-14 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xl font-bold text-gray-800"
                        >
                          {ch === " " ? (
                            <span className="text-xs text-gray-400">•</span>
                          ) : (
                            ch
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* keyboard */}
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                      Letters
                    </div>
                    <div className="grid grid-cols-9 gap-2">
                      {alphabet.map((l) => {
                        const used = guessed.has(l);
                        const correct = lettersInWord.has(l);
                        const disabled = used || gameOver;
                        // color variants
                        let cls =
                          "bg-white border border-gray-200 text-gray-700 hover:scale-105";
                        if (used && correct)
                          cls = "bg-green-50 border-green-200 text-green-700";
                        if (used && !correct)
                          cls =
                            "bg-red-50 border-red-200 text-red-700 line-through";
                        return (
                          <button
                            key={l}
                            onClick={() => handleLetter(l)}
                            disabled={disabled}
                            className={`py-2 rounded-lg text-xs sm:text-sm font-semibold transition transform ${cls} flex items-center justify-center`}
                          >
                            {l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls + message area */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  {gameOver ? (
                    <div
                      className={`p-3 rounded-lg ${
                        won
                          ? "bg-green-50 border border-green-200 text-green-700"
                          : "bg-red-50 border border-red-200 text-red-700"
                      }`}
                    >
                      <div className="font-semibold">{message}</div>
                      {!won && (
                        <div className="text-xs text-gray-600 mt-1">
                          Try again — practice makes perfect!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      Hint: {word.length} letters
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={restart}
                    className="bg-gradient-to-r from-pink-500 to-cyan-500 text-white px-3 py-2 rounded-lg font-semibold flex items-center space-x-2 hover:opacity-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restart</span>
                  </button>

                  {gameOver && (
                    <button
                      onClick={() => {
                        revealWord();
                      }}
                      className="bg-gray-100 px-3 py-2 rounded-lg font-semibold text-gray-700 border border-gray-200 hover:bg-gray-200"
                    >
                      Reveal
                    </button>
                  )}

                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-2 rounded-lg font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-gray-100 text-xs text-gray-500">
              Tip: Letters with colors show letters you've already tried. Green
              = correct, red = wrong.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Hangman;
