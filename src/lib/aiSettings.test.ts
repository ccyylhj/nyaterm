import { describe, expect, it } from "vitest";
import {
  BUILTIN_PROVIDERS,
  credentialExtraHeaders,
  DEFAULT_AI_SETTINGS,
  duplicateAiHttpHeaderNames,
  isValidAiHttpHeaderName,
  localizeDefaultAiAction,
  newAiHttpHeader,
  normalizeAiHttpHeaders,
} from "./aiSettings";

describe("aiSettings Ollama defaults", () => {
  it("uses the Ollama native API root instead of the OpenAI-compatible v1 path", () => {
    expect(BUILTIN_PROVIDERS.ollama?.defaultBaseUrl).toBe("http://localhost:11434/");

    const profile = DEFAULT_AI_SETTINGS.provider_profiles.find((item) => item.id === "ollama");
    const credential = DEFAULT_AI_SETTINGS.provider_credentials.find(
      (item) => item.id === "ollama",
    );

    expect(profile?.base_url).toBe("http://localhost:11434/");
    expect(credential?.base_url).toBe("http://localhost:11434/");
  });
});

describe("built-in agent custom instructions", () => {
  it("defaults to empty instructions", () => {
    expect(DEFAULT_AI_SETTINGS.agent_custom_instructions).toBe("");
  });
});

describe("External MCP defaults", () => {
  it("starts disabled with confirm-scoped persistent storage", () => {
    expect(DEFAULT_AI_SETTINGS.external_mcp).toEqual({
      enabled: false,
      permission_mode: "confirm",
      session_scope: "current_window",
      terminal_display_mode: "inline",
    });
  });

  describe("default AI action localization", () => {
    const translate = (key: string) => `[${key}]`;

    it("localizes built-in terminal and file actions", () => {
      expect(
        localizeDefaultAiAction(
          {
            id: "explain-selected",
            name: "解释选中内容",
            prompt: "请解释终端中选中的内容，指出含义、可能原因和下一步建议。",
            enabled: true,
          },
          translate,
        ),
      ).toEqual({
        id: "explain-selected",
        name: "[ai.defaultActions.explainSelectedName]",
        prompt: "[ai.defaultActions.explainSelectedPrompt]",
        enabled: true,
      });

      expect(
        localizeDefaultAiAction(
          {
            id: "summarize-file",
            name: "总结文件",
            prompt: "请总结选中文件的主要内容、关键风险和建议操作。",
            enabled: true,
          },
          translate,
        ),
      ).toEqual({
        id: "summarize-file",
        name: "[ai.defaultActions.summarizeFileName]",
        prompt: "[ai.defaultActions.summarizeFilePrompt]",
        enabled: true,
      });
    });

    it("preserves custom actions and edited built-in fields", () => {
      const customAction = {
        id: "my-action",
        name: "My action",
        prompt: "My prompt",
        enabled: true,
      };
      expect(localizeDefaultAiAction(customAction, translate)).toBe(customAction);

      expect(
        localizeDefaultAiAction(
          {
            id: "explain-selected",
            name: "My custom name",
            prompt: "请解释终端中选中的内容，指出含义、可能原因和下一步建议。",
            enabled: true,
          },
          translate,
        ),
      ).toEqual({
        id: "explain-selected",
        name: "My custom name",
        prompt: "[ai.defaultActions.explainSelectedPrompt]",
        enabled: true,
      });
    });
  });
});

describe("custom AI request headers", () => {
  it("creates headers with unique ids", () => {
    const first = newAiHttpHeader();
    const second = newAiHttpHeader();
    expect(first.id).not.toBe("");
    expect(first.id).not.toBe(second.id);
    expect(first).toEqual({ id: first.id, name: "", value: "" });
  });

  it("validates header names", () => {
    expect(isValidAiHttpHeaderName("X-Custom-Token")).toBe(true);
    expect(isValidAiHttpHeaderName("authorization")).toBe(true);
    expect(isValidAiHttpHeaderName("  X-Foo  ")).toBe(true);
    expect(isValidAiHttpHeaderName("")).toBe(false);
    expect(isValidAiHttpHeaderName("   ")).toBe(false);
    expect(isValidAiHttpHeaderName("not a header")).toBe(false);
    expect(isValidAiHttpHeaderName("X-Foo:bar")).toBe(false);
    expect(isValidAiHttpHeaderName("X-Foo\r\nbar")).toBe(false);
  });

  it("normalizes rows by trimming, dropping blanks, and deduping last-wins", () => {
    expect(
      normalizeAiHttpHeaders([
        { id: "a", name: "  X-Foo  ", value: "  one  " },
        { id: "b", name: "x-foo", value: "two" },
        { id: "c", name: "", value: "dropped" },
        { id: "d", name: "X-Empty", value: "" },
        { id: "e", name: "not a header", value: "dropped" },
      ]),
    ).toEqual([{ id: "b", name: "x-foo", value: "two" }]);
  });

  it("detects duplicate names case-insensitively", () => {
    expect(
      duplicateAiHttpHeaderNames([
        { id: "a", name: "X-Foo", value: "1" },
        { id: "b", name: "x-foo", value: "2" },
        { id: "c", name: "X-Bar", value: "3" },
      ]),
    ).toEqual(new Set(["a", "b"]));
    expect(duplicateAiHttpHeaderNames([{ id: "a", name: "X-Foo", value: "1" }])).toEqual(new Set());
  });

  it("reads headers from credentials with legacy shapes", () => {
    expect(credentialExtraHeaders(null)).toEqual([]);
    expect(credentialExtraHeaders({})).toEqual([]);
    expect(
      credentialExtraHeaders({
        extra_headers: [{ id: "h", name: "X-Foo", value: "bar" }],
      }),
    ).toEqual([{ id: "h", name: "X-Foo", value: "bar" }]);
  });
});
