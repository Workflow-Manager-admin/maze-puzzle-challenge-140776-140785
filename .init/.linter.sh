#!/bin/bash
cd /home/kavia/workspace/code-generation/maze-puzzle-challenge-140776-140785/maze_game_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

