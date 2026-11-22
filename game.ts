const size = 8;
const tickMs = 400;

// Find the grid container and the score display.
const board = document.querySelector<HTMLElement>("#board");
const scoreText = document.querySelector<HTMLElement>("#score");

const statusText = document.querySelector<HTMLElement>("#status");
const restart = document.querySelector<HTMLButtonElement>("#restart");

// Fail with a clear error if the HTML is missing any game controls.
if (!board || !scoreText || !statusText || !restart) {
  throw new Error("The Snake board or game controls are missing.");
}

// Each key maps to a one-cell offset so arrows and WASD share the same turn queue.
// Columns increase to the right and rows increase downward, so Up subtracts one from y.
const steps = new Map([
  ["ArrowUp", { x: 0, y: -1 }],
  ["ArrowDown", { x: 0, y: 1 }],
  ["ArrowLeft", { x: -1, y: 0 }],
  ["ArrowRight", { x: 1, y: 0 }],
  ["w", { x: 0, y: -1 }],
  ["s", { x: 0, y: 1 }],
  ["a", { x: -1, y: 0 }],
  ["d", { x: 1, y: 0 }],
]);

type Point = { x: number; y: number };

// Keep the head first so each tick can add a new head and remove the last segment.
let snake: Point[] = [];
let direction: Point;
const turns: Point[] = [];
let timer: number | undefined;
let score = 0;
const sameCell = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

// Share the board size with CSS so the column count matches the cells we create.
board.style.setProperty("--size", String(size));
board.style.setProperty("--slide-time", `${tickMs}ms`);

// Create all 64 background squares once. Food still sits on a background square.
const cells = Array.from({ length: size * size }, () => {
  const cell = document.createElement("div");
  cell.className = "cell";
  // These background squares are decorative.
  cell.setAttribute("aria-hidden", "true");
  return cell;
});
board.append(...cells);

const placeFood = (): Point | undefined => {
  // Choose from empty squares so food can't appear inside the snake.
  // Listing them also lets us detect when the snake fills the board.
  const empty = cells
    .map((_, index) => ({ x: index % size, y: Math.floor(index / size) }))
    .filter((point) => !snake.some((segment) => sameCell(segment, point)));
  return empty[Math.floor(Math.random() * empty.length)];
};

let food: Point | undefined;
const segmentViews: HTMLDivElement[] = [];

const render = () => {
  // Reuse one element per segment so CSS can slide it from its previous position.
  // When the snake grows, only the new tail needs a new element.
  snake.forEach(({ x, y }, index) => {
    const existing = segmentViews[index];
    const segment = existing ?? document.createElement("div");
    segment.style.setProperty("--x", String(x));
    segment.style.setProperty("--y", String(y));

    if (!existing) {
      segment.className = "segment";
      segment.setAttribute("aria-hidden", "true");
      segmentViews.push(segment);
      board.append(segment);
    }
  });

  // Food uses the original grid cells, addressed by row * size + column.
  for (const cell of cells) cell.classList.remove("food");
  if (food) cells[food.y * size + food.x].classList.add("food");
  scoreText.textContent = `Score ${score}`;
};

// Steering keys queue turns while the timer owns movement.
window.addEventListener("keydown", (event) => {
  // Normalize letter keys so Caps Lock doesn't affect steering.
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const step = steps.get(key);
  if (!step || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  event.preventDefault();
  // Holding a key should not add extra turns to the queue.
  if (event.repeat || timer === undefined) return;

  // Compare against the last queued turn. With Right active and Up waiting,
  // Left is legal because it will follow Up.
  const previous = turns.at(-1) ?? direction;
  if (sameCell(step, previous) || (step.x === -previous.x && step.y === -previous.y)) return;
  turns.push(step);
});

const endRun = (message: string) => {
  window.clearInterval(timer);
  timer = undefined;
  statusText.textContent = message;
  restart.hidden = false;
  restart.focus();
};

const tick = () => {
  // Apply one turn per tick in the order it arrived. Keep going straight if the queue is empty.
  direction = turns.shift() ?? direction;
  const head = snake[0];
  const next = { x: head.x + direction.x, y: head.y + direction.y };
  const eating = food !== undefined && sameCell(next, food);

  if (next.x < 0 || next.x >= size || next.y < 0 || next.y >= size) {
    endRun("You hit a wall.");
    return;
  }

  // The tail moves away on a normal tick, so entering its current square is safe.
  const occupied = eating ? snake : snake.slice(0, -1);
  if (occupied.some((segment) => sameCell(segment, next))) {
    endRun("You hit your tail.");
    return;
  }

  snake.unshift(next);
  // Keep the tail on a food tick so adding the head grows the snake by one.
  if (eating) {
    score += 1;
    food = placeFood();
  } else {
    snake.pop();
  }
  render();
  if (!food) endRun("You filled the board!");
};

const startRun = () => {
  // Reset the timer and input queue so a new run starts with a full tick and fresh controls.
  window.clearInterval(timer);
  // Fresh elements appear at the start instead of sliding across from the last run.
  for (const segment of segmentViews.splice(0)) segment.remove();
  snake = [{ x: 3, y: 3 }, { x: 2, y: 3 }];
  direction = { x: 1, y: 0 };
  turns.length = 0;
  score = 0;
  food = placeFood();
  statusText.textContent = "";
  restart.hidden = true;
  render();
  timer = window.setInterval(tick, tickMs);
};

restart.addEventListener("click", () => {
  startRun();
  board.focus();
});
startRun();
