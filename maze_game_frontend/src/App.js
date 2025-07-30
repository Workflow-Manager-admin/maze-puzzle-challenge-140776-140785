import React, { useState, useEffect, useRef } from "react";
import "./App.css";

// Color palette
const PRIMARY = "#0066cc";
const ACCENT = "#ffae42";
const SECONDARY = "#ffffff";

// Maze configs
const MAZE_ROWS = 12;
const MAZE_COLS = 18;

// Directions
const DIRS = [
  { name: "top", dr: -1, dc: 0 },
  { name: "right", dr: 0, dc: 1 },
  { name: "bottom", dr: 1, dc: 0 },
  { name: "left", dr: 0, dc: -1 },
];

// Simple maze cell representation
function initMaze(rows, cols) {
  const maze = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        r,
        c,
        walls: { top: true, right: true, bottom: true, left: true },
        visited: false,
      });
    }
    maze.push(row);
  }
  return maze;
}

/**
 * Recursive Backtracking Maze Generation
 */
function generateMaze(rows, cols) {
  const maze = initMaze(rows, cols);
  function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    return array;
  }
  function isValid(nr, nc) {
    return nr >= 0 && nr < rows && nc >= 0 && nc < cols;
  }
  function backtrack(r, c) {
    maze[r][c].visited = true;
    shuffle(DIRS).forEach(({ name, dr, dc }) => {
      const nr = r + dr, nc = c + dc;
      if (isValid(nr, nc) && !maze[nr][nc].visited) {
        // Knock down walls between current and neighbor
        maze[r][c].walls[name] = false;
        const opposite = { top: "bottom", right: "left", bottom: "top", left: "right" };
        maze[nr][nc].walls[opposite[name]] = false;
        backtrack(nr, nc);
      }
    });
  }
  backtrack(0, 0); // Start at top-left
  // Unmark visited cells for gameplay
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      maze[r][c].visited = false;
  return maze;
}

// PUBLIC_INTERFACE
/**
 * The main Maze Game App
 */
