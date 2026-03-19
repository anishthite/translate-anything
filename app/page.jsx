"use client";

import { useCompletion } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGE_OPTIONS } from "../lib/languages";

const TARGET_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter(
  (language) => language.code !== "auto"
);

const SOURCE_FEATURED_LANGUAGES = ["Detect language", "English", "Spanish"];
const TARGET_FEATURED_LANGUAGES = ["English", "Spanish"];

const CUSTOM_PRESETS = [
  { label: "Kirby", tone: "mascot" },
  { label: "Garry Tan", tone: "person" },
  { label: "Shakespeare on espresso", tone: "writer" },
  { label: "Pirate with startup ideas", tone: "oddity" },
  { label: "Stereotypical Italian man", tone: "stereotype" },
  { label: "Medieval king issuing a decree", tone: "persona" },
  { label: "Oscar acceptance speech", tone: "performance" },
  { label: "Your friend who just got into crypto", tone: "archetype" },
  { label: "Sentient toaster", tone: "object" },
  { label: "Microwave with strong opinions", tone: "object" },
  { label: "Corporate lawyer trying to be cool", tone: "archetype" },
  { label: "Sleepy barista at 6 a.m.", tone: "oddly specific" },
  { label: "Luxury real estate agent", tone: "persona" },
  { label: "Unreasonably confident pelican", tone: "creature" },
  { label: "Group chat instigator", tone: "archetype" },
  { label: "Haunted customer support email", tone: "format" },
  { label: "Villain explaining the master plan", tone: "persona" },
  { label: "Overcaffeinated teaching assistant", tone: "oddly specific" },
  { label: "Meditation app voiceover", tone: "voice" },
  { label: "A cast-iron pan that remembers everything", tone: "object" }
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
  const blurTimeoutRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const normalized = value.trim().toLowerCase();
    const baseOptions = options
      .filter((option) => {
        if (!allowAuto && option.code === "auto") {
          return false;
        }

        return normalized
          ? option.label.toLowerCase().includes(normalized)
          : true;
      })
      .map((option) => ({
        key: option.code,
        label: option.label,
        tone: "language"
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
        if (!normalized) {
          return true;
        }

        return option.label.toLowerCase().includes(normalized);
      })
      .map((option) => ({
        key: `preset-${option.label}`,
        label: option.label,
        tone: option.tone
      }));

    const curatedLanguageOptions = normalized
      ? baseOptions
      : [
          ...(currentLanguageOption
            ? [
                {
                  key: currentLanguageOption.code,
                  label: currentLanguageOption.label,
                  tone: "language"
                }
              ]
            : []),
          ...featuredLanguageOptions
        ];

    const seen = new Set();

    return [...curatedLanguageOptions, ...presetOptions].filter((option) => {
      const dedupeKey = option.label.toLowerCase();

      if (seen.has(dedupeKey)) {
        return false;
      }

      seen.add(dedupeKey);
      return true;
    });
  }, [allowAuto, extraOptions, featuredLanguages, options, value]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="language-control">
      <span className="language-inline-label">{label}</span>

      <div className="language-combobox">
        <input
          id={id}
          className="language-input"
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (blurTimeoutRef.current) {
              window.clearTimeout(blurTimeoutRef.current);
            }

            setIsOpen(true);
          }}
          onBlur={() => {
            blurTimeoutRef.current = window.setTimeout(() => {
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
                className="language-menu-item"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  onChange(option.label);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                <span className="language-menu-tone">{option.tone}</span>
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
  const [targetInput, setTargetInput] = useState("Italian");
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
  const lastAutoRequestRef = useRef("");

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
    const trimmedText = sourceText.trim();
    const autoRequestKey = [
      trimmedText,
      resolvedSource ? `${resolvedSource.kind}:${resolvedSource.value}` : "auto",
      resolvedTarget ? `${resolvedTarget.kind}:${resolvedTarget.value}` : ""
    ].join("::");

    if (!trimmedText) {
      lastAutoRequestRef.current = "";
      stopRef.current();
      setCompletionRef.current("");
      setStatus(createStatus("Ready when you are."));
      return;
    }

    if (autoRequestKey === lastAutoRequestRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastAutoRequestRef.current = autoRequestKey;
      void requestTranslation();
    }, 520);

    return () => {
      window.clearTimeout(timer);
    };
  }, [requestTranslation, resolvedSource, resolvedTarget, sourceText]);

  useEffect(() => {
    if (isLoading) {
      setStatus(createStatus("Streaming from Bedrock...", "neutral"));
    }
  }, [isLoading]);

  const handleSwap = () => {
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
            <h1 className="toolbar-brand">Translate Anything</h1>
            <p className="toolbar-subtitle">
              Translate between <em>any</em> language
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
          <article className="panel-card input-card">
            <textarea
              id="sourceText"
              className="source-textarea"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="Enter text"
              spellCheck="true"
            />
          </article>

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
