import React, { useMemo, useState } from "react";
import { Languages } from "lucide-react";
import { getLanguage, t } from "../i18n";
import { canTranslate, detectLanguage, targetFor, translateText } from "./index";
import "./TranslatableText.css";

/**
 * A piece of text a member wrote, with a "Translate" button when it is in a language the
 * reader may want it translated out of. Public text only (posts, comments, requests): never
 * use this for private messages, because the text may be sent to an online translator.
 *
 *   <TranslatableText text={maskContactInfo(post.content)} />
 *
 * The button only appears when the text is clearly English or Afrikaans and differs from the
 * reader's language. Text in Oshiwambo or Otjiherero, or too short to tell, is shown as it
 * is, with no button, rather than offering a translation that would be nonsense.
 */
export default function TranslatableText({ text, as: Tag = "p", className = "" }) {
  const [state, setState] = useState({ phase: "idle", result: "", showing: "original", error: "" });
  const reader = getLanguage();
  const source = useMemo(() => detectLanguage(text), [text]);
  const target = targetFor(reader);
  const offer = String(text || "").trim().length >= 12 && canTranslate(source, target);

  const translate = async () => {
    setState((s) => ({ ...s, phase: "working", error: "" }));
    try {
      const result = await translateText(text, source, target);
      setState({ phase: "done", result, showing: "translated", error: "" });
    } catch (error) {
      const code = error && error.code === "limit" ? "limit" : error && error.code === "unavailable" ? "unavailable" : "failed";
      setState((s) => ({ ...s, phase: "idle", error: t(`translate.${code}`) }));
    }
  };

  const translated = state.phase === "done" && state.showing === "translated";

  return (
    <>
      <Tag className={className} lang={translated ? target : source || undefined}>
        {translated ? state.result : text}
      </Tag>
      {offer && (
        <div className="aaf-translate">
          {state.phase === "done" ? (
            <>
              {translated && <span className="aaf-translate-note">{t("translate.note", { from: t(`language.name.${source}`) })}</span>}
              <button type="button" onClick={() => setState((s) => ({ ...s, showing: translated ? "original" : "translated" }))}>
                {translated ? t("translate.showOriginal") : t("translate.showTranslation")}
              </button>
            </>
          ) : (
            <button type="button" onClick={translate} disabled={state.phase === "working"}>
              <Languages size={13} aria-hidden="true" /> {state.phase === "working" ? t("translate.working") : t("translate.button")}
            </button>
          )}
          {state.error && (
            <span className="aaf-translate-error" role="status">
              {state.error}
            </span>
          )}
        </div>
      )}
    </>
  );
}
