import { render, screen } from "@testing-library/react";
import App from "./App";

// No usage of BatchedMesh or THREE in this test.
// If build error still persists, clear node_modules and reinstall dependencies.
test("renders Maze Game UI", () => {
  render(<App />);
  expect(screen.getByText(/Maze Game/i)).toBeInTheDocument();
  expect(screen.getByText(/Score:/i)).toBeInTheDocument();
  expect(screen.getByText(/How to Play/i)).toBeInTheDocument();
  // Player avatar cell
  expect(screen.getByText("🧑‍🚀")).toBeInTheDocument();
});
