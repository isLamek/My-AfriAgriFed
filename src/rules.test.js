/**
 * @jest-environment node
 */
// Guard tests for the security rules. They cannot run the rules (that needs the
// Firebase emulator), but they read the rule files and fail if a protection that
// was put in on purpose is removed or loosened by a later edit.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const firestore = fs.readFileSync(path.join(root, "firestore.rules"), "utf8").replace(/\r\n/g, "\n");
const rtdb = JSON.parse(fs.readFileSync(path.join(root, "database.rules.json"), "utf8")).rules;

/** The text of one `match /name/{...} { ... }` block, found by counting braces. */
function block(source, header) {
  const start = source.indexOf(header);
  if (start < 0) throw new Error(`rule block not found: ${header}`);
  const open = source.indexOf("{", source.indexOf("}", start) > start && source.slice(start).startsWith("function") ? start : source.indexOf("{", start + header.length - 1));
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unbalanced block: ${header}`);
}

describe("firestore.rules: money and orders", () => {
  it("only the server creates orders", () => {
    expect(block(firestore, "match /orders/{id}")).toMatch(/allow create: if false;/);
  });
  it("browsers never touch the server's payment records", () => {
    expect(block(firestore, "match /payments/{id}")).toMatch(/allow read, write: if false;/);
  });
  it("paid page-access flags cannot be written by the visitor", () => {
    const b = block(firestore, "match /pageAccess/{uid}");
    expect(b).toMatch(/hasOnly\(\['studentVerified', 'studentCardUrl', 'verifiedAt'\]\)/);
    expect(b).not.toMatch(/allow create, update: if signedIn\(\) && request\.auth\.uid == uid;/);
  });
  it("an owner cannot mark their own promotion as paid or active", () => {
    const b = block(firestore, "match /promotions/{id}");
    expect(b).toMatch(/'status', 'paidAmount', 'transactionId'/);
    expect(b).toMatch(/status == 'pending_payment'/);
  });
});

describe("firestore.rules: accounts and admins", () => {
  it("nobody can approve themselves", () => {
    const b = block(firestore, "match /users/{uid}");
    expect(b).toMatch(/get\('approved', false\) != true/); // new profiles start unapproved
    expect(b).toMatch(/hasAny\(\['approved', 'status', 'accountStatus', 'userType'/); // owners cannot change them
    expect(b).toMatch(/'adminReview'\]\)/); // nor forge the "an admin reviewed this" stamp
    expect(b).toMatch(/!\('adminReview' in request\.resource\.data\)/);
    expect(b).not.toMatch(/allow read, update: if signedIn\(\) && \(request\.auth\.uid == uid \|\| isSignedInAdmin\(\)\);/);
  });
  it("admin rights need a verified e-mail address", () => {
    expect(block(firestore, "function isSignedInAdmin()")).toMatch(/emailVerified\(\)/);
    expect(block(firestore, "function isSignedInFounder()")).toMatch(/emailVerified\(\)/);
    expect(firestore).toMatch(/request\.auth\.token\.email_verified == true/);
    expect(block(firestore, "match /admins/{email}")).toMatch(/&& emailVerified\(\)/);
  });
  it("only approved farmers can create marketplace listings", () => {
    expect(block(firestore, "match /marketPrices/{id}")).toMatch(/allow create: if signedIn\(\) && isApprovedFarmer\(\)/);
  });
  it("notifications are shape-checked and can only be marked read", () => {
    const b = block(firestore, "match /notifications/{id}");
    expect(b).toMatch(/hasOnly\(\['userId', 'title', 'body', 'link', 'read', 'createdAt'\]\)/);
    expect(b).toMatch(/affectedKeys\(\)\.hasOnly\(\['read'\]\)/);
  });
  it("analytics events need a sign-in and your own uid", () => {
    const b = block(firestore, "match /telemetry/{id}");
    expect(b).toMatch(/allow create: if signedIn\(\)/);
    expect(b).toMatch(/uid == request\.auth\.uid/);
    expect(b).not.toMatch(/allow create: if true;/);
  });
  it("nothing is open to everyone for writing", () => {
    expect(firestore).not.toMatch(/allow [a-z, ]*write[a-z, ]*: if true;/);
    expect(firestore).not.toMatch(/allow (create|update|delete)[a-z, ]*: if true;/);
  });
});

describe("database.rules.json: community posts", () => {
  const post = rtdb.posts.$postId;
  const comment = post.comments.$commentId;
  const reply = comment.replies.$replyId;

  it("nothing is writable by everyone", () => {
    const open = [];
    (function walk(o, p) {
      for (const [k, v] of Object.entries(o)) {
        if ((k === ".write" || k === ".read") && (v === true || v === "true")) open.push(`${p}/${k}`);
        else if (v && typeof v === "object") walk(v, `${p}/${k}`);
      }
    })(rtdb, "");
    expect(open).toEqual([]); // every read and write needs at least a sign-in
  });
  it("posts, comments and replies can only be created as yourself", () => {
    for (const node of [post, comment, reply]) {
      expect(node.userId[".validate"]).toMatch(/newData\.val\(\) === auth\.uid/);
      expect(node.userId[".validate"]).toMatch(/newData\.val\(\) === data\.val\(\)/); // and the author cannot be swapped later
    }
  });
  it("only the author can change or delete a post, comment or reply", () => {
    for (const node of [post, comment, reply]) {
      expect(node[".write"]).toMatch(/!data\.exists\(\) \|\| data\.child\('userId'\)\.val\(\) === auth\.uid/);
    }
  });
  it("unknown extra fields are rejected", () => {
    for (const node of [post, comment, reply]) expect(node.$other[".validate"]).toBe(false);
  });
  it("text and sizes are limited", () => {
    expect(post.content[".validate"]).toMatch(/length <= 1000/);
    expect(comment.text[".validate"]).toMatch(/length <= 500/);
    expect(reply.text[".validate"]).toMatch(/length <= 500/);
    for (const node of [post, comment, reply]) expect(node.createdAt[".validate"]).toMatch(/now \+ /); // no far-future dates to pin a post on top
  });
  it("post pictures can only come from our image host", () => {
    expect(post.imageUrl[".validate"]).toMatch(/beginsWith\('https:\/\/res\.cloudinary\.com\/'\)/);
  });
  it("a like can only be your own and can only be 'true'", () => {
    expect(post.likes.$uid[".write"]).toMatch(/auth\.uid === \$uid/);
    expect(post.likes.$uid[".validate"]).toMatch(/newData\.val\(\) === true/);
  });
  it("existing verification applications cannot be overwritten or deleted", () => {
    expect(rtdb.farmerVerification.$applicationId[".write"]).toMatch(/!data\.exists\(\)/);
  });
});

describe("firestore.rules: private messages", () => {
  const conversations = () => block(firestore, "match /conversations/{id}");
  it("a thread must be about a real listing, order or bulk request with that counterpart", () => {
    expect(block(firestore, "function validConversation(d)")).toMatch(/conversationTopicOk\(d\)/);
    expect(block(firestore, "function conversationTopicOk(d)")).toMatch(/marketPrices\/\$\(d\.topic\.id\)\)\.data\.sellerId == other/);
  });
  it("messages can never be edited or deleted, and are sent as yourself", () => {
    const b = conversations();
    expect(b).toMatch(/allow update, delete: if false;/);
    expect(b).toMatch(/senderId == request\.auth\.uid/);
  });
  it("you can only move your own read marker", () => {
    expect(conversations()).toMatch(/readAt\.diff\(resource\.data\.get\('readAt', \{\}\)\)\.affectedKeys\(\)\.hasOnly\(\[request\.auth\.uid\]\)/);
  });
});
