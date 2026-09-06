import { describe, expect, it } from "vitest";

import { EXAMPLE_COMMANDS, normalizeCommand, parseCommand } from "@/lib/content-engine/command-center";

/**
 * Understanding what the shopkeeper typed, without paying for it.
 *
 * The recognisable shapes are matched here for free. Sending "5 Labour Card
 * ideas do" to a model to discover that it means "five ideas about Labour
 * Card" is exactly the spending the cost rules forbid, and it would be slower
 * and less reliable than a regular expression.
 */

describe("the examples the screen offers all parse", () => {
  it("recognises every one of them", () => {
    for (const example of EXAMPLE_COMMANDS) {
      const intent = parseCommand(example);
      expect(intent.kind, `${example} was not understood`).not.toBe("unknown");
    }
  });
});

describe("the shapes this shop actually types", () => {
  it('understands "Is hafte kya post karna chahiye?"', () => {
    expect(parseCommand("Is hafte kya post karna chahiye?").kind).toBe("plan_week");
    expect(parseCommand("What should I post this week?").kind).toBe("plan_week");
  });

  it('understands "Number 2 chalao"', () => {
    const intent = parseCommand("Number 2 chalao.");
    expect(intent.kind).toBe("run_idea");
    if (intent.kind !== "run_idea") return;
    expect(intent.reference).toBe(2);
  });

  it('understands "5 Labour Card ideas do"', () => {
    const intent = parseCommand("5 Labour Card ideas do.");
    expect(intent.kind).toBe("generate_ideas");
    if (intent.kind !== "generate_ideas") return;
    expect(intent.count).toBe(5);
    expect(intent.topic.toLowerCase()).toContain("labour card");
  });

  it('understands "Is post ke 5 better hooks do"', () => {
    const intent = parseCommand("Is post ke 5 better hooks do.");
    expect(intent.kind).toBe("more_hooks");
    if (intent.kind !== "more_hooks") return;
    expect(intent.count).toBe(5);
  });

  it('understands "Is caption ko aur simple Hindi mein karo"', () => {
    const intent = parseCommand("Is caption ko aur simple Hindi mein karo.");
    expect(intent.kind).toBe("simplify");
    if (intent.kind !== "simplify") return;
    expect(intent.language).toBe("hindi");
  });

  it('understands "Is design ko carousel mein convert karo"', () => {
    const intent = parseCommand("Is design ko carousel mein convert karo.");
    expect(intent.kind).toBe("convert_format");
    if (intent.kind !== "convert_format") return;
    expect(intent.format).toBe("CAROUSEL");
  });

  it('understands "Last month ke winners analyse karo"', () => {
    const intent = parseCommand("Last month ke winners analyse karo.");
    expect(intent.kind).toBe("analyse");
    if (intent.kind !== "analyse") return;
    expect(intent.period).toBe("month");
  });

  it("understands a calendar request in either language", () => {
    expect(parseCommand("Next week's content calendar banao.").kind).toBe("calendar");
    expect(parseCommand("Agle hafte ka schedule bana do").kind).toBe("calendar");
  });

  it("understands a request for one platform's version", () => {
    const intent = parseCommand("Instagram ka version banao");
    expect(intent.kind).toBe("platform_version");
    if (intent.kind !== "platform_version") return;
    expect(intent.platform).toBe("INSTAGRAM");
  });
});

describe("reading the numbers people actually type", () => {
  it("reads Devanagari digits", () => {
    expect(normalizeCommand("५ ideas do")).toContain("5");
    const intent = parseCommand("५ ideas do");
    expect(intent.kind).toBe("generate_ideas");
    if (intent.kind !== "generate_ideas") return;
    expect(intent.count).toBe(5);
  });

  it("caps a silly number rather than mining two hundred ideas", () => {
    const intent = parseCommand("99 ideas do");
    expect(intent.kind).toBe("generate_ideas");
    if (intent.kind !== "generate_ideas") return;
    expect(intent.count).toBeLessThanOrEqual(20);
  });
});

describe("when it does not understand", () => {
  it("says so rather than guessing at an action", () => {
    // Guessing wrong here means running a pipeline nobody asked for.
    expect(parseCommand("aaj mausam kaisa hai").kind).toBe("unknown");
  });

  it("handles an empty message", () => {
    expect(parseCommand("").kind).toBe("unknown");
    expect(parseCommand("   ").kind).toBe("unknown");
  });

  it("keeps the original text so the model can be asked instead", () => {
    const intent = parseCommand("kuch alag sa karo");
    expect(intent.kind).toBe("unknown");
    if (intent.kind !== "unknown") return;
    expect(intent.text).toBe("kuch alag sa karo");
  });
});
