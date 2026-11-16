// An error the server turns into a normal answer for the website:
//   { error: "<code>", message: "<English text>", params?: { ... } }
// The website says it in the reader's language from the code and the params
// (src/serverMessages.js, catalog keys server.<code>); the message is the English fallback.

class HttpError extends Error {
  constructor(status, code, message, params) {
    super(message);
    this.status = status;
    this.code = code;
    if (params) this.params = params; // values the text needs
  }
}

/** Express wrapper: runs an async handler and answers HttpError the way the website expects. */
const route = (handler, { log = console, tag = "server" } = {}) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.code, message: error.message, ...(error.params ? { params: error.params } : {}) });
    }
    log.error(`[${tag}]`, error);
    res.status(500).json({ error: "server_error", message: "Something went wrong on our side. Please try again." });
  }
};

module.exports = { HttpError, route };
