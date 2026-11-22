# Copper Snake

## Build and check

Run these from the project folder with Node, npm, and the TypeScript compiler (`tsc`) available.

- `npm run build` compiles `game.ts` into `dist/game.js`.
- `npm test` rebuilds the game and checks food placement, growth, wall and body collisions, direct reversals, queued turns, and **Play again**.

## Browser smoke check

1. Run `npm run build`, then start the preview with `python3 -m http.server 8000 --bind 127.0.0.1`.
2. Open [Copper Snake](http://127.0.0.1:8000/) or reload the existing tab. Check that the board, snake, food, and score appear.
3. Let the snake hit a wall. Check that the crash message and **Play again** appear.
4. Select **Play again** and quickly press **W**, then **Left Arrow**. Check that the score starts at zero and the snake moves up before continuing left.

The rule tests advance the clock one tick at a time and use predictable food placement. The browser check exercises the real page and keyboard. Play a longer run to judge whether the glide and turn timing feel right.
