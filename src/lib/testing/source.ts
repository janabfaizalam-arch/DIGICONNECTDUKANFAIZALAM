import { readFileSync } from "fs";
import { join } from "path";

/**
 * Read a source file for a contract test, with its comments removed.
 *
 * Several tests in this codebase assert that a file contains — or does not
 * contain — a particular piece of code. Those assertions have to run against
 * the code and not the prose around it, or a docblock explaining why something
 * was removed will satisfy a test checking that it is gone.
 *
 * Each of them grew its own copy of the stripper, and every copy had the same
 * bug: block comments were removed with a non-greedy `/\/\*[\s\S]*?\*\//`.
 * That is wrong here. `src/components/apply/use-apply-flow.ts` contains
 *
 *     input.accept = "image/*";
 *
 * and the `/*` inside that string starts a match which then runs to the next
 * `*` + `/` in the file — 10,434 characters, including the entire Razorpay
 * handshake. Assertions about payment code were being evaluated against text
 * that had already been deleted, which is the worst kind of green.
 *
 * Comments are dropped line by line instead. A line that *starts* with a
 * comment marker is a comment; a line that merely contains one is code.
 */
export function readSource(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

export function readCode(rel: string) {
  return readSource(rel)
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join("\n");
}
