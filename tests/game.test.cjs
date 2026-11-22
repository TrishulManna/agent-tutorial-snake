const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");

const script = readFileSync(join(__dirname, "../dist/game.js"), "utf8");

function startGame(foodRolls = []) {
  const elements = new Map();
  let onKey;
  let onTick;

  function createElement() {
    const classes = new Set();
    const properties = new Map();
    const listeners = new Map();
    return {
      children: [],
      style: { setProperty: (name, value) => properties.set(name, value), properties },
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name),
      },
      append(...children) {
        for (const child of children) child.parent = this;
        this.children.push(...children);
      },
      remove() {
        const siblings = this.parent.children;
        siblings.splice(siblings.indexOf(this), 1);
        this.parent = undefined;
      },
      addEventListener(name, callback) { listeners.set(name, callback); },
      click() { listeners.get("click")?.(); },
      setAttribute() {},
      focus() {},
    };
  }

  for (const id of ["board", "score", "status", "restart"]) {
    elements.set("#" + id, createElement());
  }
  const window = {
    addEventListener(_, callback) { onKey = callback; },
    setInterval(callback) { onTick = callback; return 1; },
    clearInterval() { onTick = undefined; },
  };

  // Run the real compiled script with a minimal DOM and a clock the test can advance.
  const math = Object.create(Math);
  math.random = () => foodRolls.shift() ?? 0;
  runInNewContext(script, {
    Math: math,
    document: { querySelector: (id) => elements.get(id), createElement },
    window,
  });

  const board = elements.get("#board");
  const restart = elements.get("#restart");
  return {
    press: (key) => onKey({ key, preventDefault() {} }),
    tick: () => onTick(),
    head: () => ["--x", "--y"].map((axis) => Number(board.children[64].style.properties.get(axis))),
    length: () => board.children.length - 64,
    foodCells: () => board.children.slice(0, 64)
      .flatMap((cell, index) => cell.classList.contains("food") ? [index] : []),
    snakeCells: () => board.children.slice(64).map((segment) => {
      const { properties } = segment.style;
      return Number(properties.get("--y")) * 8 + Number(properties.get("--x"));
    }),
    score: () => elements.get("#score").textContent,
    status: () => elements.get("#status").textContent,
    running: () => onTick !== undefined,
    replayVisible: () => !restart.hidden,
    playAgain: () => restart.click(),
  };
}

// Food is sampled from empty cells in row order. Pick the middle of the
// target cell's random interval so the scenario stays the same on every run.
function foodAt(cell, occupied) {
  const free = Array.from({ length: 64 }, (_, index) => index)
    .filter((index) => !occupied.includes(index));
  assert.ok(free.includes(cell));
  return (free.indexOf(cell) + 0.5) / free.length;
}

test("two quick turns are applied in order, one per tick", () => {
  const game = startGame();
  game.press("ArrowUp");
  game.press("a");
  game.tick();
  assert.deepEqual(game.head(), [3, 2]);
  game.tick();
  assert.deepEqual(game.head(), [2, 2]);
  game.tick();
  assert.deepEqual(game.head(), [1, 2]);
});

test("a direct reversal is ignored", () => {
  const game = startGame();
  game.press("ArrowLeft");
  game.tick();
  assert.deepEqual(game.head(), [4, 3]);
});

test("eating adds one segment and one point", () => {
  const game = startGame([foodAt(28, [27, 26])]);
  game.tick();
  assert.equal(game.length(), 3);
  assert.equal(game.score(), "Score 1");
});

test("food spawns on an empty square at the start and after growth", () => {
  // The second roll would select cell 28 (the new head) if all 64 cells were eligible.
  const game = startGame([foodAt(28, [27, 26]), 28.5 / 64]);
  assert.deepEqual(game.foodCells(), [28]);
  assert.ok(!game.snakeCells().includes(28));

  game.tick();
  assert.equal(game.score(), "Score 1");
  const food = game.foodCells();
  assert.equal(food.length, 1);
  assert.ok(!game.snakeCells().includes(food[0]));
});

test("hitting the wall stops the run at the last valid square", () => {
  const game = startGame();
  for (let i = 0; i < 5; i++) game.tick();
  assert.deepEqual(game.head(), [7, 3]);
  assert.equal(game.status(), "You hit a wall.");
  assert.equal(game.running(), false);
});

test("turning into an occupied body square stops the run", () => {
  const game = startGame([
    foodAt(28, [27, 26]),
    foodAt(29, [28, 27, 26]),
    foodAt(37, [29, 28, 27, 26]),
    foodAt(36, [37, 29, 28, 27, 26]),
  ]);
  game.tick();
  game.tick();
  game.press("s");
  game.tick();
  game.press("a");
  game.tick();
  game.press("w");
  game.tick();
  assert.deepEqual(game.head(), [4, 4]);
  assert.equal(game.status(), "You hit your tail.");
  assert.equal(game.running(), false);
});

test("Play again resets a crashed run and starts moving again", () => {
  // Put food directly ahead so the run has a score and extra segment to reset.
  const game = startGame([foodAt(28, [27, 26])]);
  game.tick();
  assert.equal(game.score(), "Score 1");
  assert.equal(game.length(), 3);

  game.press("ArrowUp");
  for (let i = 0; i < 3; i++) game.tick();

  // Reach the top edge, then crash on Up while Left is still waiting in the queue.
  game.press("ArrowRight");
  game.press("ArrowUp");
  game.press("ArrowLeft");
  game.tick();
  game.tick();
  assert.equal(game.status(), "You hit a wall.");
  assert.equal(game.running(), false);
  assert.equal(game.replayVisible(), true);

  // Use the button's click handler, just as a player does.
  game.playAgain();
  assert.equal(game.score(), "Score 0");
  assert.equal(game.length(), 2);
  assert.deepEqual(game.head(), [3, 3]);
  assert.equal(game.status(), "");
  assert.equal(game.replayVisible(), false);
  assert.equal(game.running(), true);

  // The first tick should move right from the starting square, with no stale turn.
  game.tick();
  assert.deepEqual(game.head(), [4, 3]);
});
