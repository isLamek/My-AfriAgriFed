import React from "react";
import { t } from "./core";

/**
 * Like t(), but the placeholders can be React elements, so a sentence with a
 * link keeps its word order in every language:
 *
 *   "register.agree": "I agree to the {terms} and the {privacy}."
 *   tRich("register.agree", { terms: <Link to="/terms">Terms</Link>, privacy: <Link ...> })
 *
 * The text around a placeholder comes from t(); element values are placed
 * where the placeholder is. Plain values (strings, numbers) work too.
 */
export function tRich(key, vars = {}) {
  // Look the text up with the placeholders left in, then split around them.
  const placeholders = {};
  Object.keys(vars).forEach((name) => {
    placeholders[name] = `{${name}}`;
  });
  const text = t(key, placeholders);
  const parts = text.split(/(\{\w+\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\{(\w+)\}$/.exec(part);
        if (m && Object.prototype.hasOwnProperty.call(vars, m[1])) {
          const value = vars[m[1]];
          return React.isValidElement(value) ? React.cloneElement(value, { key: i }) : <React.Fragment key={i}>{value}</React.Fragment>;
        }
        return part ? <React.Fragment key={i}>{part}</React.Fragment> : null;
      })}
    </>
  );
}
