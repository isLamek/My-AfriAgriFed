// The text of the legal pages. Written to match what the app actually does;
// if a feature changes (what we collect, who we share it with, fees), change
// the matching section here and LEGAL_UPDATED in business.js.
//
// These are a sound starting point, not legal advice: have them reviewed by a
// Namibian legal practitioner before a commercial launch.

import { BUSINESS } from "./business";

const contact = `${BUSINESS.email} or ${BUSINESS.phone}`;

export const LEGAL_PAGES = {
  privacy: {
    title: "Privacy policy",
    intro: `This policy explains what personal information ${BUSINESS.name} collects, why, who can see it, and how you can see, correct or delete it.`,
    sections: [
      {
        heading: "Who we are",
        body: [
          `${BUSINESS.name} is an online platform based in ${BUSINESS.town}, ${BUSINESS.country}, that connects agricultural producers, buyers and institutions. You can reach us at ${contact}.`,
        ],
      },
      {
        heading: "What we collect",
        list: [
          "Account details: your name, e-mail address, password (stored only as a secure hash by Google Firebase) and date of birth, which we use to confirm you are 18 or older. Gender and nationality are optional.",
          "For producer and institution accounts: the answers in the registration questionnaire and the verification documents you upload (for example an ID document, business registration and a bank statement). We use these only to verify your account.",
          "What you publish: listings, posts, comments, likes, bulk requests, pledges, research articles, training programmes and internships.",
          "Messages you send to another member about a listing, order or bulk request.",
          "Orders: what you bought or sold, the amount, the payment reference and the delivery progress. Card details are entered on Flutterwave's payment page; we never see or store card numbers.",
          "Producers only: farm locations, crops and input costs you add on the map. Only you can see these.",
          "Usage events (for example “listing created”), only if you allow analytics in the cookie banner.",
        ],
      },
      {
        heading: "Who can see what",
        list: [
          "Anyone: listings (product, price, region, seller name), promotions, bulk requests, research articles and training programmes.",
          "Signed-in members: posts and comments in the Community feed.",
          "Only the two people in a conversation can read its messages. Our administrators can read them to investigate a reported problem or fraud.",
          "A buyer and a seller see each other's name on their shared orders.",
          "Our administrators see your profile and verification documents to approve your account.",
          "We never sell your personal information.",
        ],
      },
      {
        heading: "Services that process data for us",
        list: [
          "Google Firebase (accounts, database, website hosting).",
          "Cloudinary (photos and documents you upload).",
          "Flutterwave (card payments and payouts to sellers).",
          "Open-Meteo, EUMETSAT and NASA FIRMS (weather, satellite and fire data on the map; they receive the map area you look at, not who you are).",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "We keep your account information while your account is open. Order and payment records are kept for as long as Namibian tax and accounting rules require, even after an account is deleted. Everything else is deleted when your account is deleted.",
        ],
      },
      {
        heading: "Your choices and rights",
        list: [
          "See and correct your details on your Profile page.",
          "Ask for a copy of your data, or for your account and data to be deleted, from Profile → Privacy, or by e-mail.",
          "Allow or refuse analytics at any time on the Cookie policy page.",
          "We do not send marketing e-mails. If we start, we will ask first, and every e-mail will have an unsubscribe link.",
        ],
      },
      {
        heading: "Children",
        body: ["AfriAgriFed is for people aged 18 and over. We do not knowingly collect information from children. If you believe a child has an account, tell us and we will delete it."],
      },
      {
        heading: "Changes",
        body: ["If we change this policy we will update the date at the top and, for important changes, tell you in the app."],
      },
    ],
  },

  terms: {
    title: "Terms of service",
    intro: `These terms apply when you use ${BUSINESS.name}. By creating an account you agree to them.`,
    sections: [
      {
        heading: "Who can use AfriAgriFed",
        body: [
          "You must be 18 or older and give true information about yourself and your business. Producer and institution accounts are checked by our team before they can sell or publish; we may refuse or remove an account that we cannot verify.",
        ],
      },
      {
        heading: "Our role in a sale",
        body: [
          "AfriAgriFed is a marketplace. When you buy a listing, the sale is between you and the seller. We provide the listing, take the payment through Flutterwave and pass it on to the seller.",
          "Sellers are responsible for the accuracy of their listings (description, photos, price, quantity and region), for the quality and legality of what they sell, and for collection or delivery as described in the listing.",
          "Buyers confirm receipt in Orders when the goods arrive.",
        ],
      },
      {
        heading: "Prices and fees",
        list: [
          "Buyers pay the price shown on the listing, in Namibian dollars. AfriAgriFed adds no fee at checkout.",
          "Any delivery charge must be written in the listing; it is paid to the seller as agreed between you.",
          "Sellers pay a commission of 5% of each sale, deducted before the payout. There is no fee to list a product.",
          "Promotions cost N$30 per working day, shown before you pay.",
          "Data and Statistics pages are free for registered members. Visitors without an account can pay N$5 per page, or verify as a student for free access.",
        ],
      },
      {
        heading: "What is not allowed",
        list: [
          "Fraud, scams or pretending to be someone else.",
          "Listing goods you do not have, cannot legally sell, or describing them falsely.",
          "Asking a buyer to pay outside AfriAgriFed for an item listed here.",
          "Harassment, hate speech, spam or misleading health claims in posts, comments or messages.",
          "Uploading photos or documents you do not have the right to use.",
        ],
        after: [
          "We may remove content and suspend or close accounts that break these rules, and we may report fraud to the Namibian Police.",
        ],
      },
      {
        heading: "Your content",
        body: [
          "You keep ownership of what you publish. You allow AfriAgriFed to show it on the platform for as long as it stays published.",
        ],
      },
      {
        heading: "Information on the map and data pages",
        body: [
          "Weather, satellite, fire and crop information is provided to help you plan. It comes from third-party models and satellites, can be wrong or late, and is not a guarantee. Always check local conditions before acting on it.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "We work to keep AfriAgriFed available and secure, but we cannot guarantee it will always be available or free of errors. As far as the law allows, we are not liable for losses arising from a sale between members, beyond helping to resolve it under our Refund policy.",
        ],
      },
      {
        heading: "Closing your account",
        body: ["You can ask us to delete your account at any time from your Profile. We may close accounts that break these terms."],
      },
      {
        heading: "Law",
        body: ["These terms are governed by the laws of the Republic of Namibia."],
      },
      {
        heading: "Contact",
        body: [`Questions about these terms: ${contact}.`],
      },
    ],
  },

  refunds: {
    title: "Refund and cancellation policy",
    intro: "How refunds work for Marketplace orders, promotions and paid page access.",
    sections: [
      {
        heading: "Marketplace orders",
        list: [
          "Seller can't supply: if a seller cannot fill your order (for example it sold out before your payment arrived), you can choose a partial delivery agreed with the seller, or a full refund.",
          "Not delivered: if your order has not arrived by the date agreed with the seller, message the seller first. If it is not resolved, e-mail us.",
          "Not as described: if the goods are significantly different from the listing, or spoiled on arrival, tell us within 48 hours of receiving them, with photos.",
          "Changed your mind: a seller may agree to cancel an order that has not been dispatched. Fresh produce cannot be returned once delivered.",
        ],
      },
      {
        heading: "How to ask for a refund",
        body: [
          `E-mail ${BUSINESS.email} with your order's payment reference (shown on the order in Orders) and what went wrong. We will look at the order history and the messages between you and the seller, and reply by e-mail with our decision.`,
          "Approved refunds are paid back to the card or account you paid with, through Flutterwave. How long it takes to appear depends on your bank.",
        ],
      },
      {
        heading: "Promotions",
        body: [`To cancel a promotion for a full refund, e-mail ${BUSINESS.email} before its start date. Once it has started it is not refundable.`],
      },
      {
        heading: "Paid page access",
        body: ["The N$5 page access fee is not refundable once the page has been unlocked, unless the page was unavailable because of a fault on our side."],
      },
    ],
  },

  cookies: {
    title: "Cookie policy",
    intro: "AfriAgriFed does not use advertising cookies or third-party trackers. This page lists what we store in your browser and why.",
    sections: [
      {
        heading: "Essential (always on)",
        list: [
          "Sign-in: Google Firebase keeps you signed in. Without it you would have to sign in on every page.",
          "Preferences: whether the sidebar is open, and your cookie choice.",
          "Map data: recent weather and satellite data is kept for a short time so the map loads faster and uses less mobile data.",
        ],
      },
      {
        heading: "Analytics (only if you allow it)",
        body: [
          "If you choose “Allow analytics”, we record simple events such as “listing created” or “post shared”, linked to your account but not to your e-mail address. We use them only to understand which features are used and to improve them. They are never shared or used for advertising.",
        ],
      },
    ],
  },
};
