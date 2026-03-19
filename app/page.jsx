"use client";

import { useCompletion } from "@ai-sdk/react";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGE_OPTIONS } from "../lib/languages";

const TARGET_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter(
  (language) => language.code !== "auto"
);

const SOURCE_FEATURED_LANGUAGES = ["Detect language", "English", "Spanish"];
const TARGET_FEATURED_LANGUAGES = ["English", "Spanish"];

const CUSTOM_PRESETS = [
  { label: "LinkedIn", tone: "platform" },
  { label: "Reddit", tone: "platform" },
  { label: "Facebook boomer", tone: "internet" },
  { label: "Brainrotted gen alpha", tone: "internet" },
  { label: "Unreasonably confident pelican", tone: "creature" },
  { label: "Sentient toaster", tone: "object" },
  { label: "Kirby", tone: "mascot" },
  { label: "Garry Tan", tone: "person" },
  { label: "Shakespeare on espresso", tone: "writer" },
  { label: "Pirate with startup ideas", tone: "oddity" },
  { label: "Stereotypical Italian man", tone: "stereotype" },
  { label: "Medieval king issuing a decree", tone: "persona" },
  { label: "Oscar acceptance speech", tone: "performance" },
  { label: "Your friend who just got into crypto", tone: "archetype" },
  { label: "Microwave with strong opinions", tone: "object" },
  { label: "Corporate lawyer trying to be cool", tone: "archetype" },
  { label: "Sleepy barista at 6 a.m.", tone: "oddly specific" },
  { label: "Luxury real estate agent", tone: "persona" },
  { label: "Group chat instigator", tone: "archetype" },
  { label: "Haunted customer support email", tone: "format" },
  { label: "Villain explaining the master plan", tone: "persona" },
  { label: "Overcaffeinated teaching assistant", tone: "oddly specific" },
  { label: "Meditation app voiceover", tone: "voice" },
  { label: "A cast-iron pan that remembers everything", tone: "object" }
];

const AUTO_WRITE_SNIPPETS = [
  "I think the toaster is quietly judging me.",
  "This meeting could have been a suspiciously short email.",
  "The pelican knows something we don't.",
  "I am trying to stay calm, but the vibes are complicated.",
  "Please rewrite this like a villain revealing the master plan.",
  "Nobody prepared me for how weird today was going to be."
];

function createStatus(text, tone = "neutral") {
  return { text, tone };
}

