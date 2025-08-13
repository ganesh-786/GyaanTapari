import { useState } from "react";
import NavBar from "./components/NavBar";
import Hangman from "./components/Hangman";
import TypingRace from "./components/TypingRace";

function App() {
  return (
    <>
      <NavBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">
            Mini Games
          </h3>
          <p className="text-xs sm:text-sm text-gray-500">
            Practice & earn XP — tap to open each game
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
          <div className="h-full" id="hangman">
            <Hangman />
          </div>

          <div className="h-full" id="typing">
            <TypingRace
              onFinish={(result) => {
                setUserStats((prev) => ({
                  ...prev,
                  totalXP: prev.totalXP + (result.rewardXP || 0),
                }));
                console.log("race finished", result);
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
