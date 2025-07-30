import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html, SoftShadows } from "@react-three/drei";
// **Removed unused import of THREE

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

// Maze cell primitive
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

// Recursive Backtracking Maze Generation
function generateMaze(rows, cols) {
  const maze = initMaze(rows, cols);
  function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
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
        maze[r][c].walls[name] = false;
        const opposite = { top: "bottom", right: "left", bottom: "top", left: "right" };
        maze[nr][nc].walls[opposite[name]] = false;
        backtrack(nr, nc);
      }
    });
  }
  backtrack(0, 0);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      maze[r][c].visited = false;
  return maze;
}

// PUBLIC_INTERFACE
/**
 * Main Maze Game 3D App
 */
function App() {
  // Maze & State
  const [maze, setMaze] = useState(() => generateMaze(MAZE_ROWS, MAZE_COLS));
  const [player, setPlayer] = useState({ r: 0, c: 0 });
  const [gameActive, setGameActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
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
  const movePlayer = useCallback((direction) => {
    if (!gameActive || completed) return;
    const { r, c } = player;
    const cell = maze[r][c];
    if (cell.walls[direction]) return;
    let nr = r, nc = c;
    if (direction === "top") nr--;
    else if (direction === "bottom") nr++;
    else if (direction === "left") nc--;
    else if (direction === "right") nc++;
    if (nr < 0 || nc < 0 || nr >= MAZE_ROWS || nc >= MAZE_COLS) return;
    setPlayer({ r: nr, c: nc });
    setScore(s => s - 1);
    if (nr === MAZE_ROWS - 1 && nc === MAZE_COLS - 1) {
      setGameActive(false);
      setCompleted(true);
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
      setScore(s => s + 1000); // Bonus
    }
  }, [gameActive, completed, maze, player, startTime]);

  // PUBLIC_INTERFACE
  function handleCellClick(row, col) {
    const { r, c } = player;
    if (
      (Math.abs(row - r) === 1 && col === c) ||
      (Math.abs(col - c) === 1 && row === r)
    ) {
      let dir = null;
      if (row < r) dir = "top";
      else if (row > r) dir = "bottom";
      else if (col < c) dir = "left";
      else if (col > c) dir = "right";
      if (dir) movePlayer(dir);
    }
  }

  // 3D Maze rendering with react-three-fiber
  // Each cell is a floor tile; walls are painted as thin 3D boxes on sides if present; player and goal are spheres with color/animation

  function Maze3DView() {
    // Block size in 3D units
    const UNIT = 1.1;

    // Draw maze floor and walls
    const tiles = [];
    const walls = [];
    for (let r = 0; r < MAZE_ROWS; r++) {
      for (let c = 0; c < MAZE_COLS; c++) {
        // Floor tile
        tiles.push(
          <mesh
            key={`floor-${r}-${c}`}
            position={[c * UNIT, 0, r * UNIT]}
            receiveShadow
            onClick={() => handleCellClick(r, c)}
          >
            <boxGeometry args={[1, 0.1, 1]} />
            <meshStandardMaterial color={SECONDARY} />
          </mesh>
        );
        // Walls
        const wallProps = {
          castShadow: true,
          receiveShadow: true,
        };
        if (maze[r][c].walls.top && r === 0) {
          walls.push(
            <mesh
              key={`wall-t-${r}-${c}`}
              position={[c * UNIT, 0.3, (r - 0.5) * UNIT]}
              {...wallProps}
            >
              <boxGeometry args={[1, 0.6, 0.1]} />
              <meshStandardMaterial color={PRIMARY} />
            </mesh>
          );
        }
        if (maze[r][c].walls.left && c === 0) {
          walls.push(
            <mesh
              key={`wall-l-${r}-${c}`}
              position={[(c - 0.5) * UNIT, 0.3, r * UNIT]}
              {...wallProps}
            >
              <boxGeometry args={[0.1, 0.6, 1]} />
              <meshStandardMaterial color={PRIMARY} />
            </mesh>
          );
        }
        if (maze[r][c].walls.bottom) {
          walls.push(
            <mesh
              key={`wall-b-${r}-${c}`}
              position={[c * UNIT, 0.3, (r + 0.5) * UNIT]}
              {...wallProps}
            >
              <boxGeometry args={[1, 0.6, 0.13]} />
              <meshStandardMaterial color={PRIMARY} />
            </mesh>
          );
        }
        if (maze[r][c].walls.right) {
          walls.push(
            <mesh
              key={`wall-r-${r}-${c}`}
              position={[(c + 0.5) * UNIT, 0.3, r * UNIT]}
              {...wallProps}
            >
              <boxGeometry args={[0.13, 0.6, 1]} />
              <meshStandardMaterial color={PRIMARY} />
            </mesh>
          );
        }
      }
    }

    // Player and goal 3D markers
    const playerY = 0.5;
    const goalY = 0.3;
    const playerColor = ACCENT;
    const goalColor = "#95e39c";

    return (
      <Canvas
        style={{
          width: "100%",
          height: "min(64vw, 60vh)",
          minHeight: 300,
          background: "linear-gradient(180deg, #fff 80%, #e4f1ff 100%)",
          borderRadius: "10px",
          boxShadow: "0 4px 28px 3px rgba(20,80,120,0.08)",
        }}
        shadows
        dpr={window.devicePixelRatio}
        camera={{ fov: 62, near: 0.1, far: 100, position: [MAZE_COLS / 2, 13, MAZE_ROWS * 1.10] }}
      >
        <color attach="background" args={["#eaf3ff"]} />
        <PerspectiveCamera
          makeDefault
          fov={55}
          position={[MAZE_COLS / 2, 11.5, MAZE_ROWS * 0.95]}
        />
        <SoftShadows size={12} samples={22} focus={0.8} />
        <ambientLight intensity={0.83} />
        <directionalLight position={[8, 14, 18]} intensity={1.16} castShadow shadow-mapSize-width={1024}
          shadow-mapSize-height={1024} shadow-camera-far={50} />
        {/* Maze Floor */}
        <group>{tiles}</group>
        {/* Maze Walls */}
        <group>{walls}</group>

        {/* Player */}
        <mesh
          position={[player.c * UNIT, playerY, player.r * UNIT]}
          castShadow
        >
          <sphereGeometry args={[0.33, 32, 32]} />
          <meshStandardMaterial color={playerColor} emissive={playerColor} emissiveIntensity={0.23} />
          {/* Player emoji above sphere as HTML */}
          <Html position={[0, 0.46, 0]} style={{ userSelect: "none" }}>
            <span style={{ fontSize: 24, filter: "drop-shadow(0px 1px 2px #fff7)" }}>
              🧑‍🚀
            </span>
          </Html>
        </mesh>
        {/* Goal */}
        <mesh
          position={[(MAZE_COLS - 1) * UNIT, goalY, (MAZE_ROWS - 1) * UNIT]}
          castShadow
        >
          <sphereGeometry args={[0.29, 28, 28]} />
          <meshStandardMaterial color={goalColor} emissive={goalColor} emissiveIntensity={0.15} />
          {/* Goal flag emoji */}
          <Html position={[0, 0.40, 0]}>
            <span style={{ fontSize: 22 }}>🏁</span>
          </Html>
        </mesh>
        {/* Soft bottom shadows */}
        <mesh position={[MAZE_COLS * UNIT / 2 - 0.5 * UNIT, 0, MAZE_ROWS * UNIT / 2 - 0.5 * UNIT]}
          receiveShadow >
          <boxGeometry args={[MAZE_COLS * UNIT, 0.05, MAZE_ROWS * UNIT]} />
          <meshStandardMaterial color="#ecf4ff" />
        </mesh>
        {/* Controls */}
        <OrbitControls
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={0.14}
          target={[MAZE_COLS / 2, 0, MAZE_ROWS / 2]}
          dampingFactor={0.16}
          enablePan={false}
        />
      </Canvas>
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
                <li>Click adjacent tiles to move on mobile.</li>
                <li>
                  Press <b>New Maze</b> or <b>Reset Position</b> anytime.
                </li>
                <li>Rotate camera: drag with mouse.</li>
                <li>Zoom: pinch or mouse wheel.</li>
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
          <span style={{ marginRight: 13 }}>🧩</span> Maze Challenge 3D
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

  // Layout with 3D Maze view in the center
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
            maxWidth: 780,
          }}
        >
          <Maze3DView />
        </div>
        <Sidebar />
      </main>
      <div style={{ height: 16 }}></div>
      <footer className="maze-footer" style={{
        textAlign: "center",
        fontSize: 13,
        color: "#8fa9c7",
        padding: "10px 0 6px 0"
      }}>
        &copy; {new Date().getFullYear()} Maze Game. Made in <span style={{ color: ACCENT }}>3D</span>
      </footer>
    </div>
  );
}

export default App;