function resolveLanguageInput(value, { allowAuto = false } = {}) {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return allowAuto
      ? { kind: "language", label: "Detect language", value: "auto" }
      : null;
  }

  if (allowAuto && normalized === "detect language") {
    return { kind: "language", label: "Detect language", value: "auto" };
  }

  const match = LANGUAGE_OPTIONS.find((language) => {
    if (!allowAuto && language.code === "auto") {
      return false;
    }

    return (
      language.code.toLowerCase() === normalized ||
      language.label.toLowerCase() === normalized
    );
  });

  if (match) {
    return {
      kind: "language",
      label: match.label,
      value: match.code
    };
  }

  return {
    kind: "custom",
    label: trimmed,
    value: trimmed
  };
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M4.5 6.5L8 10l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M4 6.5h9m0 0L10.5 4M13 6.5L10.5 9M16 13.5H7m0 0L9.5 11M7 13.5L9.5 16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function AutoWriteIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M12.5 3.5l4 4m-9.75 9.25l2.95-.55a2 2 0 0 0 1.03-.55l5.72-5.72a1.5 1.5 0 0 0 0-2.12l-1.32-1.31a1.5 1.5 0 0 0-2.12 0l-5.72 5.72a2 2 0 0 0-.55 1.03L6.75 16.75zM5 4.75h1.5M4.25 7H7m8.25 6.25h1.5M13 14.75h2.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function LanguageCombobox({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  allowAuto = false,
  extraOptions = [],
  featuredLanguages = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllOnOpen, setShowAllOnOpen] = useState(false);
  const blurTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const openCombobox = useCallback(() => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
    }

    setShowAllOnOpen(true);
    setIsOpen(true);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalized = value.trim().toLowerCase();
    const shouldFilter = normalized.length > 0 && !showAllOnOpen;
    const baseOptions = options
      .filter((option) => {
        if (!allowAuto && option.code === "auto") {
          return false;
        }

        return shouldFilter
          ? option.label.toLowerCase().includes(normalized)
          : true;
      })
      .map((option) => ({
        key: option.code,
        label: option.label,
        selected: option.label.toLowerCase() === normalized
      }));

    const currentLanguageOption = options.find((option) => {
      if (!allowAuto && option.code === "auto") {
        return false;
      }

      return option.label.toLowerCase() === normalized;
    });

    const featuredLanguageOptions = featuredLanguages
      .map((featuredLabel) =>
        options.find((option) => {
          if (!allowAuto && option.code === "auto") {
            return false;
          }

          return option.label === featuredLabel;
        })
      )
      .filter(Boolean)
      .map((option) => ({
        key: option.code,
        label: option.label,
        tone: "language"
      }));

    const presetOptions = extraOptions
      .filter((option) => {
        if (!shouldFilter) {
          return true;
        }

        return option.label.toLowerCase().includes(normalized);
      })
      .map((option) => ({
        key: `preset-${option.label}`,
        label: option.label,
        selected: option.label.toLowerCase() === normalized
      }));

    const currentPresetOption = presetOptions.find(
      (option) => option.label.toLowerCase() === normalized
    );

    const curatedOptions = shouldFilter
      ? [...baseOptions, ...presetOptions]
      : [
          ...(currentLanguageOption
            ? [
                {
                  key: currentLanguageOption.code,
                  label: currentLanguageOption.label,
                  selected: true
                }
              ]
            : []),
          ...(currentPresetOption ? [currentPresetOption] : []),
          ...featuredLanguageOptions,
          ...presetOptions
        ];

    const seen = new Set();

    return curatedOptions.filter((option) => {
      const dedupeKey = option.label.toLowerCase();

      if (seen.has(dedupeKey)) {
        return false;
      }

      seen.add(dedupeKey);
      return true;
    });
  }, [allowAuto, extraOptions, featuredLanguages, options, showAllOnOpen, value]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="language-control"
      onMouseDown={(event) => {
        const target = event.target;

        if (!(target instanceof HTMLElement)) {
          return;
        }

        if (target.closest(".language-menu")) {
          return;
        }

        if (target !== inputRef.current) {
          event.preventDefault();
          inputRef.current?.focus();
        }

        openCombobox();
      }}
    >
      <div className="language-combobox">
        <input
          id={id}
          ref={inputRef}
          className="language-input"
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={label}
          onMouseDown={() => {
            openCombobox();
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setShowAllOnOpen(false);
            setIsOpen(true);
          }}
          onFocus={() => {
            openCombobox();
          }}
          onBlur={() => {
            blurTimeoutRef.current = window.setTimeout(() => {
              setShowAllOnOpen(false);
              setIsOpen(false);
            }, 120);
          }}
        />

        <span className="language-input-chevron">
          <ChevronIcon />
        </span>

        {isOpen && filteredOptions.length > 0 ? (
          <div className="language-menu" role="listbox">
            {filteredOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`language-menu-item${option.selected ? " is-selected" : ""}`}
                aria-selected={option.selected ? "true" : "false"}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  onChange(option.label);
                  setShowAllOnOpen(false);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [sourceInput, setSourceInput] = useState("Detect language");
  const [targetInput, setTargetInput] = useState("Sentient toaster");
  const [sourceText, setSourceText] = useState("");
  const [status, setStatus] = useState(createStatus("Ready when you are."));

  const resolvedSource = resolveLanguageInput(sourceInput, { allowAuto: true });
  const resolvedTarget = resolveLanguageInput(targetInput);

  const {
    completion,
    complete,
    isLoading,
    setCompletion,
    stop
  } = useCompletion({
    api: "/api/translate",
    streamProtocol: "text",
    experimental_throttle: 40,
    fetch: async (input, init) => {
      const response = await fetch(input, init);

      if (!response.ok) {
        let message = response.statusText || "Translation failed.";

        try {
          const contentType = response.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            const data = await response.json();
            message = data.error || message;
          } else {
            const text = await response.text();
            if (text) {
              message = text;
            }
          }
        } catch {
          // Keep the original error message if parsing fails.
        }

        throw new Error(message);
      }

      return response;
    },
    onFinish: () => {
      setStatus(createStatus("Translation complete.", "success"));
    },
    onError: (completionError) => {
      setStatus(
        createStatus(
          completionError.message || "Translation failed.",
          "error"
        )
      );
    }
  });

  const completeRef = useRef(complete);
  const stopRef = useRef(stop);
  const setCompletionRef = useRef(setCompletion);
  const requestTranslationRef = useRef(null);
  const debouncedRequestRef = useRef(null);
  const lastAutoRequestRef = useRef("");
  const autoWriteIndexRef = useRef(0);

  const hasCompletion = completion.trim().length > 0;

  useEffect(() => {
    completeRef.current = complete;
    stopRef.current = stop;
    setCompletionRef.current = setCompletion;
  }, [complete, setCompletion, stop]);

  const requestTranslation = useCallback(
    async ({ manual = false } = {}) => {
      const trimmedText = sourceText.trim();

      if (!trimmedText) {
        stopRef.current();
        setCompletionRef.current("");
        setStatus(createStatus("Ready when you are."));
        return;
      }

      if (!manual && trimmedText.length < 2) {
        return;
      }

      if (!resolvedTarget) {
        stopRef.current();
        setCompletionRef.current("");
        setStatus(createStatus("Choose a target.", "warning"));
        return;
      }

      if (
        resolvedSource &&
        resolvedSource.label.toLowerCase() === resolvedTarget.label.toLowerCase()
      ) {
        stopRef.current();
        setCompletionRef.current(trimmedText);
        setStatus(createStatus("Source and target already match.", "warning"));
        return;
      }

      setStatus(createStatus("Streaming from Bedrock...", "neutral"));
      stopRef.current();

      await completeRef.current(trimmedText, {
        body: {
          sourceLanguage:
            resolvedSource && resolvedSource.kind === "language"
              ? resolvedSource.value
              : "auto",
          sourceCustom:
            resolvedSource && resolvedSource.kind === "custom"
              ? resolvedSource.label
              : "",
          targetLanguage:
            resolvedTarget.kind === "language" ? resolvedTarget.value : "en",
          customTarget:
            resolvedTarget.kind === "custom" ? resolvedTarget.label : ""
        }
      });
    },
    [resolvedSource, resolvedTarget, sourceText]
  );

  useEffect(() => {
    requestTranslationRef.current = requestTranslation;
  }, [requestTranslation]);

  useEffect(() => {
    const debouncedRequest = debounce((autoRequestKey) => {
      if (autoRequestKey === lastAutoRequestRef.current) {
        return;
      }

      lastAutoRequestRef.current = autoRequestKey;
      void requestTranslationRef.current?.();
    }, 520);

    debouncedRequestRef.current = debouncedRequest;

    return () => {
      debouncedRequest.cancel();
      if (debouncedRequestRef.current === debouncedRequest) {
        debouncedRequestRef.current = null;
      }
    };
  }, []);

  const handleAutoWrite = useCallback(() => {
    const nextSnippet =
      AUTO_WRITE_SNIPPETS[
        autoWriteIndexRef.current % AUTO_WRITE_SNIPPETS.length
      ];

    autoWriteIndexRef.current += 1;
    debouncedRequestRef.current?.cancel();
    lastAutoRequestRef.current = "";
    stopRef.current();
    setCompletionRef.current("");
    setSourceText(nextSnippet);
    setStatus(createStatus("Dropped in a tiny starter.", "neutral"));
  }, []);

  useEffect(() => {
    const trimmedText = sourceText.trim();
    const autoRequestKey = [
      trimmedText,
      resolvedSource ? `${resolvedSource.kind}:${resolvedSource.value}` : "auto",
      resolvedTarget ? `${resolvedTarget.kind}:${resolvedTarget.value}` : ""
    ].join("::");

    if (!trimmedText) {
      debouncedRequestRef.current?.cancel();
      lastAutoRequestRef.current = "";
      stopRef.current();
      setCompletionRef.current("");
      setStatus(createStatus("Ready when you are."));
      return;
    }

    if (autoRequestKey === lastAutoRequestRef.current) {
      return;
    }

    debouncedRequestRef.current?.cancel();
    stopRef.current();
    debouncedRequestRef.current?.(autoRequestKey);
  }, [resolvedSource, resolvedTarget, sourceText]);

  useEffect(() => {
    if (isLoading) {
      setStatus(createStatus("Streaming from Bedrock...", "neutral"));
    }
  }, [isLoading]);

  const handleSwap = () => {
    debouncedRequestRef.current?.cancel();
    const nextSource = targetInput.trim() || "English";
    const nextTarget =
      sourceInput.trim().toLowerCase() === "detect language"
        ? "English"
        : sourceInput.trim() || "English";

    lastAutoRequestRef.current = "";
    setSourceInput(nextSource);
    setTargetInput(nextTarget);

    if (hasCompletion) {
      const previousText = sourceText;
      setSourceText(completion);
      setCompletionRef.current(previousText);
    }

    if (sourceInput.trim().toLowerCase() === "detect language") {
      setStatus(
        createStatus("Swapped. Target reset to English from auto-detect.")
      );
    }
  };

  return (
    <main className="page-shell">
      <section className="translator-shell" aria-label="Translator">
        <div className="toolbar-surface">
          <div className="toolbar-header">
            <h1 className="toolbar-brand">AnyTranslate</h1>
            <p className="toolbar-subtitle">
              Instantly translate between <em>any</em> language, real or fake
            </p>
          </div>

          <div className="language-toolbar">
            <div className="toolbar-side">
              <LanguageCombobox
                id="sourceLanguage"
                label="From"
                value={sourceInput}
                onChange={setSourceInput}
                options={LANGUAGE_OPTIONS}
                placeholder="Detect language"
                allowAuto
                extraOptions={CUSTOM_PRESETS}
                featuredLanguages={SOURCE_FEATURED_LANGUAGES}
              />
            </div>

            <button
              type="button"
              className="swap-inline-button"
              onClick={handleSwap}
              aria-label="Swap languages"
              title="Swap languages"
            >
              <SwapIcon />
            </button>

            <div className="toolbar-side">
              <LanguageCombobox
                id="targetLanguage"
                label="To"
                value={targetInput}
                onChange={setTargetInput}
                options={TARGET_LANGUAGE_OPTIONS}
                placeholder="Choose a language or type your own"
                extraOptions={CUSTOM_PRESETS}
                featuredLanguages={TARGET_FEATURED_LANGUAGES}
              />
            </div>
          </div>
        </div>

        <div className="panel-grid">
          <section className="panel-stack panel-stack-input">
            <div className="mobile-language-stack">
              <div className="mobile-language-header">
                <span className="mobile-language-label">From</span>
              </div>

              <LanguageCombobox
                id="sourceLanguageMobile"
                label="From"
                value={sourceInput}
                onChange={setSourceInput}
                options={LANGUAGE_OPTIONS}
                placeholder="Detect language"
                allowAuto
                extraOptions={CUSTOM_PRESETS}
                featuredLanguages={SOURCE_FEATURED_LANGUAGES}
              />
            </div>

            <article className="panel-card input-card">
              <textarea
                id="sourceText"
                className="source-textarea"
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="Enter text"
                spellCheck="true"
              />

              <button
                type="button"
                className="panel-autowrite"
                onClick={handleAutoWrite}
                aria-label="Insert a tiny starter line"
                data-tooltip="Insert a tiny starter line"
              >
                <AutoWriteIcon />
              </button>
            </article>
          </section>

          <section className="panel-stack panel-stack-output">
            <div className="mobile-language-stack">
              <div className="mobile-language-header">
                <span className="mobile-language-label">To</span>

                <button
                  type="button"
                  className="swap-inline-button mobile-swap-button"
                  onClick={handleSwap}
                  aria-label="Swap languages"
                  title="Swap languages"
                >
                  <SwapIcon />
                </button>
              </div>

              <LanguageCombobox
                id="targetLanguageMobile"
                label="To"
                value={targetInput}
                onChange={setTargetInput}
                options={TARGET_LANGUAGE_OPTIONS}
                placeholder="Choose a language or type your own"
                extraOptions={CUSTOM_PRESETS}
                featuredLanguages={TARGET_FEATURED_LANGUAGES}
              />
            </div>

            <article className="panel-card output-card">
              {hasCompletion ? (
                <div className="output-text">{completion}</div>
              ) : isLoading ? (
                <div className="output-text output-text-loading">
                  Translating...
                </div>
              ) : (
                <div className="output-placeholder">Translation</div>
              )}
            </article>
          </section>
        </div>
      </section>

      {status.tone === "error" || status.tone === "warning" ? (
        <p className="status-banner" data-tone={status.tone}>
          {status.text}
        </p>
      ) : null}
    </main>
  );
}
