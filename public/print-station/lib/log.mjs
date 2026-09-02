/**
 * What the shop owner sees when something goes wrong.
 *
 * Kept in memory and capped: this program runs for months on a counter PC
 * that nobody restarts, and an unbounded log is a memory leak with a
 * respectable name. Nothing here is written to disk — a customer's file name
 * passes through these lines, and the promise is that nothing of theirs stays
 * on this computer.
 */

const MAX_LINES = 200;

export function createLog() {
  const lines = [];

  function push(level, message) {
    lines.unshift({ at: new Date().toISOString(), level, message: String(message).slice(0, 500) });
    if (lines.length > MAX_LINES) lines.length = MAX_LINES;

    const stamp = new Date().toLocaleTimeString();
    const prefix = { error: "!", warn: "*", success: "+", info: " " }[level] ?? " ";
    console.log(`${stamp} ${prefix} ${message}`);
  }

  return { push, lines: () => lines.slice(0, 60) };
}
