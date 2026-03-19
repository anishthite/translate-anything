"use client";

import { useCompletion } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGE_OPTIONS } from "../lib/languages";

const TARGET_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter(
  (language) => language.code !== "auto"
);

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
  value,
  onChange,
  options,
  placeholder,
  allowAuto = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const blurTimeoutRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const normalized = value.trim().toLowerCase();

    return options
      .filter((option) => {
        if (!allowAuto && option.code === "auto") {
          return false;
        }

        if (!normalized) {
          return true;
        }

        return option.label.toLowerCase().includes(normalized);
      })
      .slice(0, 9);
  }, [allowAuto, options, value]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  return (
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
              key={option.code}
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
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
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
  const canSwap = Boolean(
    resolvedTarget &&
      resolvedTarget.kind === "language" &&
      resolvedSource &&
      resolvedSource.kind === "language" &&
      resolvedSource.value !== "auto"
  );

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
        setStatus(createStatus("Choose a target language.", "warning"));
        return;
      }

      if (
        resolvedSource &&
        resolvedSource.kind === "language" &&
        resolvedSource.value !== "auto" &&
        resolvedTarget.kind === "language" &&
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
          sourceLanguage: resolvedSource ? resolvedSource.value : "auto",
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
      resolvedSource ? resolvedSource.value : "auto",
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
    if (
      !resolvedSource ||
      !resolvedTarget ||
      resolvedSource.kind !== "language" ||
      resolvedTarget.kind !== "language" ||
      resolvedSource.value === "auto"
    ) {
      return;
    }

    setSourceInput(resolvedTarget.label);
    setTargetInput(resolvedSource.label);

    if (hasCompletion) {
      const previousText = sourceText;
      setSourceText(completion);
      setCompletionRef.current(previousText);
    }
  };

  return (
    <main className="page-shell">
      <header className="page-header">
        <h1>Translate anything</h1>
      </header>

      <section className="translator-shell" aria-label="Translator">
        <div className="toolbar-rail">
          <div className="toolbar-group">
            <label className="toolbar-label" htmlFor="sourceLanguage">
              From
            </label>
            <LanguageCombobox
              id="sourceLanguage"
              value={sourceInput}
              onChange={setSourceInput}
              options={LANGUAGE_OPTIONS}
              placeholder="Detect language"
              allowAuto
            />
          </div>

          <button
            type="button"
            className="swap-inline-button"
            onClick={handleSwap}
            disabled={!canSwap}
            aria-label="Swap languages"
            title="Swap languages"
          >
            <SwapIcon />
          </button>

          <div className="toolbar-group toolbar-group-right">
            <label className="toolbar-label" htmlFor="targetLanguage">
              To
            </label>
            <LanguageCombobox
              id="targetLanguage"
              value={targetInput}
              onChange={setTargetInput}
              options={TARGET_LANGUAGE_OPTIONS}
              placeholder="Choose a language"
            />
          </div>
        </div>

        <div className="panel-grid">
          <article className="split-panel source-panel">
            <label className="sr-only" htmlFor="sourceText">
              Source text
            </label>
            <textarea
              id="sourceText"
              className="source-textarea"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="Start typing something..."
              spellCheck="true"
            />
          </article>

          <article className="split-panel output-panel">
            <div className={`output-stage${!hasCompletion ? " is-empty" : ""}`}>
              {hasCompletion ? (
                <div className="output-text">{completion}</div>
              ) : isLoading ? (
                <div className="output-text output-text-loading">
                  Translating...
                </div>
              ) : null}
            </div>
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
