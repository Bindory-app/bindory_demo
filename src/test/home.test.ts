import { describe, expect, it } from "vitest";
import { memoryPromptKey, memoryQuestion, progressTo } from "@/lib/home-content";

describe("Home memory prompts", () => {
  it("rotates daily through three questions then repeats", () => {
    const questions = [0, 1, 2, 3].map(offset => memoryQuestion(new Date(2026, 10, 15 + offset)));
    expect(new Set(questions.slice(0, 3)).size).toBe(3);
    expect(questions[3]).toBe(questions[0]);
  });
  it("uses one daily dismissal key per collector, including across year boundaries", () => {
    expect(memoryPromptKey(new Date(2026, 10, 15, 8), "collector")).toBe(memoryPromptKey(new Date(2026, 10, 15, 23), "collector"));
    expect(memoryPromptKey(new Date(2026, 11, 31), "collector")).not.toBe(memoryPromptKey(new Date(2027, 0, 1), "collector"));
  });
});
describe("Collection progress", () => {
  it("shows 8 remaining when 12 artworks are collected toward 20", () => {
    expect(progressTo(12, 20)).toEqual({ count: 12, remaining: 8, percent: 60 });
  });
});