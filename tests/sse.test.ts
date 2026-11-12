import { describe, expect, it } from "vitest";
import { formatSseEvent, parseSseChunk, SseParser } from "@/lib/sse";

describe("parseSseChunk", () => {
  it("parses event and JSON data", () => {
    expect(parseSseChunk('event: product\ndata: {"a":1}')).toEqual({
      event: "product",
      data: { a: 1 },
    });
  });

  it("returns null without event or data, or with invalid JSON", () => {
    expect(parseSseChunk("data: {}")).toBeNull();
    expect(parseSseChunk("event: x")).toBeNull();
    expect(parseSseChunk("event: x\ndata: {nope")).toBeNull();
  });

  it("joins multi-line data and tolerates CRLF", () => {
    expect(parseSseChunk('event: e\r\ndata: {"a":\r\ndata: 2}')).toEqual({
      event: "e",
      data: { a: 2 },
    });
  });
});

describe("SseParser", () => {
  it("round-trips formatted events split at arbitrary boundaries", () => {
    const stream =
      formatSseEvent("analysis", { style: "Japandi — è" }) +
      formatSseEvent("product", { name: "Lampada" }) +
      formatSseEvent("done", {});
    for (const size of [1, 3, 7, 50, stream.length]) {
      const parser = new SseParser();
      const events = [];
      for (let i = 0; i < stream.length; i += size) {
        events.push(...parser.push(stream.slice(i, i + size)));
      }
      events.push(...parser.flush());
      expect(events.map((e) => e.event)).toEqual(["analysis", "product", "done"]);
      expect(events[0].data).toEqual({ style: "Japandi — è" });
    }
  });

  it("flushes a trailing event without terminator", () => {
    const parser = new SseParser();
    expect(parser.push('event: done\ndata: {}')).toEqual([]);
    expect(parser.flush()).toEqual([{ event: "done", data: {} }]);
  });
});