function App() {
  // Maze & State
  const [maze, setMaze] = useState(() => generateMaze(MAZE_ROWS, MAZE_COLS));
  const [player, setPlayer] = useState({ r: 0, c: 0 });
  const [gameActive, setGameActive] = useState(false);
  const [startTime, setStartTime] = useState(null); // ms timestamp
  const [elapsed, setElapsed] = useState(0); // seconds
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Timer
  const timerRef = useRef();
  useEffect(() => {
    if (gameActive && !completed) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 200);
      return () => clearInterval(timerRef.current);
    } else {
      clearInterval(timerRef.current);
    }
  }, [gameActive, startTime, completed]);

  // Keyboard controls
  useEffect(() => {
    if (!gameActive || completed) return;
    const handleKey = (e) => {
      const keyMap = {
        ArrowUp: "top",
        w: "top",
        ArrowDown: "bottom",
        s: "bottom",
        ArrowLeft: "left",
        a: "left",
        ArrowRight: "right",
        d: "right",
      };
      const dir = keyMap[e.key];
      if (!dir) return;
      movePlayer(dir);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line
  }, [player, maze, gameActive, completed]);

  // PUBLIC_INTERFACE
  function startNewGame() {
    const newMaze = generateMaze(MAZE_ROWS, MAZE_COLS);
    setMaze(newMaze);
    setPlayer({ r: 0, c: 0 });
    setGameActive(true);
    setElapsed(0);
    setScore(0);
    setStartTime(Date.now());
    setCompleted(false);
  }

  // PUBLIC_INTERFACE
  function resetGame() {
    setPlayer({ r: 0, c: 0 });
    setScore(0);
    setElapsed(0);
    setStartTime(Date.now());
    setGameActive(true);
    setCompleted(false);
  }

  // Movement & Gameplay
  // PUBLIC_INTERFACE
  function movePlayer(direction) {
    if (!gameActive || completed) return;
    const { r, c } = player;
    const cell = maze[r][c];
    // Don't move through walls
    if (cell.walls[direction]) return;
    let nr = r, nc = c;
    if (direction === "top") nr--;
    else if (direction === "bottom") nr++;
    else if (direction === "left") nc--;
    else if (direction === "right") nc++;
    if (nr < 0 || nc < 0 || nr >= MAZE_ROWS || nc >= MAZE_COLS) return;
    // Step: update score -1 for each move except first
    setPlayer({ r: nr, c: nc });
    setScore(s => s - 1);
    // If at the goal, finish
    if (nr === MAZE_ROWS - 1 && nc === MAZE_COLS - 1) {
      setGameActive(false);
      setCompleted(true);
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
      setScore(s => s + 1000); // Winning bonus
    }
  }

  // PUBLIC_INTERFACE
  function handleCellClick(row, col) {
    // Optional: Allow clicking adjacent squares or for mobile w/ on-screen controls.
    const { r, c } = player;
    if (
      (Math.abs(row - r) === 1 && col === c) ||
      (Math.abs(col - c) === 1 && row === r)
    ) {
      // Determine direction
      let dir = null;
      if (row < r) dir = "top";
      else if (row > r) dir = "bottom";
      else if (col < c) dir = "left";
      else if (col > c) dir = "right";
      if (dir) movePlayer(dir);
    }
  }

  // The main maze rendering
  function MazeGrid() {
    return (
      <div
        className="maze-grid"
        style={{
          display: "grid",
          gridTemplateRows: `repeat(${MAZE_ROWS}, 1fr)`,
          gridTemplateColumns: `repeat(${MAZE_COLS}, 1fr)`,
          background: SECONDARY,
          border: `4px solid ${PRIMARY}`,
          margin: "auto",
          maxWidth: "98vw",
          aspectRatio: `${MAZE_COLS} / ${MAZE_ROWS}`,
          boxShadow: "0 4px 24px 2px rgba(50, 70, 90, 0.10)",
        }}
        tabIndex={-1}
        aria-label="Maze"
      >
        {maze.map((row, r) =>
          row.map((cell, c) => {
            // Walls
            const style = {
              borderTop: cell.walls.top ? `2px solid ${PRIMARY}` : "2px solid transparent",
              borderRight: cell.walls.right ? `2px solid ${PRIMARY}` : "2px solid transparent",
              borderBottom: cell.walls.bottom ? `2px solid ${PRIMARY}` : "2px solid transparent",
              borderLeft: cell.walls.left ? `2px solid ${PRIMARY}` : "2px solid transparent",
              background:
                r === player.r && c === player.c
                  ? ACCENT
                  : r === MAZE_ROWS - 1 && c === MAZE_COLS - 1
                  ? "#C0F7C2"
                  : SECONDARY,
              transition: "background 0.12s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "clamp(10px, 2vw, 26px)",
              userSelect: "none",
              cursor:
                (Math.abs(r - player.r) === 1 && c === player.c) ||
                (Math.abs(c - player.c) === 1 && r === player.r)
                  ? "pointer"
                  : "default",
              // Highlight goal cell
              color: (r === MAZE_ROWS - 1 && c === MAZE_COLS - 1) ? PRIMARY : PRIMARY,
            };
            return (
              <div
                key={`${r}-${c}`}
                style={style}
                className={
                  "maze-cell" +
                  (r === player.r && c === player.c
                    ? " player-cell"
                    : "") +
                  (r === MAZE_ROWS - 1 && c === MAZE_COLS - 1 ? " goal-cell" : "")
                }
                aria-label={
                  r === player.r && c === player.c
                    ? "Player position"
                    : r === MAZE_ROWS - 1 && c === MAZE_COLS - 1
                    ? "Maze goal"
                    : undefined
                }
                onClick={() => handleCellClick(r, c)}
              >
                {r === player.r && c === player.c ? "🧑‍🚀" : ""}
                {/* Goal cell */}
                {r === MAZE_ROWS - 1 && c === MAZE_COLS - 1 && !(r === player.r && c === player.c)
                  ? "🏁"
                  : ""}
              </div>
            );
          })
        )}
      </div>
    );
  }

  // Sidebar with score, timer, instructions
  function Sidebar() {
    return (
      <aside className="sidebar" aria-label="Info & instructions">
        <div className="scorepanel">
          <h2 style={{ color: PRIMARY, marginBottom: 8 }}>Maze Game</h2>
          <div className="score-row" style={{ marginBottom: 6 }}>
            <span role="img" aria-label="Clock" style={{ marginRight: 8 }}>
              ⏱️
            </span>
            <span>
              Time:{" "}
              <span
                style={{
                  color: elapsed > 60 ? ACCENT : PRIMARY,
                  fontWeight: "bold",
                }}
              >
                {elapsed}s
              </span>
            </span>
          </div>
          <div className="score-row">
            <span role="img" aria-label="Score" style={{ marginRight: 8 }}>
              🏆
            </span>
            <span>
              Score:{" "}
              <span
                style={{
                  color: score < 0 ? ACCENT : PRIMARY,
                  fontWeight: "bold",
                }}
              >
                {score}
              </span>
            </span>
          </div>
          <div style={{ margin: "18px 0 0 0", textAlign: "left" }}>
            <div
              style={{
                background: "#f4f8ff",
                borderRadius: "8px",
                padding: "10px 15px",
                border: `1px solid ${PRIMARY}`,
                color: "#30416b",
                fontSize: 15,
                lineHeight: "1.6",
              }}
            >
              <b>How to Play</b>
              <ul style={{ padding: "6px 0 4px 22px", margin: 0 }}>
                <li>
                  Use <b>Arrow Keys</b> or <b>WASD</b> to move.
                </li>
                <li>
                  Reach the <b>🏁 Goal</b> at bottom right.
                </li>
                <li>
                  Each step <b>-1</b> point. Win fast for bonus!
                </li>
                <li>Click cells next to yours to move on mobile.</li>
                <li>
                  Press <b>New Maze</b> or <b>Reset Position</b> anytime.
                </li>
              </ul>
              <div style={{ fontSize: 13, marginTop: 8, color: PRIMARY }}>
                {completed
                  ? "🎉 Congratulations! You reached the goal."
                  : gameActive
                  ? "Game in progress..."
                  : "Click Start New Maze to play!"}
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Top toolbar with controls
  function Toolbar() {
    return (
      <div
        className="toolbar"
        style={{
          width: "100%",
          background: PRIMARY,
          color: SECONDARY,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
          boxSizing: "border-box",
          borderRadius: "0 0 16px 16px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          maxHeight: 56,
        }}
        aria-label="Toolbar"
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: ".03em",
            color: "#fff",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span style={{ marginRight: 13 }}>🧩</span> Maze Challenge
        </div>
        <div>
          <button
            className="btn"
            onClick={startNewGame}
            style={{
              marginRight: 8,
              background: ACCENT,
              color: PRIMARY,
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            {gameActive ? "New Maze" : "Start"}
          </button>
          <button
            className="btn"
            onClick={resetGame}
            style={{
              background: SECONDARY,
              color: PRIMARY,
              border: `2px solid ${PRIMARY}`,
              fontWeight: "bold",
              fontSize: 16,
            }}
            disabled={!gameActive}
          >
            Reset Position
          </button>
        </div>
      </div>
    );
  }

  // Responsive Layout
  return (
    <div className="maze-app-layout">
      <Toolbar />
      <main
        className="maze-main"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          maxWidth: "1200px",
          margin: "auto",
          padding: "24px 10px 32px 10px",
          flexWrap: "wrap",
          minHeight: "calc(100vh - 65px)",
          gap: "22px",
        }}
      >
        <div
          className="maze-center-panel"
          style={{
            flex: "2 1 600px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 200,
            minHeight: 200,
          }}
        >
          <MazeGrid />
        </div>
        <Sidebar />
      </main>
      <div style={{height:16}}></div>
      <footer className="maze-footer" style={{
        textAlign: "center",
        fontSize: 13,
        color: "#8fa9c7",
        padding: "10px 0 6px 0"
      }}>
        &copy; {new Date().getFullYear()} Maze Game. Made with <span style={{color:ACCENT}}>★</span>
      </footer>
    </div>
  );
}

export default App;
