// The backend answers errors with a code and an English message: { error: "sold_out", message: "..." }.
// The words people see come from the language files (server.<code>), so a buyer reading
// Afrikaans is not told off in English. The server's own message is the fallback for codes
// this file does not know. Values the text needs (a seller's name, a limit) travel in `params`.

import { t, hasKey } from "./i18n";

const known = (code) => hasKey("en", `server.${code}`) || hasKey("en", `server.${code}_other`);

export function serverMessage(data, fallback = "") {
  const code = data && typeof data.error === "string" ? data.error : "";
  if (code && known(code)) {
    const params = data.params && typeof data.params === "object" ? data.params : {};
    // "{name} hasn't set up payouts" needs a name; without one there is a variant that does not
    const key = !params.name && hasKey("en", `server.${code}.anon`) ? `server.${code}.anon` : `server.${code}`;
    return t(key, params);
  }
  return (data && typeof data.message === "string" && data.message) || fallback;
}
