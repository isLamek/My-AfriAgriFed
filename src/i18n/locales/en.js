// English: the source language. New text is added here first; the other languages follow (see docs/I18N.md).
// One entry per line, JSON-quoted. The comment after an entry says where it is shown.
module.exports = {
  // ---- common ----
  "common.cancel": "Cancel", // button
  "common.send": "Send", // aria-label · AIChat.js
  "common.loading": "Loading...", // p · App.js
  "common.yes": "Yes", // span · FarmerQuestionnaire.js
  "common.no": "No", // span · FarmerQuestionnaire.js
  "common.signIn": "Sign In", // button · Home.js
  "common.back": "Back", // button · InsightsFrame.js
  "common.close": "Close", // button · Internships.js
  "common.member": "Member", // shown when someone has no name
  "common.andLast": "{list} and {last}", // joins a list of things: a, b and c
  "common.orLast": "{list} or {last}", // joins a list of things: a, b or c
  "common.namibia": "Namibia", // the country's name
  // ---- aiChat ----
  "aiChat.greeting": "Hello, I am the AAF Assistant. 🙂 I can explain how AfriAgriFed works - listings, the Demand Board, orders, payments, verification - and answer practical farming questions for Namibian conditions. What do you need? 🌿", // the assistant's first message
  "aiChat.suggestSell": "How do I sell my produce here?", // suggested question for the assistant
  "aiChat.suggestOnions": "I need 200 kg of onions every month", // suggested question for the assistant
  "aiChat.suggestCharge": "What does AfriAgriFed charge?", // suggested question for the assistant
  "aiChat.suggestCrops": "Which crops suit my region?", // suggested question for the assistant
  "aiChat.unavailable": "The assistant is temporarily unavailable.", // error
  // ---- apiBase ----
  "apiBase.noBackend": "This feature is being set up and will be available soon. Please try again later.", // shown when the site's backend is not online yet
  // ---- app ----
  "app.checkingAccount": "Checking account...", // p · App.js
  "app.checkingFarmerApproval": "Checking farmer approval...", // p · App.js
  "app.checkingInstitutionApproval": "Checking institution approval...", // p · App.js
  "app.checkingAdmin": "Checking admin...", // p · App.js
  "app.verifyYourMailToOpenThe": "Verify your e-mail to open the Admin area", // title · App.js
  "app.adminAccessIsTiedToYour": "Admin access is tied to your e-mail address, so we need to confirm it is yours.", // reason · App.js
  "app.loadingTheMarketMap": "Loading the market map…", // p · App.js
  "app.loadingMap": "Loading map…", // p · App.js
  // ---- assistant ----
  "assistant.askAaf": "Ask AAF", // span · AIChat.js
  "assistant.aafAssistant": "AAF Assistant", // aria-label · AIChat.js
  "assistant.answersAboutThePlatformAndAbout": "Answers about the platform and about farming in Namibia", // p · AIChat.js
  "assistant.closeTheAafAssistant": "Close the AAF Assistant", // aria-label · AIChat.js
  "assistant.theAssistantIsTyping": "The assistant is typing", // aria-label · AIChat.js
  "assistant.yourQuestionForTheAafAssistant": "Your question for the AAF Assistant", // label · AIChat.js
  "assistant.theAssistantCannotSeeYourListings": "The assistant cannot see your listings, orders or account, and can make mistakes. For account help, contact support.", // p · AIChat.js
  "assistant.deleteThisConversation": "Delete this conversation", // title · AIChat.js
  "assistant.clearChat": "Clear chat", // button · AIChat.js
  "assistant.theAssistantDidNotReplyPlease": "The assistant did not reply. Please try again.", // error message · AIChat.js
  "assistant.openTheAafAssistant": "Open the AAF Assistant", // aria-label · AIChat.js
  "assistant.theAssistantIsNotSwitchedOn": "The assistant is not switched on yet", // placeholder · AIChat.js
  "assistant.askQuestion": "Ask a question", // placeholder · AIChat.js
  "assistant.somethingWentWrong": "Something went wrong.", // setError · AIChat.js
  // ---- authErrors ----
  "authErrors.somethingWentWrongPleaseTryAgain": "Something went wrong. Please try again.", // default text · authErrors.js
  "authErrors.wrongLogin": "That e-mail and password do not match. Check them and try again, or reset your password.", // sign-in error
  "authErrors.invalidEmail": "That does not look like a valid e-mail address.", // sign-in error
  "authErrors.userDisabled": "This account has been disabled. Please contact support.", // sign-in error
  "authErrors.tooManyRequests": "Too many attempts. Please wait a few minutes, or reset your password.", // sign-in error
  "authErrors.networkFailed": "Could not reach the server. Check your internet connection and try again.", // sign-in error
  "authErrors.emailInUse": "An account with this e-mail already exists. Try signing in instead.", // registration error
  "authErrors.weakPassword": "Choose a stronger password (at least 6 characters).", // registration error
  "authErrors.operationNotAllowed": "Signing in with e-mail is not switched on yet. Please contact support.", // sign-in error
  "authErrors.requiresRecentLogin": "For your security, please sign in again and retry.", // sign-in error
  "authErrors.permissionDenied": "We could not save that. Please try again, and contact support if it keeps happening.", // save error
  // ---- buyerForm ----
  "buyerForm.sectionPersonalBusinessInformation": "Section A: Personal & Business Information", // h2 · ConsumerQuestionnaire.js
  "buyerForm.1FullName": "1. Full Name *", // label · ConsumerQuestionnaire.js
  "buyerForm.enterYourFullName": "Enter your full name", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.2NameOfBusinessOrganizationIf": "2. Name of Business / Organization (if applicable)", // label · ConsumerQuestionnaire.js
  "buyerForm.yourBusinessOrOrganizationName": "Your business or organization name", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.3TypeOfConsumer": "3. Type of Consumer *", // label · ConsumerQuestionnaire.js
  "buyerForm.4BusinessRegistrationNumberOptional": "4. Business Registration Number (optional)", // label · ConsumerQuestionnaire.js
  "buyerForm.businessRegistrationNumber": "Business registration number", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.5PhoneNumber": "5. Phone Number *", // label · ConsumerQuestionnaire.js
  "buyerForm.264XxXxxXxxx": "+264 XX XXX XXXX", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.6EmailAddress": "6. Email Address", // label · ConsumerQuestionnaire.js
  "buyerForm.7PostalAddress": "7. Postal Address", // label · ConsumerQuestionnaire.js
  "buyerForm.yourCompletePostalAddress": "Your complete postal address", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.sectionLocationInformation": "Section B: Location Information", // h2 · ConsumerQuestionnaire.js
  "buyerForm.8Country": "8. Country *", // label · ConsumerQuestionnaire.js
  "buyerForm.egNamibia": "e.g., Namibia", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.9ProvinceRegionState": "9. Province/Region/State", // label · ConsumerQuestionnaire.js
  "buyerForm.egKhomasRegion": "e.g., Khomas Region", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.10DistrictCounty": "10. District/County", // label · ConsumerQuestionnaire.js
  "buyerForm.egWindhoekWest": "e.g., Windhoek West", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.11CityTown": "11. City/Town *", // label · ConsumerQuestionnaire.js
  "buyerForm.egWindhoek": "e.g., Windhoek", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.12DeliveryAddressCollectionPoint": "12. Delivery Address / Collection Point *", // label · ConsumerQuestionnaire.js
  "buyerForm.fullAddressForDeliveryOrCollection": "Full address for delivery or collection", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.13NameOfReceiver": "13. Name of receiver", // label · ConsumerQuestionnaire.js
  "buyerForm.personWhoReceivesDeliveries": "Person who receives deliveries", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.sectionBusinessDetails": "Section C: Business Details", // h2 · ConsumerQuestionnaire.js
  "buyerForm.thisSectionIsNotRequiredFor": "This section is not required for individual buyers.", // p · ConsumerQuestionnaire.js
  "buyerForm.skipToNextSection": "Skip to Next Section", // button · ConsumerQuestionnaire.js
  "buyerForm.14TypeOfBusinessOperation": "14. Type of Business Operation *", // label · ConsumerQuestionnaire.js
  "buyerForm.pleaseSpecify": "Please specify:", // label · ConsumerQuestionnaire.js
  "buyerForm.specifyYourBusinessType": "Specify your business type", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.specifyProduct": "Specify product:", // label · ConsumerQuestionnaire.js
  "buyerForm.egFlourMillingDairyProductsEtc": "e.g., flour milling, dairy products, etc.", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.15YearsInOperation": "15. Years in Operation", // label · ConsumerQuestionnaire.js
  "buyerForm.16AverageNumberOfCustomersServed": "16. Average Number of Customers Served Weekly (optional)", // label · ConsumerQuestionnaire.js
  "buyerForm.sectionProductInterests": "Section D: Product Interests", // h2 · ConsumerQuestionnaire.js
  "buyerForm.17ProductsYouAreInterestedIn": "17. Products you are interested in purchasing *", // label · ConsumerQuestionnaire.js
  "buyerForm.selectAllProductsYouAreInterested": "Select all products you are interested in buying:", // p · ConsumerQuestionnaire.js
  "buyerForm.18ProductPreferences": "18. Product Preferences", // label · ConsumerQuestionnaire.js
  "buyerForm.specifyPreferencesForEachSelectedProduct": "Specify preferences for each selected product:", // p · ConsumerQuestionnaire.js
  "buyerForm.preferredVarietyType": "Preferred variety/type:", // label · ConsumerQuestionnaire.js
  "buyerForm.gradeQualityPreference": "Grade/Quality preference:", // label · ConsumerQuestionnaire.js
  "buyerForm.selectQuality": "Select quality", // option · ConsumerQuestionnaire.js
  "buyerForm.standard": "Standard", // option · ConsumerQuestionnaire.js
  "buyerForm.premium": "Premium", // option · ConsumerQuestionnaire.js
  "buyerForm.organic": "Organic", // option · ConsumerQuestionnaire.js
  "buyerForm.other": "Other", // option · ConsumerQuestionnaire.js
  "buyerForm.sectionEstimatedQuantitiesRequired": "Section E: Estimated Quantities Required", // h2 · ConsumerQuestionnaire.js
  "buyerForm.19QuantityRequirements": "19. Quantity Requirements", // label · ConsumerQuestionnaire.js
  "buyerForm.specifyEstimatedQuantitiesForEachProduct": "Specify estimated quantities for each product (optional):", // p · ConsumerQuestionnaire.js
  "buyerForm.dailyRequirementIfApplicable": "Daily requirement (if applicable):", // label · ConsumerQuestionnaire.js
  "buyerForm.eg50kg": "e.g., 50kg", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.weeklyRequirement": "Weekly requirement:", // label · ConsumerQuestionnaire.js
  "buyerForm.eg200kg": "e.g., 200kg", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.monthlyRequirement": "Monthly requirement:", // label · ConsumerQuestionnaire.js
  "buyerForm.eg1000kg": "e.g., 1000kg", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.noProductsSelectedPleaseGoBack": "No products selected. Please go back to Section D to select products.", // p · ConsumerQuestionnaire.js
  "buyerForm.sectionSupplyRecurrenceTiming": "Section F: Supply Recurrence & Timing", // h2 · ConsumerQuestionnaire.js
  "buyerForm.20ExpectedOrderSizePerDelivery": "20. Expected order size per delivery", // label · ConsumerQuestionnaire.js
  "buyerForm.21HowOftenDoYouRequire": "21. How often do you require supply?", // label · ConsumerQuestionnaire.js
  "buyerForm.22PreferredDeliveryCollectionDaysCheck": "22. Preferred delivery/collection days (Check all that apply)", // label · ConsumerQuestionnaire.js
  "buyerForm.23PreferredTimeForDeliveryCollection": "23. Preferred time for delivery/collection", // label · ConsumerQuestionnaire.js
  "buyerForm.24PeakDemandPeriodsEgHolidays": "24. Peak demand periods (e.g., holidays, seasons)", // label · ConsumerQuestionnaire.js
  "buyerForm.egDecemberHolidaysEasterSummerMonths": "e.g., December holidays, Easter, summer months", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.sectionPackagingHandling": "Section G: Packaging & Handling", // h2 · ConsumerQuestionnaire.js
  "buyerForm.25PackagingPreferences": "25. Packaging preferences", // label · ConsumerQuestionnaire.js
  "buyerForm.26StorageOrHandlingRequirementsCheck": "26. Storage or handling requirements (Check all that apply)", // label · ConsumerQuestionnaire.js
  "buyerForm.sectionChallengesSupportNeeded": "Section H: Challenges & Support Needed", // h2 · ConsumerQuestionnaire.js
  "buyerForm.27WhatAreYourBiggestChallenges": "27. What are your biggest challenges when sourcing products? (Check all that apply)", // label · ConsumerQuestionnaire.js
  "buyerForm.28WhatSupportOrServicesWould": "28. What support or services would you like from the application? (Check all that apply)", // label · ConsumerQuestionnaire.js
  "buyerForm.pleaseSpecifyOtherSupportNeeded": "Please specify other support needed:", // label · ConsumerQuestionnaire.js
  "buyerForm.describeOtherSupportServicesYouNeed": "Describe other support services you need", // placeholder · ConsumerQuestionnaire.js
  "buyerForm.consumerRegistrationQuestionnaire": "Consumer Registration Questionnaire", // h1 · ConsumerQuestionnaire.js
  "buyerForm.completeAllSectionsToRegisterAs": "Complete all sections to register as a verified consumer/buyer", // p · ConsumerQuestionnaire.js
  "buyerForm.fullNameIsRequired": "Full name is required", // validation message · ConsumerQuestionnaire.js
  "buyerForm.consumerTypeIsRequired": "Consumer type is required", // validation message · ConsumerQuestionnaire.js
  "buyerForm.phoneNumberIsRequired": "Phone number is required", // validation message · ConsumerQuestionnaire.js
  "buyerForm.emailAddressIsInvalid": "Email address is invalid", // validation message · ConsumerQuestionnaire.js
  "buyerForm.countryIsRequired": "Country is required", // validation message · ConsumerQuestionnaire.js
  "buyerForm.cityTownIsRequired": "City/Town is required", // validation message · ConsumerQuestionnaire.js
  "buyerForm.deliveryAddressIsRequired": "Delivery address is required", // validation message · ConsumerQuestionnaire.js
  "buyerForm.businessOperationTypeIsRequired": "Business operation type is required", // validation message · ConsumerQuestionnaire.js
  "buyerForm.pleaseSpecifyYourBusinessType": "Please specify your business type", // validation message · ConsumerQuestionnaire.js
  "buyerForm.pleaseSelectAtLeastOneProduct": "Please select at least one product", // validation message · ConsumerQuestionnaire.js
  "buyerForm.completeRegistration": "Complete Registration", // either/or · ConsumerQuestionnaire.js
  "buyerForm.nextSection": "Next Section", // either/or · ConsumerQuestionnaire.js
  // ---- carrier ----
  "carrier.eyebrow": "Carriers", // page label
  "carrier.title": "Deliver for AfriAgriFed", // page title
  "carrier.subtitle": "Take delivery jobs with your own vehicle and earn for each one.", // page subtitle
  "carrier.loading": "Loading…",
  "carrier.apply.title": "Become a carrier", // heading
  "carrier.apply.intro": "Do you have a car, bakkie or truck? Sellers who can't deliver themselves ask us for a carrier. You choose the jobs you want, deliver them, and earn the carrier's share of the delivery fee.",
  "carrier.apply.name": "Your name", // label
  "carrier.apply.phone": "Phone number", // label
  "carrier.apply.vehicle": "Your vehicle", // label
  "carrier.apply.description": "Make and colour", // label
  "carrier.apply.descriptionExample": "White Toyota Hilux", // placeholder
  "carrier.apply.plate": "Number plate", // label
  "carrier.apply.capacity.small": "up to 40 kg", // vehicle capacity
  "carrier.apply.capacity.bakkie": "up to 1 ton", // vehicle capacity
  "carrier.apply.capacity.truck": "up to 8 tons", // vehicle capacity
  "carrier.apply.regions": "Where do you work?", // label
  "carrier.apply.regionsHelp": "Pick your regions to see only jobs that start there. Leave empty to see jobs anywhere.",
  "carrier.apply.review": "We check every application before you can take jobs. Your phone number is shown only to the seller and buyer of a job you take.",
  "carrier.apply.send": "Send my application", // button
  "carrier.apply.sent": "Application sent. We will check it and let you know.", // toast
  "carrier.apply.refused": "Your application could not be saved. Please check the details and try again.", // toast
  "carrier.pending.title": "Your application is being checked",
  "carrier.pending.text": "We are checking your details ({vehicle}). You will get a message when you can start taking jobs.",
  "carrier.suspended.title": "Your carrier account is paused",
  "carrier.suspended.text": "You can't take jobs right now. Please contact AfriAgriFed support.",
  "carrier.earned": "Earned", // label above an amount
  "carrier.goAvailable": "I'm available", // button
  "carrier.goUnavailable": "Pause: I'm not available", // button
  "carrier.unavailableNote": "You are marked as not available, so you can't take new jobs until you switch back.",
  "carrier.tab.open": "Open jobs", // tab
  "carrier.tab.mine": "My jobs", // tab
  "carrier.tab.done": "Done", // tab
  "carrier.noOpenJobs": "No open jobs for your vehicle and regions right now. You will get a notification when one appears.",
  "carrier.noActiveJobs": "You have no jobs in progress. Take one from the open jobs.",
  "carrier.noDoneJobs": "No finished jobs yet.",
  "carrier.payNote": "Your earnings are paid out by AfriAgriFed. Ask support for the payout schedule.",
  "carrier.job.take": "Take this job", // button
  "carrier.job.taken": "It's yours. Open My jobs for the addresses.", // toast
  "carrier.job.driving": "about {time} driving",
  "carrier.job.weight": "about {kg} kg",
  "carrier.job.ready": "Ready for collection {when}",
  "carrier.job.deliverOn": "deliver on {date}",
  "carrier.job.onTheRoad": "On the road", // badge
  "carrier.job.toCollect": "To collect", // badge
  "carrier.job.collectFrom": "Collect from", // small heading
  "carrier.job.deliverTo": "Deliver to", // small heading
  "carrier.job.loadingAddresses": "Loading the addresses…",
  "carrier.job.collected": "I have collected the goods", // button
  "carrier.job.pickedUpDone": "Good. The buyer can now follow you on the map.", // toast
  "carrier.job.collectHelp": "Press this only when the seller has handed the goods to you.",
  "carrier.job.release": "Give the job back", // button
  "carrier.job.released": "The job went back to the board.", // toast
  "carrier.job.sharing": "Sharing your location with the buyer.",
  "carrier.job.startingShare": "Starting location sharing…",
  "carrier.job.left": "{distance} to go",
  "carrier.job.arrived": "I have arrived", // button
  "carrier.job.arrivedSent": "The buyer has been told you are there.", // toast
  "carrier.job.deliveredOn": "Delivered {when}",
  // ---- cart ----
  "cart.eyebrow": "Your basket", // page label
  "cart.title": "Basket", // page title
  "cart.subtitle": "Items you chose, grouped by seller. Each seller is paid for separately.", // page subtitle
  "cart.loading": "Checking your basket…",
  "cart.empty": "Your basket is empty.",
  "cart.browse": "Browse the marketplace", // button
  "cart.severalSellers": "You have items from more than one seller. Each seller's items are paid for separately, so you can choose how each one reaches you.", // note above the basket
  "cart.fromSeller": "From {name}", // basket group heading
  "cart.remove": "Remove {product} from the basket", // screen reader label
  "cart.clearSeller": "Remove all", // button: empties one seller's group
  "cart.checkout": "Checkout · {amount}", // button; {amount} is the group total
  "cart.removedUnavailable_one": "1 item is no longer for sale and was removed from your basket.", // toast
  "cart.removedUnavailable_other": "{count} items are no longer for sale and were removed from your basket.", // toast
  "cart.full": "Your basket is full. Pay for something first.", // toast
  "cart.couldNotAdd": "That item can't be added to the basket right now.", // toast
  "cart.added": "{product} added to your basket.", // toast
  "cart.addedUpToStock": "Added as much {product} as the seller has.", // toast
  // ---- chat ----
  "chat.pleaseSignInFirst": "Please sign in first.", // toast.error · chat.js
  "chat.youCanStartConversationAboutThis": "You can't start a conversation about this.", // toast.error · chat.js
  // ---- checkout ----
  "checkout.eyebrow": "Almost there", // page label
  "checkout.title": "Checkout", // page title
  "checkout.subtitle": "Choose how you want to receive your order, then pay.", // page subtitle
  "checkout.yourItems": "Your items", // heading
  "checkout.fromSeller": "From {name}", // line under a heading
  "checkout.changeItems": "Change items", // link back to the basket
  "checkout.howToGetIt": "How do you want to get it?", // heading
  "checkout.checkingOptions": "Checking what is available…",
  "checkout.noWayToGetIt": "This order can't be delivered or collected right now. Message the seller to arrange it.",
  "checkout.whereToDeliver": "Where should it go?", // heading
  "checkout.whenDeliver": "When do you want it delivered?", // heading
  "checkout.whenCollect": "When will you collect it?", // heading
  "checkout.day": "Day", // label
  "checkout.asSoonAsPossible": "As soon as possible", // option
  "checkout.timeOfDay": "Time of day", // label
  "checkout.window.anytime": "Any time", // option
  "checkout.window.morning": "Morning", // option
  "checkout.window.afternoon": "Afternoon", // option
  "checkout.noteForSeller": "Note for the seller (optional)", // label
  "checkout.noteExample": "For example: please pack in two bags", // placeholder
  "checkout.summary": "Order summary", // heading
  "checkout.items": "Items", // summary line
  "checkout.delivery": "Delivery", // summary line
  "checkout.total": "Total", // summary line
  "checkout.opening": "Opening payment…", // button while loading
  "checkout.pay": "Pay {amount}", // button
  "checkout.codeNote": "After you pay, your order shows a 6-digit handover code. Give it only to the person who hands you your order.", // note
  // ---- cloudinary ----
  "cloudinary.describeImage": "a JPG, PNG, WebP or GIF photo", // in: Please upload {what}
  "cloudinary.describeDocument": "a PDF, Word document, JPG or PNG", // in: Please upload {what}
  "cloudinary.unsupported": "\"{name}\" isn't supported. Please upload {what}.", // error when a file is the wrong type
  "cloudinary.tooBig": "\"{name}\" is larger than {mb} MB. Please upload a smaller file.", // error when a file is too big
  "cloudinary.presetMissing": "Uploads are not set up correctly (the Cloudinary upload preset is missing or not unsigned). Please tell the AfriAgriFed team.", // error
  "cloudinary.cloudNameWrong": "Uploads are not set up correctly (the Cloudinary cloud name is wrong). Please tell the AfriAgriFed team.", // error
  "cloudinary.serverTooLarge": "That file is too large. Please upload a smaller one.", // error
  "cloudinary.serverUnsupported": "That file type isn't supported. Please try a JPG, PNG or PDF.", // error
  "cloudinary.failed": "The upload failed. Please try again.", // error
  // ---- cloudinaryUpload ----
  "cloudinaryUpload.chooseFileFirst": "Choose a file first.", // error message · cloudinaryUpload.js
  "cloudinaryUpload.theUploadServiceIsNotResponding": "The upload service is not responding. Please try again in a minute.", // error message · cloudinaryUpload.js
  // ---- compass ----
  "compass.N": "N", // compass point: north
  "compass.NE": "NE", // compass point: north-east
  "compass.E": "E", // compass point: east
  "compass.SE": "SE", // compass point: south-east
  "compass.S": "S", // compass point: south
  "compass.SW": "SW", // compass point: south-west
  "compass.W": "W", // compass point: west
  "compass.NW": "NW", // compass point: north-west
  // ---- contactGuard ----
  "contactGuard.labelPhone": "phone numbers", // in: For your safety, {list} can't be shared here
  "contactGuard.labelEmail": "e-mail addresses", // in: For your safety, {list} can't be shared here
  "contactGuard.labelLink": "links", // in: For your safety, {list} can't be shared here
  "contactGuard.labelMessenger": "WhatsApp, Telegram or social media contacts", // in: For your safety, {list} can't be shared here
  "contactGuard.labelPayment": "bank or e-wallet details", // in: For your safety, {list} can't be shared here
  "contactGuard.notAllowed": "For your safety, {list} can't be shared here. Keep the conversation and the payment on AfriAgriFed so your order stays protected.", // shown when a message contains contact details
  "contactGuard.numberHidden": "[number hidden]", // replaces a phone number that was written in an old message
  "contactGuard.contactHidden": "[contact hidden]", // replaces an e-mail, link or contact that was written in an old message
  "contactGuard.chatNotice": "For your security, phone numbers, e-mails and links are hidden. Chat and pay here so your order is protected.", // notice at the top of a conversation
  // ---- conversations ----
  "conversations.unknownConversationTopic": "Unknown conversation topic.", // error message · conversations.js
  "conversations.pleaseSignInFirst": "Please sign in first.", // error message · conversations.js
  "conversations.thisIsYourOwnListing": "This is your own listing.", // error message · conversations.js
  "conversations.writeFirst": "Write a message first.", // form error
  "conversations.tooLong": "Messages can be up to {max} characters.", // form error
  // ---- cookies ----
  "cookies.cookieChoice": "Cookie choice", // aria-label · CookieBanner.js
  "cookies.essentialOnly": "Essential only", // button · CookieBanner.js
  "cookies.allowAnalytics": "Allow analytics", // button · CookieBanner.js
  "cookies.notice": "We use essential storage to keep you signed in. With your permission we also record simple, anonymous usage events to improve AfriAgriFed. No advertising, no third-party trackers.", // cookie banner
  "cookies.policy": "Cookie policy", // link in the cookie banner
  // ---- crash ----
  "crash.technicalDetailsForTheAfriagrifedTeam": "Technical details (for the AfriAgriFed team)", // summary · AppErrorBoundary.js
  "crash.reload": "Reload", // button · AppErrorBoundary.js
  "crash.goToMyDashboard": "Go to my dashboard", // button · AppErrorBoundary.js
  "crash.afriagrifedHasBeenUpdated": "AfriAgriFed has been updated", // either/or · AppErrorBoundary.js
  "crash.somethingWentWrongOnThisPage": "Something went wrong on this page", // either/or · AppErrorBoundary.js
  "crash.reloadToGetTheLatestVersion": "Reload to get the latest version.", // either/or · AppErrorBoundary.js
  "crash.pleaseReloadIfItKeepsHappening": "Please reload. If it keeps happening, go back to your dashboard and tell us what you were doing.", // either/or · AppErrorBoundary.js
  // ---- data ----
  "data.openToEverySector": "Open to every sector", // eyebrow · DataDashboard.js
  "data.dataDashboard": "Data Dashboard", // title · DataDashboard.js
  "data.whatIsHappeningOnAfriagrifedRight": "What is happening on AfriAgriFed right now, counted straight from the platform.", // subtitle · DataDashboard.js
  "data.registeredUsers": "Registered users", // span · DataDashboard.js
  "data.marketplacePriceBoard": "Marketplace price board", // h2 · DataDashboard.js
  "data.whatProducersAreAskingRightNow": "What producers are asking right now, per product and unit.", // p · DataDashboard.js
  "data.noPricedListingsYetTheyAppear": "No priced listings yet. They appear here as producers post to the marketplace.", // p · DataDashboard.js
  "data.product": "Product", // th · DataDashboard.js
  "data.unit": "Unit", // th · DataDashboard.js
  "data.listings": "Listings", // th · DataDashboard.js
  "data.lowest": "Lowest", // th · DataDashboard.js
  "data.average": "Average", // th · DataDashboard.js
  "data.highest": "Highest", // th · DataDashboard.js
  "data.askingPricesFromListingsNotCompleted": "Asking prices from listings, not completed sales. Prices in different units are never mixed.", // p · DataDashboard.js
  "data.whatBuyersAreAskingFor": "What buyers are asking for", // h2 · DataDashboard.js
  "data.openRequestsOnTheDemandBoard": "Open requests on the Demand Board, by product.", // p · DataDashboard.js
  "data.noOpenRequestsRightNow": "No open requests right now.", // p · DataDashboard.js
  "data.requests": "Requests", // th · DataDashboard.js
  "data.quantityWanted": "Quantity wanted", // th · DataDashboard.js
  "data.quantitiesAreWhatBuyersAskedFor": "Quantities are what buyers asked for, not what has been pledged or delivered.", // p · DataDashboard.js
  "data.howToReadThis": "How to read this", // h2 · DataDashboard.js
  "data.countsUpdateLiveAsPeopleUse": "Counts update live as people use the app. Completed sales and delivery data are not shown here yet; they will be added once enough orders have gone through checkout to publish without identifying anyone.", // p · DataDashboard.js
  "data.updatedWhenAnAdminOpensThe": "Updated when an admin opens the Admin Dashboard", // either/or · DataDashboard.js
  "data.asOf": "As of {date}", // date the public figures were last updated
  "data.fulfilledCount": "{count} fulfilled", // under the number of open demand requests
  "data.marketplaceListings": "Marketplace listings", // figure on the Data page
  "data.openDemand": "Open demand requests", // figure on the Data page
  "data.researchArticles": "Research articles", // figure on the Data page
  "data.trainingPrograms": "Training programs", // figure on the Data page
  "data.activePromotions": "Active promotions", // figure on the Data page
  // ---- delivery ----
  "delivery.method.collect": "I'll collect it", // delivery choice
  "delivery.method.seller": "{name} delivers it", // delivery choice; {name} is the seller
  "delivery.method.platform": "AfriAgriFed carrier", // delivery choice
  "delivery.method.collectNote": "Free. You collect it from the seller and show your handover code.",
  "delivery.method.sellerNote": "{name} brings it in their own vehicle. About {km}, around {time}.",
  "delivery.method.platformNote": "A carrier from our network ({vehicle}) collects it and brings it to you. About {km}, around {time}.",
  "delivery.free": "Free", // price of collecting
  "delivery.km": "{km} km", // distance
  "delivery.duration.min": "{m} min", // duration
  "delivery.duration.h": "{h} h", // duration
  "delivery.duration.hm": "{h} h {m} min", // duration
  "delivery.reason.notOffered": "The seller does not offer this for this order.",
  "delivery.reason.tooFar": "Too far for this seller (they deliver up to {max} km).",
  "delivery.reason.tooHeavy": "Too heavy for one carrier. Message the seller to arrange it.",
  "delivery.reason.noPickup": "The seller has not marked their place on the map yet.",
  "delivery.reason.needAddress": "Place your drop-off pin first to see the price.",
  "delivery.vehicle.small": "car or motorbike", // vehicle kind
  "delivery.vehicle.bakkie": "bakkie", // vehicle kind
  "delivery.vehicle.truck": "truck", // vehicle kind
  "delivery.vehicle.here": "The vehicle", // map pin label
  "delivery.pickupPoint": "Pick-up point", // map pin label
  "delivery.dropoffPoint": "Drop-off point", // map pin label
  "delivery.trackingMap": "Map of the delivery", // map label for screen readers
  "delivery.address.help": "Tap the map to drop a pin where the order should go. You can drag it to adjust, use your location, or pick the nearest town.",
  "delivery.address.useMyLocation": "Use my location", // button
  "delivery.address.locating": "Finding you…", // button while working
  "delivery.address.orChooseTown": "or", // between two ways of choosing a place
  "delivery.address.chooseTown": "Nearest town…", // option
  "delivery.address.mapLabel": "Map for choosing where the order goes", // map label for screen readers
  "delivery.address.pinSet": "Pin placed. Describe the exact place below so the driver can find you.",
  "delivery.address.pinMissing": "Place a pin on the map first.",
  "delivery.address.landmark": "Describe the place", // label
  "delivery.address.landmarkExample": "Blue gate behind the Engen garage, ask for Mr Amupolo", // placeholder
  "delivery.address.contactName": "Name of the person receiving it", // label
  "delivery.address.needLandmark": "Describe the place in a few words (a landmark, a gate colour, who to ask for).",
  "delivery.address.needName": "Add the name of the person receiving the order.",
  "delivery.address.chatInApp": "No phone number needed. The person delivering will message you in the app.",
  "delivery.address.outsideNamibia": "That spot is outside Namibia. Choose a place inside the country.",
  "delivery.address.noLocation": "This device can't share its location. Tap the map or choose the nearest town.",
  "delivery.address.locationDenied": "Location was not shared. You can tap the map or choose the nearest town.",
  "delivery.couldNotReachTheServer": "Could not reach the server. Check your connection and try again.",
  "delivery.somethingWentWrong": "Something went wrong. Please try again.",
  "delivery.couldNotStartThePayment": "Could not start the payment. Please try again.",
  "delivery.justNow": "just now",
  "delivery.minutesAgo_one": "1 minute ago",
  "delivery.minutesAgo_other": "{count} minutes ago",
  "delivery.deliveryFee": "delivery {amount}", // part of the order line
  "delivery.wanted": "wanted {date}", // part of the order line
  "delivery.collectFrom": "Collect from {place}",
  "delivery.carrierLine": "Carrier: {name} ({vehicle})",
  "delivery.code.label": "Your handover code",
  "delivery.code.arrived": "The delivery is here. Give this code:",
  "delivery.code.help": "Give this code to the person who hands you your order, only when you have it in your hands.",
  "delivery.code.collectHelp": "Show this code to the seller when you collect, only when you have your order.",
  "delivery.arrivedBuyer": "Your delivery has arrived. Give the driver your handover code.",
  "delivery.away": "{distance} away, about {time}", // how far the vehicle still is
  "delivery.almostThere": "Almost there",
  "delivery.lastSeen": "last seen {ago}",
  "delivery.updated": "updated {ago}",
  "delivery.waitingForPosition": "Waiting for the driver's first position…",
  "delivery.deliveredWithCode": "Handed over on {date} with your code.",
  "delivery.deliveredNoCode": "Handed over on {date} without a code.",
  "delivery.window": "You can report a problem until {date}.",
  "delivery.confirm.done": "Thank you. Delivery confirmed.", // toast
  "delivery.job.waiting": "Waiting for a carrier to take the job.",
  "delivery.job.noOneYet": "No carrier has taken the job yet. The support team has been told.",
  "delivery.job.claimed": "{name} will collect it.",
  "delivery.job.pickedUp": "{name} has it and is on the way.",
  "delivery.job.delivered": "Delivered.",
  "delivery.job.cancelled": "The carrier job was cancelled.",
  "delivery.request.title": "Ask for a carrier", // heading
  "delivery.request.help": "A carrier from our network will collect this order and bring it to the buyer. The delivery fee ({fee}) was paid by the buyer.",
  "delivery.request.ready": "When will it be ready to collect?", // label
  "delivery.request.in1h": "In 1 hour", // option
  "delivery.request.in2h": "In 2 hours", // option
  "delivery.request.in4h": "In 4 hours", // option
  "delivery.request.tomorrow": "Tomorrow at 08:00", // option
  "delivery.request.note": "How to find you (optional)", // label
  "delivery.chat.seller": "Message the seller", // button
  "delivery.chat.buyer": "Message the buyer", // button
  "delivery.chat.carrier": "Message {name}", // button, name of the carrier
  "delivery.request.noteExample": "Brown gate, ask for Ndapewa", // placeholder
  "delivery.request.send": "Ask for a carrier", // button
  "delivery.request.sent": "Done. Carriers near you have been told.", // toast
  "delivery.handover.title": "Hand over with the buyer's code", // heading
  "delivery.handover.help": "Ask the buyer for their 6-digit handover code and type it in. That completes the delivery.",
  "delivery.handover.helpCollect": "The buyer shows you their 6-digit handover code when they collect. Type it in to complete the order.",
  "delivery.handover.codeLabel": "Handover code", // label for screen readers
  "delivery.handover.confirm": "Complete delivery", // button
  "delivery.handover.noCode": "The buyer can't show the code", // link
  "delivery.handover.useCode": "Use the code instead", // link
  "delivery.handover.reasonExample": "Why the code could not be used", // placeholder
  "delivery.handover.reasonLabel": "Reason", // label for screen readers
  "delivery.handover.confirmNoCode": "Complete without the code", // button
  "delivery.handover.triesLeft_one": "That code is not right. 1 try left.",
  "delivery.handover.triesLeft_other": "That code is not right. {count} tries left.",
  "delivery.handover.done": "Delivery completed.", // toast
  "delivery.share.title": "Let the buyer follow you", // heading
  "delivery.share.help": "While you drive, this page shares your position so the buyer sees you on the map. Keep this page open and your screen on.",
  "delivery.share.start": "Share my location", // button
  "delivery.share.stop": "Stop sharing", // button
  "delivery.share.arrived": "I've arrived", // button
  "delivery.share.arrivedSent": "The buyer has been told you are there.", // toast
  "delivery.share.sharing": "Sharing your location with the buyer.",
  "delivery.share.denied": "Location is switched off for this page. Allow it in your browser to be followed on the map.",
  "delivery.share.unsupported": "This device can't share its location.",
  "delivery.problem.open": "Report a problem", // button
  "delivery.problem.title": "Report a problem", // heading
  "delivery.problem.help": "Support will look into it and no money is paid to the seller until they decide. Please be honest: both sides can add their story.",
  "delivery.problem.what": "What went wrong?", // label
  "delivery.problem.details": "Tell us more (a few words is fine)", // label
  "delivery.problem.send": "Report this problem", // button
  "delivery.problem.sent": "Reported. The support team will be in touch.", // toast
  "delivery.problem.reason.notDelivered": "It never arrived", // option
  "delivery.problem.reason.damaged": "It arrived damaged or spoiled", // option
  "delivery.problem.reason.wrongItems": "I got the wrong items", // option
  "delivery.problem.reason.shortQuantity": "Some of it is missing", // option
  "delivery.problem.reason.quality": "The quality is not what was described", // option
  "delivery.problem.reason.other": "Something else", // option
  "delivery.problem.reported": "Problem reported ({reason}) on {date}.",
  "delivery.cancel.open": "Cancel this order", // button
  "delivery.cancel.declineOpen": "Decline this order", // button
  "delivery.cancel.title": "Cancel this order?", // heading
  "delivery.cancel.declineTitle": "Decline this order?", // heading
  "delivery.cancel.help": "The seller has not accepted it yet, so you get all your money back.",
  "delivery.cancel.declineHelp": "The buyer gets all their money back and the goods go back on sale.",
  "delivery.cancel.reasonOptional": "Reason (optional)", // label
  "delivery.cancel.reasonRequired": "Reason (the buyer will see it)", // label
  "delivery.cancel.cancel": "Cancel the order", // button
  "delivery.cancel.decline": "Decline the order", // button
  "delivery.cancel.keep": "Keep it", // button
  "delivery.cancel.done": "The order was cancelled and the refund has been started.", // toast
  "delivery.confirm.ask": "Only confirm if you have your order in your hands. Confirm that you received it?", // confirmation question
  "delivery.cancel.stalledHelp": "The seller accepted this order but has not moved it for more than 3 days, so you can cancel it and get all your money back.",
  // ---- demand ----
  "demand.requestPostedProducersCanNowPledge": "Request posted. Producers can now pledge.", // toast.success · DemandBoard.js
  "demand.markedAsFulfilled": "Marked as fulfilled.", // toast.success · DemandBoard.js
  "demand.community": "Community", // eyebrow · DemandBoard.js
  "demand.demandBoard": "Demand Board", // title · DemandBoard.js
  "demand.buyersPostWhatTheyNeedIn": "Buyers post what they need in bulk. Producers pledge to supply it.", // subtitle · DemandBoard.js
  "demand.howTheDemandBoardWorks": "How the Demand Board works", // h3 · DemandBoard.js
  "demand.postRequest": "Post a request", // fragment · DemandBoard.js
  "demand.title": "Title", // label · DemandBoard.js
  "demand.egWeeklyMaizeSupplyForSchool": "e.g. Weekly maize supply for school feeding", // placeholder · DemandBoard.js
  "demand.product": "Product", // label · DemandBoard.js
  "demand.egWhiteMaize": "e.g. White maize", // placeholder · DemandBoard.js
  "demand.quantityNeeded": "Quantity needed", // label · DemandBoard.js
  "demand.unit": "Unit", // label · DemandBoard.js
  "demand.neededByOptional": "Needed by (optional)", // label · DemandBoard.js
  "demand.notes": "Notes", // label · DemandBoard.js
  "demand.deliveryLocationQualityRequirementsBudgetRan": "Delivery location, quality requirements, budget range...", // placeholder · DemandBoard.js
  "demand.filterRequests": "Filter requests", // aria-label · DemandBoard.js
  "demand.loadingRequests": "Loading requests...", // p · DemandBoard.js
  "demand.pledgeAdded": "Pledge added.", // toast.success · DemandBoard.js
  "demand.withdrawThisPledge": "Withdraw this pledge?", // window.confirm · DemandBoard.js
  "demand.yourRequest": "Your request", // span · DemandBoard.js
  "demand.fullyPledged": "Fully pledged", // span · DemandBoard.js
  "demand.pastItsDate": "Past its date", // span · DemandBoard.js
  "demand.neededSoon": "Needed soon", // span · DemandBoard.js
  "demand.markFulfilled": "Mark fulfilled", // button · DemandBoard.js
  "demand.withdrawPledge": "Withdraw pledge", // aria-label · DemandBoard.js
  "demand.withdraw": "Withdraw", // button · DemandBoard.js
  "demand.message": "Message", // button · DemandBoard.js
  "demand.quantityYouCanSupply": "Quantity you can supply", // aria-label · DemandBoard.js
  "demand.noteEgReady15OctOptional": "Note, e.g. ready 15 Oct (optional)", // placeholder · DemandBoard.js
  "demand.noteForTheBuyer": "Note for the buyer", // aria-label · DemandBoard.js
  "demand.pledge": "Pledge", // button · DemandBoard.js
  "demand.onlyProducerAccountsCanPledgeUse": "Only producer accounts can pledge. Use the discussion to ask the buyer a question.", // p · DemandBoard.js
  "demand.messageBuyerPrivately": "Message buyer privately", // button · DemandBoard.js
  "demand.noMessagesYetStartCoordinating": "No messages yet. Start coordinating.", // p · DemandBoard.js
  "demand.coordinateOnQuantitiesDeliveryTiming": "Coordinate on quantities, delivery, timing...", // placeholder · DemandBoard.js
  "demand.postRequest2": "Post request", // either/or · DemandBoard.js
  "demand.hideDiscussion": "Hide discussion", // either/or · DemandBoard.js
  "demand.openDiscussion": "Open discussion", // either/or · DemandBoard.js
  "demand.posting": "Posting...", // either/or · DemandBoard.js
  "demand.onlyProducerAccountsCanPledge": "Only producer accounts can pledge.", // toast.error · DemandBoard.js
  "demand.fulfilled": "Fulfilled", // either/or · DemandBoard.js
  "demand.open": "Open", // either/or · DemandBoard.js
  "demand.emptyOpen": "No open requests right now. Buyers can post one with the button above.", // empty list message
  "demand.emptyFulfilled": "Nothing has been fulfilled yet.", // empty list message
  "demand.emptyMine": "You haven't posted a request yet.", // empty list message
  "demand.introText": "This is for {bulk}. For a chat or a question, use the Community Feed. For something already listed for sale, use the Marketplace.", // intro on the Demand Board; {bulk} is shown in bold
  "demand.introBulk": "bulk requests that need several producers", // shown in bold inside the intro
  "demand.couldNotLoad": "Could not load requests: {error}", // error message
  "demand.neededQty": "{qty} {unit} needed", // on a request card, e.g. 50 kg needed
  "demand.byDate": "by {date}", // deadline on a request card
  "demand.postedBy": "Posted by {name}", // on a request card
  "demand.pledgedBy_one": "{pledged} / {needed} {unit} pledged by {count} producer", // progress under a request
  "demand.pledgedBy_other": "{pledged} / {needed} {unit} pledged by {count} producers", // progress under a request
  "demand.stillNeeded": "{remaining} {unit} still needed", // progress under a request
  "demand.howMuchCanYouSupply": "How much can you supply ({unit})", // placeholder of the pledge box
  "demand.deliverTo": "Deliver to (optional, puts a pin on the Market Map)", // label of the location picker on the Demand Board form
  // ---- demandRules ----
  "demandRules.giveYourRequestShortTitle": "Give your request a short title.", // validation message · demandRules.js
  "demandRules.sayWhichProductYouNeed": "Say which product you need.", // validation message · demandRules.js
  "demandRules.enterHowMuchYouNeedMore": "Enter how much you need (more than zero).", // validation message · demandRules.js
  "demandRules.thatQuantityLooksTooLarge": "That quantity looks too large.", // validation message · demandRules.js
  "demandRules.chooseUnit": "Choose a unit.", // validation message · demandRules.js
  "demandRules.chooseTodayOrLaterDate": "Choose today or a later date.", // validation message · demandRules.js
  "demandRules.enterHowMuchYouCanSupply": "Enter how much you can supply.", // validation message · demandRules.js
  "demandRules.thisRequestIsAlreadyFulfilled": "This request is already fulfilled.", // validation message · demandRules.js
  "demandRules.titleTooLong": "Keep the title under {max} characters.", // form error
  "demandRules.productTooLong": "Keep this under {max} characters.", // form error on the product field
  "demandRules.notesTooLong": "Keep notes under {max} characters.", // form error
  "demandRules.noteTooLong": "Keep the note under {max} characters.", // form error on a pledge note
  // ---- farmerDashboard ----
  "farmerDashboard.farmerDashboard": "Farmer Dashboard", // dashboardTitle · FarmerDashboard.js
  // ---- farmerForm ----
  "farmerForm.sectionPersonalBusinessInformation": "Section A: Personal & Business Information", // h2 · FarmerQuestionnaire.js
  "farmerForm.1BusinessName": "1. Business Name *", // label · FarmerQuestionnaire.js
  "farmerForm.enterYourBusinessName": "Enter your business name", // placeholder · FarmerQuestionnaire.js
  "farmerForm.2TypeOfFarmingCheckAll": "2. Type of Farming * (Check all that apply)", // label · FarmerQuestionnaire.js
  "farmerForm.3SpecifyFarmingProduct": "3. Specify farming product", // label · FarmerQuestionnaire.js
  "farmerForm.egMaizeCattleTomatoesFish": "e.g., Maize, Cattle, Tomatoes, Fish", // placeholder · FarmerQuestionnaire.js
  "farmerForm.4ScaleOfFarming": "4. Scale of farming *", // label · FarmerQuestionnaire.js
  "farmerForm.selectScale": "Select scale", // option · FarmerQuestionnaire.js
  "farmerForm.smallScale": "Small-scale", // option · FarmerQuestionnaire.js
  "farmerForm.mediumScale": "Medium-scale", // option · FarmerQuestionnaire.js
  "farmerForm.largeScale": "Large-scale", // option · FarmerQuestionnaire.js
  "farmerForm.commercial": "Commercial", // option · FarmerQuestionnaire.js
  "farmerForm.5RegistrationNumber": "5. Registration Number", // label · FarmerQuestionnaire.js
  "farmerForm.businessRegistrationNumber": "Business registration number", // placeholder · FarmerQuestionnaire.js
  "farmerForm.6PhoneNumber": "6. Phone Number *", // label · FarmerQuestionnaire.js
  "farmerForm.264XxXxxXxxx": "+264 XX XXX XXXX", // placeholder · FarmerQuestionnaire.js
  "farmerForm.7EmailOptional": "7. Email (optional)", // label · FarmerQuestionnaire.js
  "farmerForm.8TypeOfFarmingBusiness": "8. Type of Farming Business *", // label · FarmerQuestionnaire.js
  "farmerForm.9YearsInFarming": "9. Years in Farming *", // label · FarmerQuestionnaire.js
  "farmerForm.sectionFarmLocationSize": "Section B: Farm Location & Size", // h2 · FarmerQuestionnaire.js
  "farmerForm.10Country": "10. Country *", // label · FarmerQuestionnaire.js
  "farmerForm.egNamibia": "e.g., Namibia", // placeholder · FarmerQuestionnaire.js
  "farmerForm.11ProvinceStateRegion": "11. Province/State/Region *", // label · FarmerQuestionnaire.js
  "farmerForm.egOshanaRegion": "e.g., Oshana Region", // placeholder · FarmerQuestionnaire.js
  "farmerForm.12DistrictCounty": "12. District/County", // label · FarmerQuestionnaire.js
  "farmerForm.egOshakatiWest": "e.g., Oshakati West", // placeholder · FarmerQuestionnaire.js
  "farmerForm.13VillageCommunity": "13. Village/Community", // label · FarmerQuestionnaire.js
  "farmerForm.egOneshila": "e.g., Oneshila", // placeholder · FarmerQuestionnaire.js
  "farmerForm.14TotalLandSizeUsedFor": "14. Total Land Size Used for Farming *", // label · FarmerQuestionnaire.js
  "farmerForm.15LandOwnershipType": "15. Land Ownership Type *", // label · FarmerQuestionnaire.js
  "farmerForm.sectionSalesMarketing": "Section C: Sales & Marketing", // h2 · FarmerQuestionnaire.js
  "farmerForm.16DoYouSellYourProduce": "16. Do you sell your produce? *", // label · FarmerQuestionnaire.js
  "farmerForm.17WhatPercentageOfYourProduce": "17. What percentage of your produce is sold? *", // label · FarmerQuestionnaire.js
  "farmerForm.18AverageSalesPerYearEstimate": "18. Average sales per year (estimate)", // label · FarmerQuestionnaire.js
  "farmerForm.19WhereDoYouSellYour": "19. Where do you sell your products? (Check all that apply)", // label · FarmerQuestionnaire.js
  "farmerForm.20MainHarvestProductionTimesMonths": "20. Main harvest/production times (months)", // label · FarmerQuestionnaire.js
  "farmerForm.egJuneAugustNovemberDecember": "e.g., June-August, November-December", // placeholder · FarmerQuestionnaire.js
  "farmerForm.21ModeOfTransportUsedFor": "21. Mode of transport used for delivering produce", // label · FarmerQuestionnaire.js
  "farmerForm.sectionInputsResources": "Section D: Inputs & Resources", // h2 · FarmerQuestionnaire.js
  "farmerForm.28WhereDoYouGetYour": "28. Where do you get your farming inputs (seed, feed, fertilizer)? (Check all that apply)", // label · FarmerQuestionnaire.js
  "farmerForm.29DoYouHaveAccessTo": "29. Do you have access to irrigation?", // label · FarmerQuestionnaire.js
  "farmerForm.sectionFarmingMethodsChallenges": "Section E: Farming Methods & Challenges", // h2 · FarmerQuestionnaire.js
  "farmerForm.30WhatTypeOfFarmingMethods": "30. What type of farming methods do you use?", // label · FarmerQuestionnaire.js
  "farmerForm.31WhatAreYourBiggestFarming": "31. What are your biggest farming challenges? * (Check all that apply)", // label · FarmerQuestionnaire.js
  "farmerForm.32WhichChallengeAffectsYourIncome": "32. Which challenge affects your income the most?", // label · FarmerQuestionnaire.js
  "farmerForm.describeTheBiggestChallengeAffectingYour": "Describe the biggest challenge affecting your income...", // placeholder · FarmerQuestionnaire.js
  "farmerForm.sectionTechnologySupport": "Section F: Technology & Support", // h2 · FarmerQuestionnaire.js
  "farmerForm.33DoYouUseSmartphoneOr": "33. Do you use a smartphone or mobile device for farming activities?", // label · FarmerQuestionnaire.js
  "farmerForm.34AreYouMemberOfAny": "34. Are you a member of any farmers' association or cooperative?", // label · FarmerQuestionnaire.js
  "farmerForm.35TypesOfSupportYouWould": "35. Types of support you would like to receive: (Check all that apply)", // label · FarmerQuestionnaire.js
  "farmerForm.farmerRegistrationQuestionnaire": "Farmer Registration Questionnaire", // h1 · FarmerQuestionnaire.js
  "farmerForm.completeAllSectionsToRegisterAs": "Complete all sections to register as a verified farmer", // p · FarmerQuestionnaire.js
  "farmerForm.businessNameIsRequired": "Business name is required", // validation message · FarmerQuestionnaire.js
  "farmerForm.selectAtLeastOneFarmingType": "Select at least one farming type", // validation message · FarmerQuestionnaire.js
  "farmerForm.scaleOfFarmingIsRequired": "Scale of farming is required", // validation message · FarmerQuestionnaire.js
  "farmerForm.phoneNumberIsRequired": "Phone number is required", // validation message · FarmerQuestionnaire.js
  "farmerForm.businessTypeIsRequired": "Business type is required", // validation message · FarmerQuestionnaire.js
  "farmerForm.yearsInFarmingIsRequired": "Years in farming is required", // validation message · FarmerQuestionnaire.js
  "farmerForm.countryIsRequired": "Country is required", // validation message · FarmerQuestionnaire.js
  "farmerForm.provinceStateRegionIsRequired": "Province/State/Region is required", // validation message · FarmerQuestionnaire.js
  "farmerForm.landSizeIsRequired": "Land size is required", // validation message · FarmerQuestionnaire.js
  "farmerForm.landOwnershipTypeIsRequired": "Land ownership type is required", // validation message · FarmerQuestionnaire.js
  "farmerForm.pleaseSelectAnOption": "Please select an option", // validation message · FarmerQuestionnaire.js
  "farmerForm.percentageSoldIsRequired": "Percentage sold is required", // validation message · FarmerQuestionnaire.js
  "farmerForm.selectAtLeastOneChallenge": "Select at least one challenge", // validation message · FarmerQuestionnaire.js
  "farmerForm.completeRegistration": "Complete Registration", // either/or · FarmerQuestionnaire.js
  "farmerForm.nextSection": "Next Section", // either/or · FarmerQuestionnaire.js
  // ---- farmInputs ----
  "farmInputs.giveYourFarmName": "Give your farm a name.", // validation message · farmInputs.js
  "farmInputs.tapSpotInsideNamibiaOnThe": "Tap a spot inside Namibia on the map.", // validation message · farmInputs.js
  "farmInputs.areaMustBeNumberOfHectares": "Area must be a number of hectares.", // validation message · farmInputs.js
  "farmInputs.chooseTheDate": "Choose the date.", // validation message · farmInputs.js
  "farmInputs.chooseWhatKindOfInputIt": "Choose what kind of input it was.", // validation message · farmInputs.js
  "farmInputs.sayWhatItWasForExample": "Say what it was, for example 'Mahangu seed' or 'NPK 2:3:2'.", // validation message · farmInputs.js
  "farmInputs.quantityMustBeNumber": "Quantity must be a number.", // validation message · farmInputs.js
  "farmInputs.costMustBeNumberIn": "Cost must be a number in N$.", // validation message · farmInputs.js
  "farmInputs.unitIsTooLong": "Unit is too long.", // validation message · farmInputs.js
  "farmInputs.nameTooLong": "Keep the name under {max} characters.", // farm form error
  "farmInputs.notesTooLong": "Keep notes under {max} characters.", // farm form error
  "farmInputs.tooManyCrops": "Choose at most {max} crops.", // farm form error
  "farmInputs.itemTooLong": "Keep this under {max} characters.", // input record form error
  "farmInputs.noteTooLong": "Keep the note under {max} characters.", // input record form error
  // ---- farms ----
  "farms.myFarms": "My farms", // p · MapFarms.js
  "farms.tapYourFarmLocationOnThe": "Tap your farm's location on the map.", // span · MapFarms.js
  "farms.addMyFarm": "Add my farm", // button · MapFarms.js
  "farms.addFarmToKeepWeatherRain": "Add a farm to keep weather, rain and your inputs together in one place.", // p · MapFarms.js
  "farms.farmSaved": "Farm saved.", // toast.success · MapFarms.js
  "farms.onlyYouCanSeeYourFarm": ". Only you can see your farm.", // p · MapFarms.js
  "farms.egOshakatiMahanguField": "e.g. Oshakati mahangu field", // placeholder · MapFarms.js
  "farms.whatDoYouGrowOptional": "What do you grow? (optional)", // legend · MapFarms.js
  "farms.inputRecorded": "Input recorded.", // toast.success · MapFarms.js
  "farms.farmDeleted": "Farm deleted.", // toast.success · MapFarms.js
  "farms.inputsSpend": "Inputs spend", // h4 · MapFarms.js
  "farms.nothingRecordedYetAddSeedFertiliser": "Nothing recorded yet. Add seed, fertiliser, water or labour below to see your costs add up.", // p · MapFarms.js
  "farms.recordAnInput": "Record an input", // h4 · MapFarms.js
  "farms.egMahanguSeedNpk23": "e.g. Mahangu seed, NPK 2:3:2, weeding", // placeholder · MapFarms.js
  "farms.kgBagsDays": "kg, L, bags, days", // placeholder · MapFarms.js
  "farms.records": "Records", // h4 · MapFarms.js
  "farms.loading": "Loading…", // p · MapFarms.js
  "farms.deleteThisFarm": "Delete this farm", // button · MapFarms.js
  "farms.pleaseSignInFirst": "Please sign in first.", // error message · farms.js
  "farms.outsideNamibia": "outside Namibia", // either/or · MapFarms.js
  "farms.saving": "Saving…", // either/or · MapFarms.js
  "farms.saveFarm": "Save farm", // either/or · MapFarms.js
  "farms.addRecord": "Add record", // either/or · MapFarms.js
  "farms.onlyFarmerAccountsCanAddFarms": "Only farmer accounts can add farms.", // toast.error · MapFarms.js
  "farms.youCanAddRecordsToThis": "You can't add records to this farm.", // toast.error · MapFarms.js
  "farms.fireAlert": "{name}: fire hotspot {km} km away", // alert on the farm list
  "farms.farmName": "Farm name", // form label
  "farms.sizeHa": "Size (hectares, optional)", // form label
  "farms.sizeExample": "e.g. 2.5", // example in the size box
  "farms.notesOptional": "Notes (optional)", // form label
  "farms.confirmDeleteRecord": "Delete \"{item}\" from your records?", // confirmation question
  "farms.confirmDeleteFarm": "Delete \"{name}\" and all of its input records? This cannot be undone.", // confirmation question
  "farms.acrossRecords_one": "across {count} record", // spend summary: N$ 450 across 1 record
  "farms.acrossRecords_other": "across {count} records", // spend summary: N$ 450 across 3 records
  "farms.withoutCost": "({count} without a cost)", // spend summary
  "farms.date": "Date", // form label
  "farms.type": "Type", // form label
  "farms.whatWasIt": "What was it?", // form label
  "farms.quantity": "Quantity", // form label
  "farms.unit": "Unit", // form label
  "farms.costNad": "Cost (N$)", // form label
  "farms.forWhich": "For which crop or animals? (optional)", // form label
  "farms.noteOptional": "Note (optional)", // form label
  "farms.couldNotLoadRecords": "Could not load records: {error}", // error message
  "farms.deleteRecord": "Delete {item}", // accessible name of a delete button
  "farms.hectares": "{value} ha", // area of a farm in hectares
  // ---- feed ----
  "feed.deleteThisPost": "Delete this post?", // window.confirm · ConsumerDashboard.js
  "feed.postDeleted": "Post deleted.", // toast.success · ConsumerDashboard.js
  "feed.deleteThisComment": "Delete this comment?", // window.confirm · ConsumerDashboard.js
  "feed.deleteThisReply": "Delete this reply?", // window.confirm · ConsumerDashboard.js
  "feed.shareWithTheCommunity": "Share with the community", // h2 · ConsumerDashboard.js
  "feed.postItOnTheDemandBoard": "Post it on the Demand Board", // button · ConsumerDashboard.js
  "feed.whatHappeningOnYourFarmOr": "What's happening on your farm or in your market?", // placeholder · ConsumerDashboard.js
  "feed.selected": "Selected", // alt · ConsumerDashboard.js
  "feed.removeImage": "Remove image", // aria-label · ConsumerDashboard.js
  "feed.listings": "Listings", // h2 · ConsumerDashboard.js
  "feed.searchProducts": "Search products...", // placeholder · ConsumerDashboard.js
  "feed.noMarketplaceListingsYet": "No marketplace listings yet.", // p · ConsumerDashboard.js
  "feed.latestPosts": "Latest posts", // h2 · ConsumerDashboard.js
  "feed.forYou": "For You", // button · ConsumerDashboard.js
  "feed.recent": "Recent", // button · ConsumerDashboard.js
  "feed.showNewMarketplaceListingsAndDemand": "Show new marketplace listings and Demand Board requests between posts", // title · ConsumerDashboard.js
  "feed.marketUpdates": "Market updates", // button · ConsumerDashboard.js
  "feed.noPostsYetBeTheFirst": "No posts yet. Be the first to share something.", // p · ConsumerDashboard.js
  "feed.deletePost": "Delete post", // aria-label · ConsumerDashboard.js
  "feed.post": "Post", // alt · ConsumerDashboard.js
  "feed.reply": "Reply", // button · ConsumerDashboard.js
  "feed.delete": "Delete", // button · ConsumerDashboard.js
  "feed.sendReply": "Send reply", // aria-label · ConsumerDashboard.js
  "feed.writeComment": "Write a comment...", // placeholder · ConsumerDashboard.js
  "feed.sendComment": "Send comment", // aria-label · ConsumerDashboard.js
  "feed.producerWorkspace": "Producer workspace", // eyebrow · ConsumerDashboard.js
  "feed.consumerWorkspace": "Consumer workspace", // eyebrow · ConsumerDashboard.js
  "feed.communityFeed": "Community Feed", // title · ConsumerDashboard.js
  "feed.readyToSellListingsFromProducers": "Ready-to-sell listings from producers across Namibia.", // subtitle · ConsumerDashboard.js
  "feed.shareNewsPhotosTipsAndQuestions": "Share news, photos, tips and questions with the community.", // subtitle · ConsumerDashboard.js
  "feed.changePhoto": "Change photo", // either/or · ConsumerDashboard.js
  "feed.addPhoto": "Add a photo", // either/or · ConsumerDashboard.js
  "feed.marketplace": "Marketplace", // title · ConsumerDashboard.js
  "feed.posting": "Posting...", // either/or · ConsumerDashboard.js
  "feed.like": "Like", // either/or · ConsumerDashboard.js
  "feed.comment": "Comment", // either/or · ConsumerDashboard.js
  "feed.member": "Member", // either/or · ConsumerDashboard.js
  "feed.uploadFailed": "Failed to upload post: {message}", // toast
  "feed.postHint": "For news, photos, tips and questions. Need a bulk quantity of something? {link} so producers can pledge to supply it.", // hint above the post box; {link} is a button
  "feed.noListingsMatch": "No listings match \"{query}\".", // marketplace search with no results
  "feed.replyTo": "Reply to {name}...", // placeholder of the reply box
  "feed.thisComment": "this comment", // used in "Reply to this comment..."
  "feed.postImage": "Post", // alt text of a picture attached to a post
  // ---- field ----
  "field.additionalServices": "Additional Services", // label of a saved answer on the profile page
  "field.agreedToTerms": "Agreed To Terms", // label of a saved answer on the profile page
  "field.agriculturalPrograms": "Agricultural Programs", // label of a saved answer on the profile page
  "field.associationMember": "Association Member", // label of a saved answer on the profile page
  "field.averageCustomersWeekly": "Average Customers Weekly", // label of a saved answer on the profile page
  "field.averageSalesPerYear": "Average Sales Per Year", // label of a saved answer on the profile page
  "field.bankStatement": "Bank Statement", // label of a saved answer on the profile page
  "field.biggestIncomeChallenge": "Biggest Income Challenge", // label of a saved answer on the profile page
  "field.businessCertificate": "Business Certificate", // label of a saved answer on the profile page
  "field.businessEmail": "Business Email", // label of a saved answer on the profile page
  "field.businessName": "Business Name", // label of a saved answer on the profile page
  "field.businessOperationOther": "Business Operation Other", // label of a saved answer on the profile page
  "field.businessOperationType": "Business Operation Type", // label of a saved answer on the profile page
  "field.businessRegistration": "Business Registration", // label of a saved answer on the profile page
  "field.campusBranchName": "Campus Branch Name", // label of a saved answer on the profile page
  "field.challengesCanSolve": "Challenges Can Solve", // label of a saved answer on the profile page
  "field.cityTown": "City / Town", // label of a saved answer on the profile page
  "field.collaborations": "Collaborations", // label of a saved answer on the profile page
  "field.conductsResearch": "Conducts Research", // label of a saved answer on the profile page
  "field.confirmPassword": "Confirm Password", // label of a saved answer on the profile page
  "field.consumerType": "Consumer Type", // label of a saved answer on the profile page
  "field.contactPersonTitle": "Contact Person Title", // label of a saved answer on the profile page
  "field.country": "Country", // label of a saved answer on the profile page
  "field.deliveryAddress": "Delivery Address", // label of a saved answer on the profile page
  "field.demonstrationFarmDetails": "Demonstration Farm Details", // label of a saved answer on the profile page
  "field.desiredResearchData": "Desired Research Data", // label of a saved answer on the profile page
  "field.desiredSupport": "Desired Support", // label of a saved answer on the profile page
  "field.districtCounty": "District / County", // label of a saved answer on the profile page
  "field.dob": "Date of Birth", // label of a saved answer on the profile page
  "field.educatorCertificate": "Educator Certificate", // label of a saved answer on the profile page
  "field.emailAddress": "Email Address", // label of a saved answer on the profile page
  "field.expertAvailability": "Expert Availability", // label of a saved answer on the profile page
  "field.expertiseAreas": "Expertise Areas", // label of a saved answer on the profile page
  "field.experts": "Experts", // label of a saved answer on the profile page
  "field.farmingChallenges": "Farming Challenges", // label of a saved answer on the profile page
  "field.farmingInputsSource": "Farming Inputs Source", // label of a saved answer on the profile page
  "field.farmingMethods": "Farming Methods", // label of a saved answer on the profile page
  "field.fieldResearchAccess": "Field Research Access", // label of a saved answer on the profile page
  "field.firstName": "First Name", // label of a saved answer on the profile page
  "field.foodProcessingProduct": "Food Processing Product", // label of a saved answer on the profile page
  "field.fullName": "Full Name", // label of a saved answer on the profile page
  "field.gender": "Gender", // label of a saved answer on the profile page
  "field.gpsCoordinates": "GPS Coordinates", // label of a saved answer on the profile page
  "field.graduatingStudents": "Graduating Students", // label of a saved answer on the profile page
  "field.hasDemonstrationFarms": "Has Demonstration Farms", // label of a saved answer on the profile page
  "field.institutionName": "Institution Name", // label of a saved answer on the profile page
  "field.institutionType": "Institution Type", // label of a saved answer on the profile page
  "field.institutionalLetter": "Institutional Letter", // label of a saved answer on the profile page
  "field.internshipAreas": "Internship Areas", // label of a saved answer on the profile page
  "field.internshipDuration": "Internship Duration", // label of a saved answer on the profile page
  "field.internshipSupport": "Internship Support", // label of a saved answer on the profile page
  "field.internshipsNeeded": "Internships Needed", // label of a saved answer on the profile page
  "field.irrigationAccess": "Irrigation Access", // label of a saved answer on the profile page
  "field.landOwnership": "Land Ownership", // label of a saved answer on the profile page
  "field.landOwnershipType": "Land Ownership Type", // label of a saved answer on the profile page
  "field.lastName": "Last Name", // label of a saved answer on the profile page
  "field.mainCrops": "Main Crops", // label of a saved answer on the profile page
  "field.mainHarvestTimes": "Main Harvest Times", // label of a saved answer on the profile page
  "field.nationality": "Nationality", // label of a saved answer on the profile page
  "field.orderSize": "Order Size", // label of a saved answer on the profile page
  "field.otherSupport": "Other Support", // label of a saved answer on the profile page
  "field.packagingPreferences": "Packaging Preferences", // label of a saved answer on the profile page
  "field.password": "Password", // label of a saved answer on the profile page
  "field.peakDemandPeriods": "Peak Demand Periods", // label of a saved answer on the profile page
  "field.percentageSold": "Percentage Sold", // label of a saved answer on the profile page
  "field.personalEmail": "Personal Email", // label of a saved answer on the profile page
  "field.personalId": "Personal ID", // label of a saved answer on the profile page
  "field.phoneNumber": "Phone Number", // label of a saved answer on the profile page
  "field.postalAddress": "Postal Address", // label of a saved answer on the profile page
  "field.preferredDeliveryDays": "Preferred Delivery Days", // label of a saved answer on the profile page
  "field.preferredDeliveryTime": "Preferred Delivery Time", // label of a saved answer on the profile page
  "field.primaryContactPerson": "Primary Contact Person", // label of a saved answer on the profile page
  "field.productPreferences": "Product Preferences", // label of a saved answer on the profile page
  "field.productsInterested": "Products Interested", // label of a saved answer on the profile page
  "field.programsPerYear": "Programs Per Year", // label of a saved answer on the profile page
  "field.proofOfRegistration": "Proof Of Registration", // label of a saved answer on the profile page
  "field.proofOfResidence": "Proof Of Residence", // label of a saved answer on the profile page
  "field.provinceRegion": "Province Region", // label of a saved answer on the profile page
  "field.provinceRegionState": "Province Region State", // label of a saved answer on the profile page
  "field.provinceStateRegion": "Province State Region", // label of a saved answer on the profile page
  "field.quantityRequirements": "Quantity Requirements", // label of a saved answer on the profile page
  "field.receiverName": "Receiver Name", // label of a saved answer on the profile page
  "field.region": "Region", // label of a saved answer on the profile page
  "field.registeredStudents": "Registered Students", // label of a saved answer on the profile page
  "field.registrationNumber": "Registration Number", // label of a saved answer on the profile page
  "field.researchAreas": "Research Areas", // label of a saved answer on the profile page
  "field.researchProjectsPerYear": "Research Projects Per Year", // label of a saved answer on the profile page
  "field.researchSupportNeeds": "Research Support Needs", // label of a saved answer on the profile page
  "field.salesChannels": "Sales Channels", // label of a saved answer on the profile page
  "field.scaleOfFarming": "Scale Of Farming", // label of a saved answer on the profile page
  "field.sellProduce": "Sell Produce", // label of a saved answer on the profile page
  "field.shortCourses": "Short Courses", // label of a saved answer on the profile page
  "field.smartphoneUsage": "Smartphone Usage", // label of a saved answer on the profile page
  "field.solutionTypes": "Solution Types", // label of a saved answer on the profile page
  "field.sourcingChallenges": "Sourcing Challenges", // label of a saved answer on the profile page
  "field.specifyFarmingProduct": "Specify Farming Product", // label of a saved answer on the profile page
  "field.storageRequirements": "Storage Requirements", // label of a saved answer on the profile page
  "field.supplyFrequency": "Supply Frequency", // label of a saved answer on the profile page
  "field.supportNeeded": "Support Needed", // label of a saved answer on the profile page
  "field.targetGroups": "Target Groups", // label of a saved answer on the profile page
  "field.taxCertificate": "Tax Certificate", // label of a saved answer on the profile page
  "field.totalLandSize": "Total Land Size", // label of a saved answer on the profile page
  "field.trainingPrograms": "Training Programs", // label of a saved answer on the profile page
  "field.transportMode": "Transport Mode", // label of a saved answer on the profile page
  "field.typeOfFarming": "Type Of Farming", // label of a saved answer on the profile page
  "field.typeOfFarmingBusiness": "Type Of Farming Business", // label of a saved answer on the profile page
  "field.userType": "User Type", // label of a saved answer on the profile page
  "field.villageCommunity": "Village Community", // label of a saved answer on the profile page
  "field.website": "Website", // label of a saved answer on the profile page
  "field.yearEstablished": "Year Established", // label of a saved answer on the profile page
  "field.yearsInFarming": "Years In Farming", // label of a saved answer on the profile page
  "field.yearsInOperation": "Years In Operation", // label of a saved answer on the profile page
  // ---- fires ----
  "fires.unknownTime": "unknown time", // when a fire was seen
  "fires.underHour": "under an hour ago", // when a fire was seen
  "fires.hoursAgo": "{count} h ago", // when a fire was seen: h = hours
  "fires.daysAgo_one": "{count} day ago", // when a fire was seen
  "fires.daysAgo_other": "{count} days ago", // when a fire was seen
  // ---- footer ----
  "footer.legal": "Legal", // aria-label · SiteFooter.js
  "footer.termsOfService": "Terms of service", // Link · SiteFooter.js
  "footer.privacyPolicy": "Privacy policy", // Link · SiteFooter.js
  "footer.refunds": "Refunds", // Link · SiteFooter.js
  "footer.cookies": "Cookies", // Link · SiteFooter.js
  "footer.regNo": "Reg. no. {number}", // company registration number in the footer
  "footer.copyright": "© {year} {name}. All rights reserved.", // footer
  // ---- forgotPassword ----
  "forgotPassword.home": "Home", // button · ForgotPassword.js
  "forgotPassword.contactUs": "Contact Us", // button · ForgotPassword.js
  "forgotPassword.resetYourPassword": "Reset your password", // h1 · ForgotPassword.js
  "forgotPassword.enterTheEmailYouSignedUp": "Enter the email you signed up with and we'll send you a link to set a new password.", // p · ForgotPassword.js
  "forgotPassword.email": "Email *", // label · ForgotPassword.js
  "forgotPassword.backToSignIn": "Back to Sign In", // Link · ForgotPassword.js
  "forgotPassword.sendResetLink": "Send Reset Link", // either/or · ForgotPassword.js
  "forgotPassword.sending": "Sending...", // either/or · ForgotPassword.js
  "forgotPassword.enterEmail": "Enter your email address.", // form message
  "forgotPassword.sent": "If an account exists for {email}, a password reset link is on its way.", // form message
  "forgotPassword.invalidEmail": "That doesn't look like a valid email address.", // form message
  // ---- home ----
  "home.register": "Register", // button · Home.js
  "home.contactUs": "Contact Us", // button · Home.js
  "home.openTheAafAssistant": "Open the AAF Assistant", // aria-label · Home.js
  "home.aafAssistantComingSoon": "AAF Assistant (coming soon)", // alt · Home.js
  "home.afriagrifedDigitalizingAfricaFoodSecurityFro": "AfriAgriFed - Digitalizing Africa's food security from African soil", // alt · Home.js
  "home.fightingFoodInsecurityOneConnectionAt": "Fighting Food Insecurity, One Connection at a Time", // h1 · Home.js
  "home.afriagrifedCombatsAfricaFoodInsecurityBy": "AfriAgriFed combats Africa's food insecurity by boosting food production through data driven agricultural innovation.", // p · Home.js
  "home.getStartedRegisterNow": "Get Started - Register Now", // button · Home.js
  "home.signInToYourAccount": "Sign In to Your Account", // button · Home.js
  "home.ourTargetAudience": "Our Target Audience", // h2 · Home.js
  "home.groupingProducersTheMarketAndEducators": "Grouping producers, the market and educators into an agriculturally focused platform.", // p · Home.js
  "home.getInTouchWithOurTeam": "Get in touch with our team for inquiries and support", // p · Home.js
  "home.contactInformation": "Contact Information", // h3 · Home.js
  "home.email": "Email", // h4 · Home.js
  "home.afriagrifedOutlookCom": "afriagrifed@outlook.com", // p · Home.js
  "home.phone": "Phone", // h4 · Home.js
  "home.location": "Location", // h4 · Home.js
  "home.oshakatiNamibia": "Oshakati, Namibia", // p · Home.js
  "home.workingHours": "Working Hours", // h4 · Home.js
  "home.monFri800Am5": "Mon - Fri: 8:00 AM - 5:00 PM", // p · Home.js
  "home.sendUsMessage": "Send us a Message", // h3 · Home.js
  "home.yourName": "Your Name", // placeholder · Home.js
  "home.yourEmail": "Your Email", // placeholder · Home.js
  "home.yourMessage": "Your Message", // placeholder · Home.js
  "home.digitizingNamibiaAgriculturalLandscape": "Digitizing Namibia's Agricultural Landscape", // p · Home.js
  "home.followUs": "Follow Us", // p · Home.js
  "home.messageSent": "Message Sent!", // either/or · Home.js
  "home.sendMessage": "Send Message", // either/or · Home.js
  "home.cardFarmingData": "Farming Data", // card on the home page
  "home.cardFarmingDataDesc": "Agricultural insights", // card on the home page
  "home.cardStatistics": "Statistics", // card on the home page
  "home.cardStatisticsDesc": "Real-time analytics", // card on the home page
  "home.cardPromotion": "Promotion", // card on the home page
  "home.cardPromotionDesc": "Market products", // card on the home page
  "home.cardPrograms": "Programs", // card on the home page
  "home.cardProgramsDesc": "Training resources", // card on the home page
  "home.sectionFarmers": "Farmers", // section on the home page
  "home.sectionFarmersDesc": "Maximized interaction, connectivity to the market and educational resources to foster smooth upscaling.", // section on the home page
  "home.sectionConsumers": "Consumers", // section on the home page
  "home.sectionConsumersDesc": "Direct connectivity of Farmers and producers with buyers for fresh produce, sustained production and efficient transactions.", // section on the home page
  "home.sectionInstitutions": "Tertiary Institutions", // section on the home page
  "home.sectionInstitutionsDesc": "Education resources, research data, training programs and solutions to problems towards boosting production.", // section on the home page
  "home.headline": "Fighting Food Insecurity, One Connection at a Time", // the main headline, typed out on the home page
  "home.botHello": "Hi, I am the AAF Assistant", // the bot's greeting, typed out
  "home.botTap": "Tap me to ask a question", // the bot's second line when the assistant is online
  "home.botSoon": "Coming soon to answer your questions", // the bot's second line until the assistant is online
  "home.rights": "{year} AfriAgriFed. All rights reserved.", // footer; the (c) sign comes before it
  // ---- insights ----
  "insights.signIn": "Sign in", // button · InsightsFrame.js
  // ---- institution ----
  "institution.pleaseAddTitleAndSummaryBefore": "Please add a title and summary before publishing.", // toast.error · InstitutionDashboard.js
  "institution.institutionDashboard": "Institution dashboard", // eyebrow · InstitutionDashboard.js
  "institution.farmingResearchDesk": "Farming Research Desk", // title · InstitutionDashboard.js
  "institution.publishAgriculturalResearchFieldReportsLinks": "Publish agricultural research, field reports, links and PDFs.", // subtitle · InstitutionDashboard.js
  "institution.farmerProblemsAwaitingResearch": "Farmer Problems Awaiting Research", // h2 · InstitutionDashboard.js
  "institution.noOpenProblemsFromFarmersRight": "No open problems from farmers right now.", // p · InstitutionDashboard.js
  "institution.respondWithResearch": "Respond with Research", // button · InstitutionDashboard.js
  "institution.cancelResponse": "Cancel response", // button · InstitutionDashboard.js
  "institution.headline": "Headline", // label · InstitutionDashboard.js
  "institution.egDroughtTolerantMilletTrialResults": "e.g., Drought-tolerant millet trial results", // placeholder · InstitutionDashboard.js
  "institution.summary": "Summary", // label · InstitutionDashboard.js
  "institution.writeShortResearchSummary": "Write a short research summary...", // placeholder · InstitutionDashboard.js
  "institution.category": "Category", // label · InstitutionDashboard.js
  "institution.research": "Research", // option · InstitutionDashboard.js
  "institution.fieldTrial": "Field Trial", // option · InstitutionDashboard.js
  "institution.marketInsight": "Market Insight", // option · InstitutionDashboard.js
  "institution.climate": "Climate", // option · InstitutionDashboard.js
  "institution.training": "Training", // option · InstitutionDashboard.js
  "institution.sourceName": "Source Name", // label · InstitutionDashboard.js
  "institution.institutionOrJournal": "Institution or journal", // placeholder · InstitutionDashboard.js
  "institution.researchLink": "Research Link", // label · InstitutionDashboard.js
  "institution.photo": "Photo", // label · InstitutionDashboard.js
  "institution.pdf": "PDF", // label · InstitutionDashboard.js
  "institution.researchNews": "Research news", // p · InstitutionDashboard.js
  "institution.agriculturalArticles": "Agricultural Articles", // h2 · InstitutionDashboard.js
  "institution.noResearchArticlesPublishedYet": "No research articles published yet.", // p · InstitutionDashboard.js
  "institution.openLink": "Open Link", // a · InstitutionDashboard.js
  "institution.viewPdf": "View PDF", // a · InstitutionDashboard.js
  "institution.uploadResearch": "Upload Research", // either/or · InstitutionDashboard.js
  "institution.publishArticle": "Publish Article", // either/or · InstitutionDashboard.js
  "institution.publishing": "Publishing...", // either/or · InstitutionDashboard.js
  "institution.respondTo": "Respond to: {title}", // heading when answering a farmer's problem
  "institution.fromName": "From {name}", // who asked a research question
  "institution.couldNotPublish": "Could not publish research article: {error}", // error toast
  "institution.recommendation": "Recommendation: {title}", // title prefilled when answering a problem
  // ---- institutionForm ----
  "institutionForm.sectionInstitutionalInformation": "Section A: Institutional Information", // h2 · InstitutionQuestionnaire.js
  "institutionForm.1NameOfInstitution": "1. Name of Institution *", // label · InstitutionQuestionnaire.js
  "institutionForm.enterFullInstitutionName": "Enter full institution name", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.2TypeOfInstitution": "2. Type of Institution *", // label · InstitutionQuestionnaire.js
  "institutionForm.3InstitutionRegistrationAccreditationNumber": "3. Institution Registration/Accreditation Number", // label · InstitutionQuestionnaire.js
  "institutionForm.officialRegistrationAccreditationNumber": "Official registration/accreditation number", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.4YearEstablished": "4. Year Established", // label · InstitutionQuestionnaire.js
  "institutionForm.yyyy": "YYYY", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.5PrimaryContactPerson": "5. Primary Contact Person *", // label · InstitutionQuestionnaire.js
  "institutionForm.fullNameOfPrimaryContact": "Full name of primary contact", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.6PositionTitleOfContactPerson": "6. Position/Title of Contact Person *", // label · InstitutionQuestionnaire.js
  "institutionForm.egDeanOfAgricultureHeadOf": "e.g., Dean of Agriculture, Head of Department", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.7EmailAddress": "7. Email Address *", // label · InstitutionQuestionnaire.js
  "institutionForm.8PhoneNumber": "8. Phone Number *", // label · InstitutionQuestionnaire.js
  "institutionForm.264XxXxxXxxx": "+264 XX XXX XXXX", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.9InstitutionWebsiteOptional": "9. Institution Website (optional)", // label · InstitutionQuestionnaire.js
  "institutionForm.sectionLocationInformation": "Section B: Location Information", // h2 · InstitutionQuestionnaire.js
  "institutionForm.10Country": "10. Country *", // label · InstitutionQuestionnaire.js
  "institutionForm.egNamibia": "e.g., Namibia", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.11ProvinceRegion": "11. Province/Region", // label · InstitutionQuestionnaire.js
  "institutionForm.egKhomasRegion": "e.g., Khomas Region", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.12DistrictCounty": "12. District/County", // label · InstitutionQuestionnaire.js
  "institutionForm.egWindhoekWest": "e.g., Windhoek West", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.13CityTown": "13. City/Town *", // label · InstitutionQuestionnaire.js
  "institutionForm.egWindhoek": "e.g., Windhoek", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.14CampusBranchNameIfMultiple": "14. Campus/Branch Name (if multiple)", // label · InstitutionQuestionnaire.js
  "institutionForm.mainCampusOrSpecificBranchName": "Main campus or specific branch name", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.15GpsCoordinatesOptional": "15. GPS Coordinates (optional)", // label · InstitutionQuestionnaire.js
  "institutionForm.enterAsLatitudeLongitudeDecimalDegrees": "Enter as latitude, longitude (decimal degrees)", // p · InstitutionQuestionnaire.js
  "institutionForm.sectionAgriculturalQualificationsPrograms": "Section C: Agricultural Qualifications & Programs", // h2 · InstitutionQuestionnaire.js
  "institutionForm.16AgriculturalProgramsOfferedCheckAll": "16. Agricultural programs offered * (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.17ShortCoursesCertificationsOffered": "17. Short Courses / Certifications Offered", // label · InstitutionQuestionnaire.js
  "institutionForm.egBeekeepingPoultryManagementIrrigationGreen": "e.g., beekeeping, poultry management, irrigation, greenhouse operation", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.listShortCoursesSeparatedByCommas": "List short courses separated by commas", // p · InstitutionQuestionnaire.js
  "institutionForm.18NumberOfAgriculturalStudentsRegistered": "18. Number of agricultural students registered per year", // label · InstitutionQuestionnaire.js
  "institutionForm.firstYearStudents": "First-year students:", // label · InstitutionQuestionnaire.js
  "institutionForm.number": "Number", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.continuingStudents": "Continuing students:", // label · InstitutionQuestionnaire.js
  "institutionForm.graduateStudentsMastersPhd": "Graduate students (Masters/PhD):", // label · InstitutionQuestionnaire.js
  "institutionForm.19NumberOfStudentsGraduatingPer": "19. Number of students graduating per year (approx.)", // label · InstitutionQuestionnaire.js
  "institutionForm.approximateNumber": "Approximate number", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.sectionExpertiseHumanResources": "Section D: Expertise & Human Resources", // h2 · InstitutionQuestionnaire.js
  "institutionForm.20AgriculturalExpertsAvailableAtThe": "20. Agricultural experts available at the institution", // label · InstitutionQuestionnaire.js
  "institutionForm.numberOfLecturersInAgriculture": "Number of lecturers in agriculture:", // label · InstitutionQuestionnaire.js
  "institutionForm.numberOfResearchers": "Number of researchers:", // label · InstitutionQuestionnaire.js
  "institutionForm.numberOfExtensionOfficers": "Number of extension officers:", // label · InstitutionQuestionnaire.js
  "institutionForm.numberOfTechnicalInstructors": "Number of technical instructors:", // label · InstitutionQuestionnaire.js
  "institutionForm.21AreasOfExpertiseAvailableCheck": "21. Areas of expertise available * (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.22WouldYourExpertsBeAvailable": "22. Would your experts be available for: (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.sectionResearchCapacityNeeds": "Section E: Research Capacity & Needs", // h2 · InstitutionQuestionnaire.js
  "institutionForm.23DoesTheInstitutionConductAgricultural": "23. Does the institution conduct agricultural research?", // label · InstitutionQuestionnaire.js
  "institutionForm.24MainResearchAreas": "24. Main research areas", // label · InstitutionQuestionnaire.js
  "institutionForm.egCropImprovementDroughtResistantVarieties": "e.g., crop improvement, drought-resistant varieties, livestock breeds, soil health, climate change", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.25AverageNumberOfAgriculturalResearch": "25. Average number of agricultural research projects per year", // label · InstitutionQuestionnaire.js
  "institutionForm.numberOfProjects": "Number of projects", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.26WhatTypeOfResearchData": "26. What type of research data would the institution like to obtain through the platform? (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.27DoesTheInstitutionRequireAccess": "27. Does the institution require access to field research farms or farmer cooperatives?", // label · InstitutionQuestionnaire.js
  "institutionForm.preferredResearchSupportCheckAllThat": "Preferred research support: (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.sectionTrainingProgramsOutreach": "Section F: Training Programs & Outreach", // h2 · InstitutionQuestionnaire.js
  "institutionForm.28TypesOfTrainingProgramsThe": "28. Types of training programs the institution can offer: (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.29NumberOfTrainingProgramsConducted": "29. Number of training programs conducted yearly (approx.)", // label · InstitutionQuestionnaire.js
  "institutionForm.30TargetGroupsServedCheckAll": "30. Target groups served: (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.sectionInternshipsPracticalTraining": "Section G: Internships & Practical Training", // h2 · InstitutionQuestionnaire.js
  "institutionForm.31NumberOfAgriculturalStudentsNeeding": "31. Number of agricultural students needing internships per year", // label · InstitutionQuestionnaire.js
  "institutionForm.numberOfStudents": "Number of students", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.32PreferredInternshipDuration": "32. Preferred internship duration", // label · InstitutionQuestionnaire.js
  "institutionForm.33PreferredInternshipPlacementAreasCheck": "33. Preferred internship placement areas: (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.34SupportExpectedFromHostFarms": "34. Support expected from host farms or companies: (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.sectionSolutionsContributionToAgriculture": "Section H: Solutions & Contribution to Agriculture", // h2 · InstitutionQuestionnaire.js
  "institutionForm.35AgriculturalChallengesTheInstitutionCan": "35. Agricultural challenges the institution can help solve: (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.36TypesOfSolutionsTheInstitution": "36. Types of solutions the institution can provide: (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.sectionAdditionalInformation": "Section I: Additional Information", // h2 · InstitutionQuestionnaire.js
  "institutionForm.37DoesTheInstitutionHaveDemonstration": "37. Does the institution have demonstration farms?", // label · InstitutionQuestionnaire.js
  "institutionForm.specifySizeAndTypeOfDemonstration": "Specify size and type of demonstration farms:", // label · InstitutionQuestionnaire.js
  "institutionForm.eg50HectaresCropFarm20": "e.g., 50 hectares crop farm, 20 hectares livestock farm", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.38DoesTheInstitutionCollaborateWith": "38. Does the institution collaborate with other agricultural stakeholders? (Check all that apply)", // label · InstitutionQuestionnaire.js
  "institutionForm.39AnyAdditionalServicesOrCapabilities": "39. Any additional services or capabilities to highlight?", // label · InstitutionQuestionnaire.js
  "institutionForm.describeAnyAdditionalServicesCapabilitiesOr": "Describe any additional services, capabilities, or partnerships", // placeholder · InstitutionQuestionnaire.js
  "institutionForm.tertiaryInstitutionRegistrationQuestionnaire": "Tertiary Institution Registration Questionnaire", // h1 · InstitutionQuestionnaire.js
  "institutionForm.completeAllSectionsToRegisterYour": "Complete all sections to register your institution on AfriAgriFed", // p · InstitutionQuestionnaire.js
  "institutionForm.institutionNameIsRequired": "Institution name is required", // validation message · InstitutionQuestionnaire.js
  "institutionForm.institutionTypeIsRequired": "Institution type is required", // validation message · InstitutionQuestionnaire.js
  "institutionForm.primaryContactPersonIsRequired": "Primary contact person is required", // validation message · InstitutionQuestionnaire.js
  "institutionForm.contactPersonTitleIsRequired": "Contact person title is required", // validation message · InstitutionQuestionnaire.js
  "institutionForm.emailAddressIsRequired": "Email address is required", // validation message · InstitutionQuestionnaire.js
  "institutionForm.emailAddressIsInvalid": "Email address is invalid", // validation message · InstitutionQuestionnaire.js
  "institutionForm.phoneNumberIsRequired": "Phone number is required", // validation message · InstitutionQuestionnaire.js
  "institutionForm.countryIsRequired": "Country is required", // validation message · InstitutionQuestionnaire.js
  "institutionForm.cityTownIsRequired": "City/Town is required", // validation message · InstitutionQuestionnaire.js
  "institutionForm.pleaseSelectAtLeastOneAgricultural": "Please select at least one agricultural program", // validation message · InstitutionQuestionnaire.js
  "institutionForm.pleaseSelectAtLeastOneArea": "Please select at least one area of expertise", // validation message · InstitutionQuestionnaire.js
  "institutionForm.completeRegistration": "Complete Registration", // either/or · InstitutionQuestionnaire.js
  "institutionForm.nextSection": "Next Section", // either/or · InstitutionQuestionnaire.js
  // ---- internships ----
  "internships.pleaseAddTitle": "Please add a title.", // toast.error · Internships.js
  "internships.closed": "Closed", // span · Internships.js
  "internships.offerApprove": "Offer & Approve", // button · Internships.js
  "internships.requestPlacement": "Request Placement", // button · Internships.js
  "internships.open": "Open", // span · Internships.js
  "internships.pendingFarmerApproval": "Pending farmer approval", // span · Internships.js
  "internships.approved": "Approved", // span · Internships.js
  "internships.producersInstitutions": "Producers & institutions", // eyebrow · Internships.js
  "internships.internships": "Internships", // title · Internships.js
  "internships.farmersOfferPlacementsInstitutionsRequestThe": "Farmers offer placements, institutions request them. Farmers give the final approval.", // subtitle · Internships.js
  "internships.title": "Title", // label · Internships.js
  "internships.description": "Description", // label · Internships.js
  "internships.location": "Location", // label · Internships.js
  "internships.slots": "Slots", // label · Internships.js
  "internships.noInternshipListingsYet": "No internship listings yet.", // p · Internships.js
  "internships.offerAnInternship": "Offer an Internship", // either/or · Internships.js
  "internships.requestAnInternship": "Request an Internship", // either/or · Internships.js
  "internships.postOffer": "Post Offer", // either/or · Internships.js
  "internships.postRequest": "Post Request", // either/or · Internships.js
  "internships.farmerOffer": "Farmer Offer", // either/or · Internships.js
  "internships.institutionRequest": "Institution Request", // either/or · Internships.js
  "internships.posting": "Posting...", // either/or · Internships.js
  "internships.couldNotPost": "Could not post internship: {error}", // error toast
  "internships.aFarmer": "A farmer", // used in a notification when the farmer has no name
  "internships.anInstitution": "An institution", // used in a notification when the institution has no name
  "internships.approveName": "Approve {name}", // button: approve the institution that claimed an offer
  "internships.slots_one": "{count} slot", // number of places on an internship
  "internships.slots_other": "{count} slots", // number of places on an internship
  "internships.postedBy": "Posted by {name}", // who posted an internship
  // ---- language ----
  "language.label": "Language", // accessible name of the language picker
  "language.betaNote": "This translation is new. If something reads wrong, please tell us.", // shown under the picker for beta languages
  "language.name.en": "English", // the name of the language, in the reader's own language (e.g. in 'Translated from English')
  "language.name.af": "Afrikaans", // the name of the language, in the reader's own language
  // ---- listing ----
  "listing.examplePhoto": "Example photo", // span · ListingCard.js
  "listing.yourListing": "Your listing", // span · ListingCard.js
  "listing.soldOut": "Sold out", // span · ListingCard.js
  "listing.askWhenItBack": "Ask when it's back", // button · ListingCard.js
  "listing.oneFewer": "One fewer", // aria-label · ListingCard.js
  "listing.quantity": "Quantity", // aria-label · ListingCard.js
  "listing.oneMore": "One more", // aria-label · ListingCard.js
  "listing.orderProtectedByTheAfriagrifedPayment": "Order protected by the AfriAgriFed Payment Guarantee", // p · ListingCard.js
  "listing.messageSeller": "Message seller", // button · ListingCard.js
  "listing.onlinePaymentComingSoon": "Online payment coming soon", // either/or · ListingCard.js
  "listing.soldBy": "Sold by {name}", // on a marketplace card
  "listing.quantityOf": "Quantity of {product}", // accessible name of the quantity box
  "listing.paymentMethods": "Card, mobile money or bank transfer, all handled securely by our payment partner.", // small print under the pay button
  "listing.buyNow": "Buy now · {amount}", // the green button on a listing; {amount} is the total price
  "listing.addToBasket": "Add to basket", // button on a listing
  "listing.deliveryAvailable": "Delivery available", // small line on a listing
  "listing.collectOnly": "Collect from the seller", // small line on a listing
  // ---- listings ----
  "listings.fillInYourBusinessNameBank": "Fill in your business name, bank and account number.", // toast.error · MyListings.js
  "listings.payoutsAreSetUpYourListings": "Payouts are set up. Your listings can now accept payment.", // toast.success · MyListings.js
  "listings.addProductNameAndPrice": "Add a product name and price.", // toast.error · MyListings.js
  "listings.listingUpdated": "Listing updated.", // toast.success · MyListings.js
  "listings.listingPostedToTheMarketplace": "Listing posted to the marketplace.", // toast.success · MyListings.js
  "listings.listingRemoved": "Listing removed.", // toast.success · MyListings.js
  "listings.producerWorkspace": "Producer workspace", // eyebrow · MyListings.js
  "listings.myListings": "My Listings", // title · MyListings.js
  "listings.manageWhatYouReSellingOn": "Manage what you're selling on the AfriAgriFed marketplace.", // subtitle · MyListings.js
  "listings.setUpPayouts": "Set up payouts", // h3 · MyListings.js
  "listings.addYourBankDetailsOnceSo": "Add your bank details once so buyers can pay you directly through the app. AfriAgriFed automatically deducts its commission and sends the rest to this account.", // p · MyListings.js
  "listings.businessFarmName": "Business / farm name", // label · MyListings.js
  "listings.egGreenValleyFarm": "e.g., Green Valley Farm", // placeholder · MyListings.js
  "listings.bank": "Bank", // label · MyListings.js
  "listings.selectYourBank": "Select your bank", // option · MyListings.js
  "listings.bankListUnavailablePaymentsArenConfigured": "Bank list unavailable - payments aren't configured yet (needs a Flutterwave API key).", // span · MyListings.js
  "listings.accountNumber": "Account number", // label · MyListings.js
  "listings.bankAccountNumber": "Bank account number", // placeholder · MyListings.js
  "listings.payoutsAreSetUpYourListings2": "Payouts are set up - your listings can accept payment.", // div · MyListings.js
  "listings.product": "Product", // label · MyListings.js
  "listings.egTomatoes": "e.g., Tomatoes", // placeholder · MyListings.js
  "listings.price": "Price (N$)", // label · MyListings.js
  "listings.unit": "Unit", // label · MyListings.js
  "listings.perKg": "per kg", // option · MyListings.js
  "listings.perUnit": "per unit", // option · MyListings.js
  "listings.perTray": "per tray", // option · MyListings.js
  "listings.perBunch": "per bunch", // option · MyListings.js
  "listings.perLitre": "per litre", // option · MyListings.js
  "listings.quantityAvailableOptional": "Quantity available (optional)", // label · MyListings.js
  "listings.photoOptional": "Photo (optional)", // label · MyListings.js
  "listings.listing": "Listing", // alt · MyListings.js
  "listings.removePhoto": "Remove photo", // aria-label · MyListings.js
  "listings.addPhotoBuyersWillSee": "Add a photo buyers will see", // span · MyListings.js
  "listings.youHavenPostedAnyListingsYet": "You haven't posted any listings yet.", // p · MyListings.js
  "listings.edit": "Edit", // aria-label · MyListings.js
  "listings.remove": "Remove", // aria-label · MyListings.js
  "listings.recentSales": "Recent Sales", // h3 · MyListings.js
  "listings.noSalesRecordedYet": "No sales recorded yet.", // p · MyListings.js
  "listings.amount": "Amount", // th · MyListings.js
  "listings.status": "Status", // th · MyListings.js
  "listings.date": "Date", // th · MyListings.js
  "listings.settingUp": "Setting up...", // either/or · MyListings.js
  "listings.setUpPayouts2": "Set Up Payouts", // either/or · MyListings.js
  "listings.editListing": "Edit Listing", // either/or · MyListings.js
  "listings.addListing": "Add a Listing", // either/or · MyListings.js
  "listings.saveChanges": "Save Changes", // either/or · MyListings.js
  "listings.postListing": "Post Listing", // either/or · MyListings.js
  "listings.soldOutEditTheQuantityTo": "Sold out. Edit the quantity to restock.", // either/or · MyListings.js
  "listings.saving": "Saving...", // either/or · MyListings.js
  "listings.couldNotSetUpPayouts": "Could not set up payouts", // error
  "listings.removeConfirm": "Remove \"{product}\" from the marketplace?", // confirmation question
  "listings.delivery.title": "How can buyers get this?", // heading on the listing form
  "listings.delivery.help": "Choose every way you are happy with. Buyers pick one when they pay.",
  "listings.delivery.collect": "Buyers collect from me (free)", // checkbox
  "listings.delivery.own": "I deliver myself, in my own vehicle", // checkbox
  "listings.delivery.baseFee": "Fee for any delivery (N$)", // label
  "listings.delivery.perKm": "Plus per km (N$)", // label
  "listings.delivery.maxKm": "Furthest I deliver (km)", // label
  "listings.delivery.platform": "An AfriAgriFed carrier may deliver it", // checkbox
  "listings.delivery.platformHelp": "We do not own vehicles: carriers from our network collect the order from you and bring it to the buyer, who pays the delivery fee. You tell us when the order is ready.",
  "listings.delivery.needPin": "Mark your place on the map above so delivery can be worked out.",
  "listings.delivery.problem.none": "Choose at least one way for buyers to get this.", // toast
  "listings.delivery.problem.fees": "Check the delivery fees and distance: they are out of range.", // toast
  "listings.delivery.problem.pin": "Mark your place on the map to offer delivery.", // toast
  // ---- location ----
  "location.town": "Town", // aria-label · LocationPicker.js
  "location.removeTheLocation": "Remove the location", // aria-label · LocationPicker.js
  "location.withLocationYourPostGetsPin": "With a location your post gets a pin on the Market Map. We show the area (about 1 km), never your exact spot.", // p · LocationPicker.js
  "location.chooseTown": "Choose a town", // either/or · LocationPicker.js
  "location.useMyLocation": "Use my location", // either/or · LocationPicker.js
  "location.whereIsItOptional": "Where is it? (optional)", // default text · LocationPicker.js
  "location.finding": "Finding...", // either/or · LocationPicker.js
  "location.near": "Near {name}", // a pin placed from a phone's location, near a town
  "location.pinnedAt": "Pinned at {place}", // under the location picker
  "location.blocked": "Location is blocked for this site. Allow it in your browser, or pick a town.", // error
  "location.notFound": "Your location couldn't be found. Pick a town instead.", // error
  // ---- map ----
  "map.hoursAgo": "{hours} h ago", // how long ago a map frame was, in hours
  "map.inHours": "in {hours} h", // how far ahead a forecast frame is, in hours
  "map.now": "now", // the map frame is the current time
  // ---- mapControls ----
  "mapControls.toggleAttribution": "Toggle attribution", // button on the map that shows who the map data is from
  "mapControls.mapFeedback": "Map feedback", // link on the map
  "mapControls.map": "Map", // accessible name of the map
  "mapControls.marker": "Map marker", // accessible name of a pin on the map
  "mapControls.resetBearing": "Reset bearing to north", // map button
  "mapControls.zoomIn": "Zoom in", // map button
  "mapControls.zoomOut": "Zoom out", // map button
  "mapControls.closePopup": "Close popup", // map button
  // ---- mapDetails ----
  "mapDetails.fireHotspotDataIsUnavailableRight": "Fire hotspot data is unavailable right now.", // p · MapDetails.js
  "mapDetails.hotspotsAreSatelliteHeatDetectionsNot": "Hotspots are satellite heat detections, not confirmed fires. Satellites pass a few times a day, so no dot does not guarantee safety. Source: NASA FIRMS.", // p · MapDetails.js
  "mapDetails.loadingConditions": "Loading conditions…", // p · MapDetails.js
  "mapDetails.weatherIsUnavailableRightNow": "Weather is unavailable right now.", // p · MapDetails.js
  "mapDetails.whatSuitsThisArea": "What suits this area", // h4 · MapDetails.js
  "mapDetails.indicativeOnlyBasedOn30Year": "Indicative only. Based on 30-year regional climate averages (about 50 km resolution) and rain-fed crops of northern Namibia; it does not know your soil. In the drier south most crops need irrigation. Check with your local agricultural extension officer before planting decisions.", // p · MapDetails.js
  "mapDetails.climateAveragesAreUnavailableRightNow": "Climate averages are unavailable right now, so crop advice cannot be shown.", // p · MapDetails.js
  "mapDetails.dailyRainMmAndHighNext": "Daily rain (mm) and high (°C), next 7 days. Weather: Open-Meteo.com (CC BY 4.0).", // p · MapDetails.js
  "mapDetails.outsideNamibia": "Outside Namibia", // either/or · MapDetails.js
  "mapDetails.noFires": "No fire hotspots seen within {km} km in the last 48 hours.", // fire watch
  "mapDetails.fireNear": "{hotspots} within {km} km in the last 48 hours. Nearest is {distance} km away, seen {age}.", // fire watch; {hotspots} is e.g. 2 fire hotspots (bold)
  "mapDetails.hotspotCount_one": "{count} fire hotspot", // fire watch
  "mapDetails.hotspotCount_other": "{count} fire hotspots", // fire watch
  "mapDetails.regionName": "{name} Region", // heading for a region of Namibia
  "mapDetails.inTown": "in {name}", // under a map pin
  "mapDetails.kmFromTown": "about {km} km from {name}", // under a map pin
  "mapDetails.floodHigh": "River flow much higher than usual in the next 7 days ({ratio}× the seasonal mean). Check low-lying fields and oshanas.", // flood warning; oshanas are seasonal floodplains in northern Namibia
  "mapDetails.floodUp": "River flow higher than usual in the next 7 days ({ratio}× the seasonal mean). Check low-lying fields and oshanas.", // flood warning
  "mapDetails.rainySeason": "The rainy season (Nov–Apr) brings about {mm} mm here on average.", // crop advice
  "mapDetails.rainySeasonOnset": "The rainy season (Nov–Apr) brings about {mm} mm here on average, and rains usually start in {month}.", // crop advice
  "mapDetails.forecastFor": "Forecast for this exact spot (corrected for its altitude), as of {time} Namibian time", // weather panel
  "mapDetails.humidity": "{value}% humidity", // weather panel
  "mapDetails.rainPastHour": "{mm} mm in the past hour", // weather panel
  "mapDetails.rainMm": "{mm} mm", // weather panel
  "mapDetails.rainChance": "{value}% chance of rain, next 3 h", // weather panel
  "mapDetails.topsoil": "Topsoil {value}% moisture", // weather panel
  "mapDetails.dayTitle": "{date}: {rain} mm rain, {min}–{max}°C", // tooltip on a day in the 7-day forecast
  // ---- marketCard ----
  "marketCard.examplePhoto": "Example photo", // span · FeedMarketCard.js
  "marketCard.marketplaceForSale": "Marketplace · For sale", // either/or · FeedMarketCard.js
  "marketCard.demandBoardWanted": "Demand Board · Wanted", // either/or · FeedMarketCard.js
  "marketCard.viewInMarketplace": "View in Marketplace", // either/or · FeedMarketCard.js
  "marketCard.seePledges": "See pledges", // either/or · FeedMarketCard.js
  "marketCard.pledgeOnTheDemandBoard": "Pledge on the Demand Board", // either/or · FeedMarketCard.js
  "marketCard.aMember": "a member", // shown when the poster has no name
  "marketCard.ariaForSale": "For sale: {title}", // accessible name of a market card in the feed
  "marketCard.ariaWanted": "Wanted: {title}", // accessible name of a market card in the feed
  "marketCard.messageSeller": "Message seller", // button on a market card
  "marketCard.messageBuyer": "Message buyer", // button on a market card
  "marketCard.soldByYou": "Sold by you", // under a listing you posted
  "marketCard.soldByName": "Sold by {name}", // under a listing posted by someone else
  "marketCard.requestedByYou": "Requested by you", // under a request you posted
  "marketCard.requestedByName": "Requested by {name}", // under a request posted by someone else
  // ---- marketLocation ----
  "marketLocation.thisBrowserCanShareYourLocation": "This browser can't share your location. Pick a town instead.", // error message · marketLocation.js
  "marketLocation.youSeemToBeOutsideNamibia": "You seem to be outside Namibia. Pick a town instead.", // error message · marketLocation.js
  // ---- marketMap ----
  "marketMap.openOnDemandBoard": "Open on Demand Board", // button · MarketMap.js
  "marketMap.marketplace": "Marketplace", // eyebrow · MarketMap.js
  "marketMap.marketMap": "Market Map", // title · MarketMap.js
  "marketMap.whereProduceIsForSaleAnd": "Where produce is for sale and where buyers need it. Pins show the area, never anyone's exact spot.", // subtitle · MarketMap.js
  "marketMap.addPinChooseWhereIsIt": "Add a pin: choose \"Where is it?\" when you post a listing or a Demand Board request.", // span · MarketMap.js
  "marketMap.thisBrowserCanDrawMapsRight": "This browser can't draw maps right now (graphics are switched off), so here are the same posts by place.", // p · MarketMap.js
  "marketMap.noPostsWithLocationYet": "No posts with a location yet.", // p · MarketMap.js
  "marketMap.forSale": "For sale", // either/or · MarketMap.js
  "marketMap.soldOut": "· sold out", // either/or · MarketMap.js
  "marketMap.member": "a member", // either/or · MarketMap.js
  "marketMap.seeMarketplace": "See marketplace", // either/or · MarketMap.js
  "marketMap.buyInMarketplace": "Buy in marketplace", // either/or · MarketMap.js
  "marketMap.wanted": "Wanted", // either/or · MarketMap.js
  "marketMap.postsAt": "Posts at {place}", // accessible name of the card for a pin
  "marketMap.left": "{count} left", // stock left on a listing, after the price
  "marketMap.needed": "{quantity} {unit} needed", // what a buyer wants
  "marketMap.neededBy": "{quantity} {unit} needed by {date}", // what a buyer wants, and by when
  "marketMap.messageSeller": "Message seller", // button
  "marketMap.messageBuyer": "Message buyer", // button
  "marketMap.pinLabel": "{place}: {sale} for sale, {wanted} wanted", // accessible name of a pin on the map
  "marketMap.postsCount_one": "{count} post", // label on a map pin that groups posts
  "marketMap.postsCount_other": "{count} posts", // label on a map pin that groups posts
  "marketMap.wantedPin": "Wanted: {title}", // label on a map pin
  "marketMap.forSaleChip": "For sale ({count})", // filter button above the map
  "marketMap.wantedChip": "Wanted ({count})", // filter button above the map
  "marketMap.whereIsIt": "Where is it?", // the name of the location question on the post forms; keep it the same as in location.whereIsItOptional
  "marketMap.noPostsYet": "No posts with a location yet. When you add a listing or a Demand Board request, choose {where} and it appears here.", // shown over an empty map; {where} is the name of the location question (bold)
  "marketMap.soldByYou": "Sold by you", // on a pin card: a listing you posted
  "marketMap.soldByName": "Sold by {name}", // on a pin card
  "marketMap.requestedByYou": "Requested by you", // on a pin card: a request you posted
  "marketMap.requestedByName": "Requested by {name}", // on a pin card
  // ---- messages ----
  "messages.backToAllConversations": "Back to all conversations", // aria-label · Messages.js
  "messages.noMessagesYetAskAboutAvailability": "No messages yet. Ask about availability, quantity, delivery or collection.", // p · Messages.js
  "messages.account": "Account", // eyebrow · Messages.js
  "messages.messages": "Messages", // title · Messages.js
  "messages.privateConversationsWithTheBuyersAnd": "Private conversations with the buyers and sellers you deal with. Everything stays on AfriAgriFed.", // subtitle · Messages.js
  "messages.conversations": "Conversations", // aria-label · Messages.js
  "messages.noConversationsYetUseMessageSeller": "No conversations yet. Use \"Message seller\" on a listing, \"Message\" on an order, or \"Message buyer\" on a bulk request to start one.", // p · Messages.js
  "messages.unread": "Unread", // aria-label · Messages.js
  "messages.noMessagesYet": "No messages yet", // either/or · Messages.js
  "messages.thisConversationCouldNotBeFound": "This conversation could not be found.", // either/or · Messages.js
  "messages.chooseConversationToReadIt": "Choose a conversation to read it.", // either/or · Messages.js
  "messages.thatMessageCanBeSentPhone": "That message can't be sent. Phone numbers, e-mails and links are not allowed in chats.", // toast.error · Messages.js
  "messages.about": "About", // either/or · Messages.js
  "messages.couldNotLoad": "Could not load messages: {error}", // toast
  "messages.conversationWith": "Conversation with {name}", // accessible name of a conversation
  "messages.viewListing": "View listing", // button in a conversation about a listing
  "messages.viewOrder": "View order", // button in a conversation about an order
  "messages.viewDelivery": "View delivery", // button in a conversation about an order's delivery (with the carrier)
  "messages.viewRequest": "View bulk request", // button in a conversation about a Demand Board request
  "messages.messageName": "Message {name}", // label of the message box (not visible)
  "messages.messageNameEllipsis": "Message {name}...", // placeholder of the message box
  "messages.couldNotLoadYours": "Could not load your messages: {error}", // error message
  "messages.sending": "sending...", // time shown on a message that is still being sent
  // ---- nav ----
  "nav.researchDesk": "Research Desk", // sidebar item
  "nav.communityFeed": "Community Feed", // sidebar item
  "nav.communityFeedHint": "Talk: news, photos, tips and questions", // hover text of the Community Feed item
  "nav.marketplace": "Marketplace", // sidebar item
  "nav.marketplaceHint": "Buy: ready-to-sell listings", // hover text of the Marketplace item
  "nav.demandBoard": "Demand Board", // sidebar item
  "nav.demandBoardHint": "Request: buyers post bulk needs, producers pledge", // hover text of the Demand Board item
  "nav.marketMap": "Market Map", // sidebar item
  "nav.marketMapHint": "Where produce is for sale and where it's wanted", // hover text of the Market Map item
  "nav.myListings": "My Listings", // sidebar item (producers)
  "nav.research": "Research", // sidebar item
  "nav.trainingPrograms": "Training Programs", // sidebar item
  "nav.internships": "Internships", // sidebar item
  "nav.weatherMap": "Weather Map", // sidebar item
  "nav.weatherMapHint": "Live weather, satellite and fire hotspots", // hover text of the Weather Map item
  "nav.dataDashboard": "Data Dashboard", // sidebar item
  "nav.statistics": "Statistics", // sidebar item
  "nav.promotions": "Promotions", // sidebar item
  "nav.messages": "Messages", // sidebar item
  "nav.messagesHint": "Private chats with buyers and sellers", // hover text of the Messages item
  "nav.orderTracker": "Order Tracker", // sidebar item
  "nav.myOrders": "My Orders", // sidebar item
  "nav.profile": "Profile", // sidebar item
  "nav.workspace": "Workspace", // sidebar section heading
  "nav.insights": "Insights", // sidebar section heading
  "nav.account": "Account", // sidebar section heading
  "nav.basket": "Basket", // sidebar item
  "nav.basketHint": "What you chose to buy, by seller", // sidebar tooltip
  "nav.deliverForUs": "Deliver for us", // sidebar item: become a carrier
  "nav.deliverForUsHint": "Earn by delivering orders with your own vehicle", // sidebar tooltip
  // ---- noMapFallback ----
  "noMapFallback.theMapCanBeDrawnIn": "The map can't be drawn in this browser right now", // h2 · NoMapFallback.js
  "noMapFallback.tryAgain": "Try again", // button · NoMapFallback.js
  "noMapFallback.weatherNowByRegion": "Weather now, by region", // h2 · NoMapFallback.js
  "noMapFallback.loadingTheForecast": "Loading the forecast...", // p · NoMapFallback.js
  "noMapFallback.theWeatherServiceIsnAnsweringRight": "The weather service isn't answering right now. Please try again later.", // setError · NoMapFallback.js
  "noMapFallback.explain": "It needs your browser's graphics (WebGL), which is switched off or was blocked after a graphics problem. Usually restarting the browser fixes it. In Chrome you can also open {settings} and turn on {option}, then restart Chrome.", // help text when the map cannot be drawn; {settings} and {option} are bold names from the Chrome menu
  "noMapFallback.settingsSystem": "Settings, System", // menu path in Chrome
  "noMapFallback.accelOption": "\"Use graphics acceleration when available\"", // name of a Chrome setting (Chrome shows it in its own language)
  "noMapFallback.forecastNote": "Each town's own forecast (corrected for its altitude).", // caption above the town list
  "noMapFallback.forecastNoteAsOf": "Each town's own forecast (corrected for its altitude), as of {time} Namibian time.", // caption above the town list
  "noMapFallback.mmPastHour": "{mm} mm past hour", // rain in a town
  "noMapFallback.rainChance": "{value}% rain chance, 3 h", // rain chance in a town
  // ---- notif ----
  "notif.pledge.title": "New pledge on your request", // notification title
  "notif.pledge.body": "{name} can supply {qty} {unit} of {product}.", // notification text
  "notif.message.title": "New message from {name}", // notification title
  "notif.message.body": "{what}", // notification text: the start of the message
  "notif.order.confirmed.title": "Order confirmed", // notification title
  "notif.order.confirmed.body": "The seller confirmed your order for {product}.", // notification text
  "notif.order.dispatched.title": "Order dispatched", // notification title
  "notif.order.dispatched.body": "{product} has been dispatched.", // notification text
  "notif.order.in_transit.title": "Order on its way", // notification title
  "notif.order.in_transit.body": "{product} is in transit to you.", // notification text
  "notif.order.delivered.title": "Delivery confirmed", // notification title
  "notif.order.delivered.body": "{product} was delivered.", // notification text
  "notif.internship.approved.title": "Internship request approved", // notification title
  "notif.internship.approved.body": "{name} approved your request: {item}", // notification text
  "notif.internship.claimed.title": "Internship offer claimed", // notification title
  "notif.internship.claimed.body": "{name} wants to fill: {item}. Please approve.", // notification text
  "notif.internship.placement.title": "Internship placement approved", // notification title
  "notif.internship.placement.body": "Your placement request for \"{item}\" was approved.", // notification text
  "notif.account.approved.title": "Your account was approved", // notification title
  "notif.account.approved.body": "You can now sign in and access your dashboard.", // notification text
  "notif.account.rejected.title": "Your account was not approved", // notification title
  "notif.account.rejected.body": "{reason}", // notification text: the reason the administrator wrote (shown as written)
  "notif.research.answered.title": "Your research problem was answered", // notification title
  "notif.research.answered.body": "{item}", // notification text: the title of the answering article
  "notif.order.paid.title": "New order", // notification title
  "notif.order.paid.body": "{what} was just paid for. Confirm it to start fulfilment.", // notification text; {what} is e.g. 3 x Tomatoes
  "notif.order.oversold.title": "Order needs your attention", // notification title
  "notif.order.oversold.body": "Only {qty} of {what} were left when this order was paid, so it cannot be filled in full. Contact the buyer, or ask for a refund.", // notification text
  "notif.delivery.jobOpen.title": "New delivery job", // notification title
  "notif.delivery.jobOpen.body": "{what} to {name}. Open Deliver for us to take it.", // notification text
  "notif.delivery.carrierAssigned.title": "Carrier assigned", // notification title
  "notif.delivery.carrierAssigned.body": "{name} is the carrier for {product}.", // notification text
  "notif.delivery.carrierDropped.title": "Carrier dropped the job", // notification title
  "notif.delivery.carrierDropped.body": "The carrier for {product} can no longer collect it. We are finding another.", // notification text
  "notif.delivery.pickedUp.title": "Collected by the carrier", // notification title
  "notif.delivery.pickedUp.body": "{name} collected {product}.", // notification text
  "notif.delivery.nearby.title": "Almost there", // notification title
  "notif.delivery.nearby.body": "Your delivery of {product} is about 1 km away.", // notification text
  "notif.delivery.arrived.title": "Your delivery has arrived", // notification title
  "notif.delivery.arrived.body": "Give the handover code to receive {product}.", // notification text
  "notif.delivery.codeLocked.title": "Handover code locked", // notification title
  "notif.delivery.codeLocked.body": "Too many wrong codes were tried for {product}. Support will contact you.", // notification text
  "notif.delivery.noCarrier.title": "No carrier yet", // notification title
  "notif.delivery.noCarrier.body": "No carrier has taken the delivery of {product} yet. Support has been told.", // notification text
  "notif.order.cancelledByBuyer.title": "Order cancelled", // notification title
  "notif.order.cancelledByBuyer.body": "The buyer cancelled {product}.", // notification text
  "notif.order.cancelledBySeller.title": "Order cancelled", // notification title
  "notif.order.cancelledBySeller.body": "The seller cancelled {product}: {reason}. Your money is being returned.", // notification text
  "notif.order.cancelledBySupport.title": "Order cancelled", // notification title
  "notif.order.cancelledBySupport.body": "Support cancelled {product}. The buyer's money is being returned.", // notification text
  "notif.order.autoCancelledBuyer.title": "Order cancelled", // notification title
  "notif.order.autoCancelledBuyer.body": "The seller did not confirm {product} in time, so it was cancelled and your money is being returned.", // notification text
  "notif.order.autoCancelledSeller.title": "Order cancelled", // notification title
  "notif.order.autoCancelledSeller.body": "{product} was cancelled because it was not confirmed in time.", // notification text
  "notif.order.disputed.title": "Problem reported", // notification title
  "notif.order.disputed.body": "The buyer reported a problem with {product}. Support will look into it.", // notification text
  "notif.order.resolvedRelease.title": "Problem resolved", // notification title
  "notif.order.resolvedRelease.body": "Support decided on {product}: the seller is paid.", // notification text
  "notif.order.resolvedRefund.title": "Problem resolved", // notification title
  "notif.order.resolvedRefund.body": "Support decided on {product}: the buyer is refunded.", // notification text
  "notif.delivery.requestReminder.title": "Ask for a carrier", // notification title
  "notif.delivery.requestReminder.body": "{product} is waiting for you to ask for a carrier.", // notification text
  "notif.order.readyReminder.title": "Order waiting for you", // notification title
  "notif.order.readyReminder.body": "{product} is accepted. Mark it ready when it is.", // notification text
  // ---- notifications ----
  "notifications.notifications": "Notifications", // aria-label · NotificationBell.js
  "notifications.noNotificationsYet": "No notifications yet.", // p · NotificationBell.js
  // ---- opt ----
  "opt:<1 hectare": "<1 hectare", // list item · FarmerQuestionnaire.js
  "opt:<1 year": "<1 year", // list item · ConsumerQuestionnaire.js
  "opt:>10 hectares": ">10 hectares", // list item · FarmerQuestionnaire.js
  "opt:1-3 months": "1-3 months", // list item · InstitutionQuestionnaire.js
  "opt:1-3 years": "1-3 years", // list item · FarmerQuestionnaire.js
  "opt:1-5 hectares": "1-5 hectares", // list item · FarmerQuestionnaire.js
  "opt:10+ years": "10+ years", // list item · FarmerQuestionnaire.js
  "opt:3-5 years": "3-5 years", // list item · FarmerQuestionnaire.js
  "opt:3-6 months": "3-6 months", // list item · InstitutionQuestionnaire.js
  "opt:5-10 hectares": "5-10 hectares", // list item · FarmerQuestionnaire.js
  "opt:5-10 years": "5-10 years", // list item · FarmerQuestionnaire.js
  "opt:5+ years": "5+ years", // list item · ConsumerQuestionnaire.js
  "opt:6-12 months": "6-12 months", // list item · InstitutionQuestionnaire.js
  "opt:A buyer posts a need": "A buyer posts a need", // step 1 title on the Demand Board
  "opt:About": "About", // tab on the profile
  "opt:Access to loans": "Access to loans", // list item · FarmerQuestionnaire.js
  "opt:Accommodation": "Accommodation", // list item · InstitutionQuestionnaire.js
  "opt:Additional Information": "Additional Information", // list item · InstitutionQuestionnaire.js
  "opt:Admin": "Admin", // prop admin · publicProfile.js
  "opt:Advisory services": "Advisory services", // list item · InstitutionQuestionnaire.js
  "opt:Afternoon": "Afternoon", // list item · ConsumerQuestionnaire.js
  "opt:Agree and deliver": "Agree and deliver", // step 3 title
  "opt:Agri-processing": "Agri-processing", // list item · InstitutionQuestionnaire.js
  "opt:Agribusiness & marketing": "Agribusiness & marketing", // list item · InstitutionQuestionnaire.js
  "opt:Agribusiness challenges": "Agribusiness challenges", // list item · InstitutionQuestionnaire.js
  "opt:Agribusiness Management": "Agribusiness Management", // list item · InstitutionQuestionnaire.js
  "opt:Agribusiness mentorship": "Agribusiness mentorship", // list item · InstitutionQuestionnaire.js
  "opt:Agribusiness performance": "Agribusiness performance", // list item · InstitutionQuestionnaire.js
  "opt:Agribusiness SMEs": "Agribusiness SMEs", // list item · InstitutionQuestionnaire.js
  "opt:Agricultural biotechnology": "Agricultural biotechnology", // list item · InstitutionQuestionnaire.js
  "opt:Agricultural Engineering": "Agricultural Engineering", // list item · InstitutionQuestionnaire.js
  "opt:Agricultural Extension": "Agricultural Extension", // list item · InstitutionQuestionnaire.js
  "opt:Agricultural Training Institute": "Agricultural Training Institute", // list item · InstitutionQuestionnaire.js
  "opt:Agro-dealer": "Agro-dealer", // list item · ConsumerQuestionnaire.js
  "opt:Agronomy": "Agronomy", // list item · InstitutionQuestionnaire.js
  "opt:Animal feed": "Animal feed", // prop label · farmInputs.js
  "opt:Animal production": "Animal production", // list item · InstitutionQuestionnaire.js
  "opt:Approved": "Approved", // account status
  "opt:April": "April", // month name
  "opt:Aquaculture farming": "Aquaculture farming", // list item · FarmerQuestionnaire.js
  "opt:August": "August", // month name
  "opt:Bachelor of Agricultural Economics": "Bachelor of Agricultural Economics", // list item · InstitutionQuestionnaire.js
  "opt:Bachelor of Animal Science": "Bachelor of Animal Science", // list item · InstitutionQuestionnaire.js
  "opt:Bachelor of Crop Science": "Bachelor of Crop Science", // list item · InstitutionQuestionnaire.js
  "opt:Bachelor of Science in Agriculture": "Bachelor of Science in Agriculture", // list item · InstitutionQuestionnaire.js
  "opt:Bambara groundnut": "Bambara groundnut", // prop name · cropRules.js
  "opt:Beans": "Beans", // list item · ConsumerQuestionnaire.js
  "opt:Beef": "Beef", // prop name · Prices.js
  "opt:Better pricing": "Better pricing", // list item · ConsumerQuestionnaire.js
  "opt:Bi-weekly": "Bi-weekly", // list item · ConsumerQuestionnaire.js
  "opt:Boxes": "Boxes", // list item · ConsumerQuestionnaire.js
  "opt:Bulk request": "Bulk request", // what a conversation is about
  "opt:Delivery": "Delivery", // what a conversation is about
  "opt:Bulk sacks": "Bulk sacks", // list item · ConsumerQuestionnaire.js
  "opt:bunch": "bunch", // unit
  "opt:Business Details": "Business Details", // list item · ConsumerQuestionnaire.js
  "opt:Buy": "Buy", // prop job · CommunitySpaces.js
  "opt:Buyer": "Buyer", // prop consumer · publicProfile.js
  "opt:Buyer received the goods": "Buyer received the goods", // prop detail · orderStatus.js
  "opt:Buyers post a bulk quantity they need. Producers pledge to supply it.": "Buyers post a bulk quantity they need. Producers pledge to supply it.", // prop blurb · CommunitySpaces.js
  "opt:Cabbage": "Cabbage", // list item · ConsumerQuestionnaire.js
  "opt:Cancelled": "Cancelled", // prop cancelled · orderStatus.js
  "opt:Carrots": "Carrots", // list item · ConsumerQuestionnaire.js
  "opt:Cattle": "Cattle", // prop label · publicProfile.js
  "opt:Challenges & Support": "Challenges & Support", // list item · ConsumerQuestionnaire.js
  "opt:Chickens": "Chickens", // list item · ConsumerQuestionnaire.js
  "opt:Climate": "Climate", // kind of research article; the stored value stays English
  "opt:Climate change adaptation": "Climate change adaptation", // list item · InstitutionQuestionnaire.js
  "opt:Climate change/unpredictable weather": "Climate change/unpredictable weather", // list item · FarmerQuestionnaire.js
  "opt:Climate-smart agriculture": "Climate-smart agriculture", // list item · InstitutionQuestionnaire.js
  "opt:Clouds (infrared)": "Clouds (infrared)", // prop label · config.js
  "opt:Cold chain required": "Cold chain required", // list item · ConsumerQuestionnaire.js
  "opt:College": "College", // list item · InstitutionQuestionnaire.js
  "opt:Communal": "Communal", // list item · FarmerQuestionnaire.js
  "opt:Community Feed": "Community Feed", // prop label · CommunitySpaces.js
  "opt:Company/Commercial farm": "Company/Commercial farm", // list item · FarmerQuestionnaire.js
  "opt:Confirm delivery": "Confirm delivery", // prop delivered · orderStatus.js
  "opt:Confirm order": "Confirm order", // prop confirmed · orderStatus.js
  "opt:Confirmed": "Confirmed", // prop label · orderStatus.js
  "opt:Conservation agriculture": "Conservation agriculture", // list item · FarmerQuestionnaire.js
  "opt:Consumer": "Consumer", // role badge on a post; the stored value stays English
  "opt:Consumer trends": "Consumer trends", // list item · InstitutionQuestionnaire.js
  "opt:Contract farming options": "Contract farming options", // list item · ConsumerQuestionnaire.js
  "opt:Cooperative member": "Cooperative member", // list item · FarmerQuestionnaire.js
  "opt:Cooperatives": "Cooperatives", // list item · FarmerQuestionnaire.js
  "opt:Cowpeas (nawa)": "Cowpeas (nawa)", // prop name · cropRules.js
  "opt:crate": "crate", // unit
  "opt:Crates": "Crates", // list item · ConsumerQuestionnaire.js
  "opt:Crop farming": "Crop farming", // list item · FarmerQuestionnaire.js
  "opt:Crop production": "Crop production", // list item · InstitutionQuestionnaire.js
  "opt:Daily": "Daily", // list item · ConsumerQuestionnaire.js
  "opt:Data Dashboard": "Data Dashboard", // prop data · PageAccessGate.js
  "opt:December": "December", // month name
  "opt:Delivered": "Delivered", // prop label · orderStatus.js
  "opt:Demand Board": "Demand Board", // prop label · CommunitySpaces.js
  "opt:Demand requests posted": "Demand requests posted", // prop label · StatisticsDashboard.js
  "opt:Digital tools": "Digital tools", // list item · FarmerQuestionnaire.js
  "opt:Digital training (online)": "Digital training (online)", // list item · InstitutionQuestionnaire.js
  "opt:Diploma in Agriculture": "Diploma in Agriculture", // list item · InstitutionQuestionnaire.js
  "opt:Direct to consumers": "Direct to consumers", // list item · FarmerQuestionnaire.js
  "opt:Dispatched": "Dispatched", // prop label · orderStatus.js
  "opt:Documents": "Documents", // tab on the profile
  "opt:Donors and research networks": "Donors and research networks", // list item · InstitutionQuestionnaire.js
  "opt:Dry storage": "Dry storage", // list item · ConsumerQuestionnaire.js
  "opt:Each farmer pledges the amount they can supply. Several farmers can team up to cover one request.": "Each farmer pledges the amount they can supply. Several farmers can team up to cover one request.", // step 2 text
  "opt:Economics & policy": "Economics & policy", // list item · InstitutionQuestionnaire.js
  "opt:Eggs": "Eggs", // prop name · Prices.js
  "opt:Environmental conservation": "Environmental conservation", // list item · InstitutionQuestionnaire.js
  "opt:Equipment / fuel": "Equipment / fuel", // prop label · farmInputs.js
  "opt:Evening": "Evening", // list item · ConsumerQuestionnaire.js
  "opt:Expertise & Resources": "Expertise & Resources", // list item · InstitutionQuestionnaire.js
  "opt:Export buyer": "Export buyer", // list item · ConsumerQuestionnaire.js
  "opt:Export buyers": "Export buyers", // list item · FarmerQuestionnaire.js
  "opt:Extension offices": "Extension offices", // list item · InstitutionQuestionnaire.js
  "opt:Extension support programs": "Extension support programs", // list item · InstitutionQuestionnaire.js
  "opt:Family table": "Family table", // prop label · publicProfile.js
  "opt:Family-run": "Family-run", // list item · FarmerQuestionnaire.js
  "opt:Farm access": "Farm access", // list item · InstitutionQuestionnaire.js
  "opt:Farm Location & Size": "Farm Location & Size", // list item · FarmerQuestionnaire.js
  "opt:Farmer": "Farmer", // role badge on a post; the stored value stays English
  "opt:Farmer interviews": "Farmer interviews", // list item · InstitutionQuestionnaire.js
  "opt:Farmer organizations": "Farmer organizations", // list item · InstitutionQuestionnaire.js
  "opt:Farmer production data": "Farmer production data", // list item · InstitutionQuestionnaire.js
  "opt:Farmer training": "Farmer training", // list item · InstitutionQuestionnaire.js
  "opt:Farmers": "Farmers", // list item · InstitutionQuestionnaire.js
  "opt:Farming Methods & Challenges": "Farming Methods & Challenges", // list item · FarmerQuestionnaire.js
  "opt:February": "February", // month name
  "opt:Fertiliser / manure": "Fertiliser / manure", // prop label · farmInputs.js
  "opt:Field demonstrations": "Field demonstrations", // list item · InstitutionQuestionnaire.js
  "opt:Field supervision": "Field supervision", // list item · InstitutionQuestionnaire.js
  "opt:Field Trial": "Field Trial", // kind of research article; the stored value stays English
  "opt:Fish": "Fish", // list item · ConsumerQuestionnaire.js
  "opt:Fisheries & Aquaculture": "Fisheries & Aquaculture", // list item · InstitutionQuestionnaire.js
  "opt:Fixes nitrogen; fits well in rotation with mahangu.": "Fixes nitrogen; fits well in rotation with mahangu.", // prop note · cropRules.js
  "opt:Food processing": "Food processing", // list item · ConsumerQuestionnaire.js
  "opt:Food science & processing": "Food science & processing", // list item · InstitutionQuestionnaire.js
  "opt:Forecast air temperature 2 m above ground: an area picture, not corrected for hills and valleys. Rest the pointer on (or tap) a spot for its exact, altitude-corrected forecast.": "Forecast air temperature 2 m above ground: an area picture, not corrected for hills and valleys. Rest the pointer on (or tap) a spot for its exact, altitude-corrected forecast.", // prop note · config.js
  "opt:Forecast rainfall in the hour before the selected time: an area picture from points about 100 km apart, so local showers can be missed. Rest the pointer on (or tap) a spot for its exact forecast.": "Forecast rainfall in the hour before the selected time: an area picture from points about 100 km apart, so local showers can be missed. Rest the pointer on (or tap) a spot for its exact forecast.", // prop note · config.js
  "opt:Forestry & Environmental Science": "Forestry & Environmental Science", // list item · InstitutionQuestionnaire.js
  "opt:Fragile produce handling": "Fragile produce handling", // list item · ConsumerQuestionnaire.js
  "opt:Friday": "Friday", // list item · ConsumerQuestionnaire.js
  "opt:Fruits": "Fruits", // list item · ConsumerQuestionnaire.js
  "opt:Fulfilled": "Fulfilled", // filter tab on the Demand Board
  "opt:Goods are ready and handed off": "Goods are ready and handed off", // prop detail · orderStatus.js
  "opt:Government ministries": "Government ministries", // list item · InstitutionQuestionnaire.js
  "opt:Government programs": "Government programs", // list item · FarmerQuestionnaire.js
  "opt:Grain": "Grain", // prop label · publicProfile.js
  "opt:Green fields": "Green fields", // prop label · publicProfile.js
  "opt:Grocery store": "Grocery store", // list item · ConsumerQuestionnaire.js
  "opt:Groundnuts": "Groundnuts", // prop name · cropRules.js
  "opt:Guaranteed supply": "Guaranteed supply", // list item · ConsumerQuestionnaire.js
  "opt:Hardy traditional legume that copes with poor soils.": "Hardy traditional legume that copes with poor soils.", // prop note · cropRules.js
  "opt:Herbicide": "Herbicide", // prop label · farmInputs.js
  "opt:Herbs": "Herbs", // list item · ConsumerQuestionnaire.js
  "opt:High cost of inputs": "High cost of inputs", // list item · FarmerQuestionnaire.js
  "opt:High prices": "High prices", // list item · ConsumerQuestionnaire.js
  "opt:Higher yield but riskier in the dry north without irrigation.": "Higher yield but riskier in the dry north without irrigation.", // prop note · cropRules.js
  "opt:Hired transport": "Hired transport", // list item · FarmerQuestionnaire.js
  "opt:Honey": "Honey", // list item · ConsumerQuestionnaire.js
  "opt:Horticulture": "Horticulture", // list item · InstitutionQuestionnaire.js
  "opt:Hybrid": "Hybrid", // how a training programme is run; the stored value stays English
  "opt:In transit": "In transit", // prop label · orderStatus.js
  "opt:In-person": "In-person", // how a training programme is run; the stored value stays English
  "opt:Inconsistent supply": "Inconsistent supply", // list item · ConsumerQuestionnaire.js
  "opt:Individual Buyer": "Individual Buyer", // list item · ConsumerQuestionnaire.js
  "opt:Innovation development": "Innovation development", // list item · InstitutionQuestionnaire.js
  "opt:Inputs & Resources": "Inputs & Resources", // list item · FarmerQuestionnaire.js
  "opt:Institution": "Institution", // prop institution · publicProfile.js
  "opt:Institutional Information": "Institutional Information", // list item · InstitutionQuestionnaire.js
  "opt:Insurance": "Insurance", // list item · FarmerQuestionnaire.js
  "opt:Internship and apprenticeship placements": "Internship and apprenticeship placements", // list item · InstitutionQuestionnaire.js
  "opt:Internships & Training": "Internships & Training", // list item · InstitutionQuestionnaire.js
  "opt:Irrigation & water management": "Irrigation & water management", // list item · InstitutionQuestionnaire.js
  "opt:January": "January", // month name
  "opt:July": "July", // month name
  "opt:June": "June", // month name
  "opt:kg": "kg", // unit
  "opt:Lab analysis (soil, feed, water, plant samples)": "Lab analysis (soil, feed, water, plant samples)", // list item · InstitutionQuestionnaire.js
  "opt:Labour": "Labour", // prop label · farmInputs.js
  "opt:Lack of financing": "Lack of financing", // list item · FarmerQuestionnaire.js
  "opt:Lack of machinery": "Lack of machinery", // list item · FarmerQuestionnaire.js
  "opt:Lack of training/knowledge": "Lack of training/knowledge", // list item · FarmerQuestionnaire.js
  "opt:Lack of trusted farmers": "Lack of trusted farmers", // list item · ConsumerQuestionnaire.js
  "opt:Large (501kg-5tons)": "Large (501kg-5tons)", // list item · ConsumerQuestionnaire.js
  "opt:Leafy Vegetables": "Leafy Vegetables", // prop name · Prices.js
  "opt:Leased": "Leased", // list item · FarmerQuestionnaire.js
  "opt:Lettuce": "Lettuce", // list item · ConsumerQuestionnaire.js
  "opt:Lightning": "Lightning", // prop label · config.js
  "opt:Limited farmer skills": "Limited farmer skills", // list item · InstitutionQuestionnaire.js
  "opt:Limited product variety": "Limited product variety", // list item · ConsumerQuestionnaire.js
  "opt:Limited storage facilities": "Limited storage facilities", // list item · FarmerQuestionnaire.js
  "opt:Listing": "Listing", // what a conversation is about
  "opt:litre": "litre", // unit
  "opt:Livestock": "Livestock", // list item · FarmerQuestionnaire.js
  "opt:Livestock farming": "Livestock farming", // list item · InstitutionQuestionnaire.js
  "opt:Local Agro-dealers": "Local Agro-dealers", // list item · FarmerQuestionnaire.js
  "opt:Local markets": "Local markets", // list item · FarmerQuestionnaire.js
  "opt:Location Information": "Location Information", // list item · ConsumerQuestionnaire.js
  "opt:Logistics support": "Logistics support", // list item · ConsumerQuestionnaire.js
  "opt:Low yields": "Low yields", // list item · FarmerQuestionnaire.js
  "opt:Mahangu (pearl millet)": "Mahangu (pearl millet)", // prop name · cropRules.js
  "opt:Maize": "Maize", // prop name · Prices.js
  "opt:March": "March", // month name
  "opt:Marginal": "Marginal", // return · cropRules.js
  "opt:Mark as dispatched": "Mark as dispatched", // prop dispatched · orderStatus.js
  "opt:Mark as in transit": "Mark as in transit", // prop in_transit · orderStatus.js
  "opt:Market": "Market", // prop label · publicProfile.js
  "opt:Market data": "Market data", // list item · InstitutionQuestionnaire.js
  "opt:Market Insight": "Market Insight", // kind of research article; the stored value stays English
  "opt:Market linkages": "Market linkages", // list item · FarmerQuestionnaire.js
  "opt:Market stall": "Market stall", // list item · ConsumerQuestionnaire.js
  "opt:Marketplace": "Marketplace", // prop label · CommunitySpaces.js
  "opt:Marketplace listings added": "Marketplace listings added", // prop label · StatisticsDashboard.js
  "opt:May": "May", // month name
  "opt:Mechanization & farm machinery": "Mechanization & farm machinery", // list item · InstitutionQuestionnaire.js
  "opt:Mechanized": "Mechanized", // list item · FarmerQuestionnaire.js
  "opt:Medium (51-500kg/units)": "Medium (51-500kg/units)", // list item · ConsumerQuestionnaire.js
  "opt:Mentorship": "Mentorship", // list item · InstitutionQuestionnaire.js
  "opt:Middlemen": "Middlemen", // list item · FarmerQuestionnaire.js
  "opt:Milk": "Milk", // list item · ConsumerQuestionnaire.js
  "opt:Millet": "Millet", // list item · ConsumerQuestionnaire.js
  "opt:Mixed farming": "Mixed farming", // list item · FarmerQuestionnaire.js
  "opt:Mixed methods": "Mixed methods", // list item · FarmerQuestionnaire.js
  "opt:Monday": "Monday", // list item · ConsumerQuestionnaire.js
  "opt:Monthly": "Monthly", // list item · ConsumerQuestionnaire.js
  "opt:Morning": "Morning", // list item · ConsumerQuestionnaire.js
  "opt:Most drought-tolerant staple; the backbone of Oshana farming.": "Most drought-tolerant staple; the backbone of Oshana farming.", // prop note · cropRules.js
  "opt:My requests": "My requests", // filter tab on the Demand Board
  "opt:Namibian land": "Namibian land", // prop label · publicProfile.js
  "opt:Needs lighter, well-drained soil and steadier rain.": "Needs lighter, well-drained soil and steadier rain.", // prop note · cropRules.js
  "opt:NGO / Institution": "NGO / Institution", // list item · ConsumerQuestionnaire.js
  "opt:NGOs": "NGOs", // list item · InstitutionQuestionnaire.js
  "opt:No data": "No data", // return · cropRules.js
  "opt:No preference": "No preference", // list item · ConsumerQuestionnaire.js
  "opt:No weather layer": "No weather layer", // prop label · config.js
  "opt:None": "None", // list item · ConsumerQuestionnaire.js
  "opt:Not approved": "Not approved", // account status
  "opt:Not needed": "Not needed", // account status
  "opt:Not recommended": "Not recommended", // return · cropRules.js
  "opt:Not started": "Not started", // account status
  "opt:November": "November", // month name
  "opt:Observed. Bright = cold, high cloud tops; works day and night.": "Observed. Bright = cold, high cloud tops; works day and night.", // prop note · config.js
  "opt:Observed. Highlights thick, high clouds with strong updrafts (thunderstorm risk).": "Observed. Highlights thick, high clouds with strong updrafts (thunderstorm risk).", // prop note · config.js
  "opt:Observed. Optical flashes seen from space in the last 5 minutes.": "Observed. Optical flashes seen from space in the last 5 minutes.", // prop note · config.js
  "opt:Observed. What the land and clouds look like from space (daytime).": "Observed. What the land and clouds look like from space (daytime).", // prop note · config.js
  "opt:October": "October", // month name
  "opt:On foot/animal-powered": "On foot/animal-powered", // list item · FarmerQuestionnaire.js
  "opt:On the way to the buyer": "On the way to the buyer", // prop detail · orderStatus.js
  "opt:On-demand / irregular": "On-demand / irregular", // list item · ConsumerQuestionnaire.js
  "opt:On-farm training demonstrations": "On-farm training demonstrations", // list item · InstitutionQuestionnaire.js
  "opt:On-farm trials": "On-farm trials", // list item · InstitutionQuestionnaire.js
  "opt:Onions": "Onions", // list item · ConsumerQuestionnaire.js
  "opt:Online": "Online", // how a training programme is run; the stored value stays English
  "opt:Open": "Open", // filter tab on the Demand Board
  "opt:Order": "Order", // what a conversation is about
  "opt:Organic": "Organic", // list item · FarmerQuestionnaire.js
  "opt:Organisation": "Organisation", // prop organization · publicProfile.js
  "opt:Organization": "Organization", // role badge on a post; the stored value stays English
  "opt:Other": "Other", // fallback || · farmInputs.js
  "opt:Others": "Others", // list item · FarmerQuestionnaire.js
  "opt:Own production (seed saving, etc.)": "Own production (seed saving, etc.)", // list item · FarmerQuestionnaire.js
  "opt:Own vehicle": "Own vehicle", // list item · FarmerQuestionnaire.js
  "opt:Owned": "Owned", // list item · FarmerQuestionnaire.js
  "opt:Packaged units": "Packaged units", // list item · ConsumerQuestionnaire.js
  "opt:Packaging & Handling": "Packaging & Handling", // list item · ConsumerQuestionnaire.js
  "opt:Paid": "Paid", // prop label · orderStatus.js
  "opt:Payment processing": "Payment processing", // list item · ConsumerQuestionnaire.js
  "opt:Payment received": "Payment received", // prop detail · orderStatus.js
  "opt:Pearl Millet": "Pearl Millet", // prop name · Prices.js
  "opt:Peas": "Peas", // list item · ConsumerQuestionnaire.js
  "opt:per bunch": "per bunch", // prop unit · Prices.js
  "opt:per kg": "per kg", // prop unit · Prices.js
  "opt:per tray": "per tray", // prop unit · Prices.js
  "opt:Personal & Business Information": "Personal & Business Information", // list item · FarmerQuestionnaire.js
  "opt:Pest & disease management": "Pest & disease management", // list item · InstitutionQuestionnaire.js
  "opt:Pest and disease prevalence": "Pest and disease prevalence", // list item · InstitutionQuestionnaire.js
  "opt:Pesticide": "Pesticide", // prop label · farmInputs.js
  "opt:Pests & diseases": "Pests & diseases", // list item · InstitutionQuestionnaire.js
  "opt:Pests and diseases": "Pests and diseases", // list item · FarmerQuestionnaire.js
  "opt:Policy advice": "Policy advice", // list item · InstitutionQuestionnaire.js
  "opt:Poor market access": "Poor market access", // list item · FarmerQuestionnaire.js
  "opt:Poor quality products": "Poor quality products", // list item · ConsumerQuestionnaire.js
  "opt:Poor roads/transports": "Poor roads/transports", // list item · FarmerQuestionnaire.js
  "opt:Pork": "Pork", // list item · ConsumerQuestionnaire.js
  "opt:Post-harvest handling": "Post-harvest handling", // list item · InstitutionQuestionnaire.js
  "opt:Post-harvest losses": "Post-harvest losses", // list item · InstitutionQuestionnaire.js
  "opt:Potatoes": "Potatoes", // list item · ConsumerQuestionnaire.js
  "opt:Private sector": "Private sector", // list item · InstitutionQuestionnaire.js
  "opt:Problem diagnosis (soil, plant, livestock)": "Problem diagnosis (soil, plant, livestock)", // list item · InstitutionQuestionnaire.js
  "opt:Processing companies": "Processing companies", // list item · FarmerQuestionnaire.js
  "opt:Processor / Manufacturer": "Processor / Manufacturer", // list item · ConsumerQuestionnaire.js
  "opt:Producers pledge": "Producers pledge", // step 2 title
  "opt:Product Interests": "Product Interests", // list item · ConsumerQuestionnaire.js
  "opt:Product quality verification": "Product quality verification", // list item · ConsumerQuestionnaire.js
  "opt:Programs & Qualifications": "Programs & Qualifications", // list item · InstitutionQuestionnaire.js
  "opt:Promotions created": "Promotions created", // prop label · StatisticsDashboard.js
  "opt:Public transport": "Public transport", // list item · FarmerQuestionnaire.js
  "opt:Quality certification": "Quality certification", // list item · ConsumerQuestionnaire.js
  "opt:Quantity Requirements": "Quantity Requirements", // list item · ConsumerQuestionnaire.js
  "opt:Rain": "Rain", // prop label · config.js
  "opt:Ready-to-sell listings from producers. Pick one and pay.": "Ready-to-sell listings from producers. Pick one and pay.", // prop blurb · CommunitySpaces.js
  "opt:Real-time availability updates": "Real-time availability updates", // list item · ConsumerQuestionnaire.js
  "opt:Rented": "Rented", // list item · FarmerQuestionnaire.js
  "opt:Request": "Request", // prop job · CommunitySpaces.js
  "opt:Research": "Research", // prop label · publicProfile.js
  "opt:Research articles published": "Research articles published", // prop label · StatisticsDashboard.js
  "opt:Research Capacity": "Research Capacity", // list item · InstitutionQuestionnaire.js
  "opt:Research collaboration": "Research collaboration", // list item · InstitutionQuestionnaire.js
  "opt:Research Institute": "Research Institute", // list item · InstitutionQuestionnaire.js
  "opt:Research labs": "Research labs", // list item · InstitutionQuestionnaire.js
  "opt:Research-based recommendations": "Research-based recommendations", // list item · InstitutionQuestionnaire.js
  "opt:Restaurant / Food Service": "Restaurant / Food Service", // list item · ConsumerQuestionnaire.js
  "opt:Restaurant/Catering": "Restaurant/Catering", // list item · ConsumerQuestionnaire.js
  "opt:Retailer": "Retailer", // list item · ConsumerQuestionnaire.js
  "opt:Rice": "Rice", // list item · ConsumerQuestionnaire.js
  "opt:Safety equipment": "Safety equipment", // list item · InstitutionQuestionnaire.js
  "opt:Sales & Marketing": "Sales & Marketing", // list item · FarmerQuestionnaire.js
  "opt:Sample collection": "Sample collection", // list item · InstitutionQuestionnaire.js
  "opt:Satellite": "Satellite", // prop label · config.js
  "opt:Saturday": "Saturday", // list item · ConsumerQuestionnaire.js
  "opt:Seasonal": "Seasonal", // list item · ConsumerQuestionnaire.js
  "opt:Security": "Security", // tab on the profile
  "opt:Seed": "Seed", // prop label · farmInputs.js
  "opt:Seed companies": "Seed companies", // list item · InstitutionQuestionnaire.js
  "opt:Seller accepted the order": "Seller accepted the order", // prop detail · orderStatus.js
  "opt:Sent, waiting for review": "Sent, waiting for review", // account status
  "opt:September": "September", // month name
  "opt:Share news, photos, tips and questions. Open conversation, no deals.": "Share news, photos, tips and questions. Open conversation, no deals.", // prop blurb · CommunitySpaces.js
  "opt:Short farmer workshops": "Short farmer workshops", // list item · InstitutionQuestionnaire.js
  "opt:Small (1-50kg/units)": "Small (1-50kg/units)", // list item · ConsumerQuestionnaire.js
  "opt:Smart farming": "Smart farming", // prop label · publicProfile.js
  "opt:Soil and climate data": "Soil and climate data", // list item · InstitutionQuestionnaire.js
  "opt:Soil fertility and soil science": "Soil fertility and soil science", // list item · InstitutionQuestionnaire.js
  "opt:Soil infertility": "Soil infertility", // list item · InstitutionQuestionnaire.js
  "opt:Soil Science": "Soil Science", // list item · InstitutionQuestionnaire.js
  "opt:Sole proprietor": "Sole proprietor", // list item · FarmerQuestionnaire.js
  "opt:Solutions & Contribution": "Solutions & Contribution", // list item · InstitutionQuestionnaire.js
  "opt:Sorghum": "Sorghum", // prop name · cropRules.js
  "opt:Spices": "Spices", // list item · ConsumerQuestionnaire.js
  "opt:Spinach": "Spinach", // list item · ConsumerQuestionnaire.js
  "opt:Statistics Dashboard": "Statistics Dashboard", // prop statistics · PageAccessGate.js
  "opt:Stipend": "Stipend", // list item · InstitutionQuestionnaire.js
  "opt:Storage/processing facilities": "Storage/processing facilities", // list item · FarmerQuestionnaire.js
  "opt:Storm clouds": "Storm clouds", // prop label · config.js
  "opt:Streets": "Streets", // prop label · config.js
  "opt:Subsidized inputs": "Subsidized inputs", // list item · FarmerQuestionnaire.js
  "opt:Suitable": "Suitable", // return · cropRules.js
  "opt:Sunday": "Sunday", // list item · ConsumerQuestionnaire.js
  "opt:Supply & Timing": "Supply & Timing", // list item · ConsumerQuestionnaire.js
  "opt:Talk": "Talk", // prop job · CommunitySpaces.js
  "opt:Technology & Support": "Technology & Support", // list item · FarmerQuestionnaire.js
  "opt:Technology testing": "Technology testing", // list item · InstitutionQuestionnaire.js
  "opt:Temperature": "Temperature", // prop label · config.js
  "opt:Thursday": "Thursday", // list item · ConsumerQuestionnaire.js
  "opt:Tolerates heat and dry spells; good where mahangu is risky for birds.": "Tolerates heat and dry spells; good where mahangu is risky for birds.", // prop note · cropRules.js
  "opt:Tomatoes": "Tomatoes", // prop name · Prices.js
  "opt:ton": "ton", // unit
  "opt:Traditional": "Traditional", // list item · FarmerQuestionnaire.js
  "opt:Training": "Training", // list item · FarmerQuestionnaire.js
  "opt:Training & Outreach": "Training & Outreach", // list item · InstitutionQuestionnaire.js
  "opt:Training programs": "Training programs", // list item · InstitutionQuestionnaire.js
  "opt:Training programs posted": "Training programs posted", // prop label · StatisticsDashboard.js
  "opt:Transport limitations": "Transport limitations", // list item · ConsumerQuestionnaire.js
  "opt:tray": "tray", // unit
  "opt:True colour": "True colour", // prop label · config.js
  "opt:Tuesday": "Tuesday", // list item · ConsumerQuestionnaire.js
  "opt:TVET/Polytechnic": "TVET/Polytechnic", // list item · InstitutionQuestionnaire.js
  "opt:unit": "unit", // unit
  "opt:University": "University", // list item · InstitutionQuestionnaire.js
  "opt:Use the discussion to settle price, delivery and timing. The buyer marks it fulfilled.": "Use the discussion to settle price, delivery and timing. The buyer marks it fulfilled.", // step 3 text
  "opt:Verified": "Verified", // account status
  "opt:Very large (5+ tons)": "Very large (5+ tons)", // list item · ConsumerQuestionnaire.js
  "opt:Veterinary / medicine": "Veterinary / medicine", // prop label · farmInputs.js
  "opt:Veterinary Science": "Veterinary Science", // list item · InstitutionQuestionnaire.js
  "opt:Waiting for review": "Waiting for review", // account status
  "opt:Warm-season crop; suits sandy soils and short rains.": "Warm-season crop; suits sandy soils and short rains.", // prop note · cropRules.js
  "opt:Water / irrigation": "Water / irrigation", // prop label · farmInputs.js
  "opt:Water scarcity": "Water scarcity", // list item · FarmerQuestionnaire.js
  "opt:Watermelon / melons": "Watermelon / melons", // prop name · cropRules.js
  "opt:Wednesday": "Wednesday", // list item · ConsumerQuestionnaire.js
  "opt:Weekly": "Weekly", // list item · ConsumerQuestionnaire.js
  "opt:Well suited": "Well suited", // return · cropRules.js
  "opt:What, how much, and by when. A school, a shop, a restaurant, or anyone buying in bulk.": "What, how much, and by when. A school, a shop, a restaurant, or anyone buying in bulk.", // step 1 text
  "opt:Wheat": "Wheat", // list item · ConsumerQuestionnaire.js
  "opt:Wholesaler": "Wholesaler", // list item · ConsumerQuestionnaire.js
  "opt:Women groups": "Women groups", // list item · InstitutionQuestionnaire.js
  "opt:Youth": "Youth", // list item · InstitutionQuestionnaire.js
  "opt:Ready for collection": "Ready for collection", // order step / button when the buyer collects · orderStatus.js
  "opt:Ready for the carrier": "Ready for the carrier", // order step / button when a carrier delivers · orderStatus.js
  "opt:With the carrier": "With the carrier", // order step while a carrier has the goods · orderStatus.js
  "opt:Problem reported": "Problem reported", // order status after the buyer reports a problem · orderStatus.js
  // ---- orders ----
  "orders.purchaseHistory": "Purchase history", // eyebrow · MyOrders.js
  "orders.myOrders": "My Orders", // title · MyOrders.js
  "orders.everythingYouVeBoughtThroughThe": "Everything you've bought through the AfriAgriFed marketplace.", // subtitle · MyOrders.js
  "orders.noOrdersYetPurchasesYouMake": "No orders yet. Purchases you make on the Marketplace will show up here.", // p · MyOrders.js
  "orders.product": "Product", // th · MyOrders.js
  "orders.amount": "Amount", // th · MyOrders.js
  "orders.status": "Status", // th · MyOrders.js
  "orders.date": "Date", // th · MyOrders.js
  "orders.reference": "Reference", // th · MyOrders.js
  "orders.track": "Track", // button · MyOrders.js
  "orders.pleaseSignInFirst": "Please sign in first.", // error message · orders.js
  "orders.thatStepIsNotAvailableFor": "That step is not available for this order right now.", // error message · orders.js
  // ---- orderStatus ----
  "orderStatus.waitConfirm": "Waiting for the seller to confirm", // line on an order card
  "orderStatus.waitDispatch": "Waiting for the seller to dispatch", // line on an order card
  "orderStatus.waitStart": "Waiting for the seller to start delivery, or the buyer to confirm receipt", // line on an order card
  "orderStatus.waitDelivery": "Waiting for the buyer to confirm delivery", // line on an order card
  "orderStatus.waitReadyForCarrier": "Waiting for the seller to get the order ready for the carrier", // line on an order card
  "orderStatus.waitCollection": "Ready: waiting for the buyer to collect it", // line on an order card
  "orderStatus.waitCarrierPickup": "Waiting for a carrier to collect the goods from the seller", // line on an order card
  "orderStatus.waitDispute": "A problem was reported. The AfriAgriFed team is looking into it.", // line on an order card
  // ---- pageAccess ----
  "pageAccess.enterAnEmailSoWeCan": "Enter an email so we can send your receipt.", // toast.error · PageAccessGate.js
  "pageAccess.choosePhotoOfYourStudentCard": "Choose a photo of your student card first.", // toast.error · PageAccessGate.js
  "pageAccess.studentAccessGrantedEnjoyFreeAccess": "Student access granted - enjoy free access to data & statistics.", // toast.success · PageAccessGate.js
  "pageAccess.itFreeTheMomentYouRegister": "It's free the moment you register or sign in - AfriAgriFed never charges registered members for data or statistics. Not ready to register? Pay a one-time N$5 for this page, or verify as a student for free access.", // p · PageAccessGate.js
  "pageAccess.registerOrSignIn": "Register or sign in", // strong · PageAccessGate.js
  "pageAccess.freePermanentAccessToEveryPage": "Free, permanent access to every page", // span · PageAccessGate.js
  "pageAccess.payForThisPage": "Pay for this page", // strong · PageAccessGate.js
  "pageAccess.student": "I'm a student", // strong · PageAccessGate.js
  "pageAccess.uploadYourStudentCardForFree": "Upload your student card for free access.", // span · PageAccessGate.js
  "pageAccess.thisPage": "This page", // either/or · PageAccessGate.js
  "pageAccess.pay5": "Pay N$5", // either/or · PageAccessGate.js
  "pageAccess.verifyUnlock": "Verify & Unlock", // either/or · PageAccessGate.js
  "pageAccess.couldNotStartPayment": "Could not start payment.", // toast.error · PageAccessGate.js
  "pageAccess.couldNotVerifyStudentCard": "Could not verify student card.", // toast.error · PageAccessGate.js
  "pageAccess.starting": "Starting...", // either/or · PageAccessGate.js
  "pageAccess.verifying": "Verifying...", // either/or · PageAccessGate.js
  "pageAccess.costs": "{page} costs N$5 for visitors without an account", // heading; {page} is the page name
  // ---- paymentResult ----
  "paymentResult.confirmingYourPayment": "Confirming your payment...", // p · PaymentCallback.js
  "paymentResult.paymentConfirmed": "Payment confirmed", // h1 · PaymentCallback.js
  "paymentResult.paymentCouldNotBeVerified": "Payment could not be verified", // h1 · PaymentCallback.js
  "paymentResult.paymentCancelled": "Payment cancelled", // h1 · PaymentCallback.js
  "paymentResult.yourPromotionIsNowLive": "Your promotion is now live.", // either/or · PaymentCallback.js
  "paymentResult.thisPageIsNowUnlocked": "This page is now unlocked.", // either/or · PaymentCallback.js
  "paymentResult.yourOrderHasBeenRecorded": "Your order has been recorded.", // either/or · PaymentCallback.js
  "paymentResult.weCouldNotConfirmThisPayment": "We could not confirm this payment yet.", // either/or · PaymentCallback.js
  "paymentResult.goToPage": "Go to page", // button after paying for page access
  "paymentResult.trackOrder": "Track your order", // button after paying for an order
  "paymentResult.backToDashboard": "Back to Dashboard", // button
  "paymentResult.ifCharged": "If you were charged, your order is recorded as soon as the payment provider confirms it; otherwise contact support with your transaction reference.", // shown when a payment could not be verified
  // ---- payments ----
  "payments.pleaseSignInBeforeBuying": "Please sign in before buying.", // toast.error · payments.js
  "payments.paymentsAreBeingSetUpPlease": "Payments are being set up. Please try again soon.", // error message · payments.js
  "payments.pleaseSignInFirst": "Please sign in first.", // error message · payments.js
  "payments.couldNotReachThePaymentService": "Could not reach the payment service. Check your connection and try again.", // error message · payments.js
  "payments.couldNotStart": "Could not start payment.", // error
  // ---- pinMap ----
  "pinMap.noMap": "The map can't be shown on this device. Choose the nearest town and describe the place in words.",
  "pinMap.map": "Map", // map label for screen readers
  // ---- prices ----
  "prices.marketAverages": "Market averages", // p · Prices.js
  "prices.averageProducePrices": "Average Produce Prices", // h1 · Prices.js
  "prices.profile": "Profile", // button · Prices.js
  // ---- produceImages ----
  "produceImages.pleaseChoosePhotoJpgOrPng": "Please choose a photo (JPG or PNG).", // error message · produceImages.js
  "produceImages.thatPhotoIsTooDetailedTo": "That photo is too detailed to store. Please try a smaller one.", // error message · produceImages.js
  "produceImages.thatPhotoCouldnBeReadPlease": "That photo couldn't be read. Please try another.", // error message · produceImages.js
  // ---- profile ----
  "profile.nothingOnFileYet": "Nothing on file yet.", // p · Profile.js
  "profile.profileSaved": "Profile saved.", // toast.success · Profile.js
  "profile.profilePictureUpdated": "Profile picture updated.", // toast.success · Profile.js
  "profile.profilePictureRemoved": "Profile picture removed.", // toast.success · Profile.js
  "profile.loadingProfile": "Loading profile...", // p · Profile.js
  "profile.account": "Account", // eyebrow · Profile.js
  "profile.myProfile": "My Profile", // title · Profile.js
  "profile.howOtherMembersSeeYouAnd": "How other members see you, and your account details.", // subtitle · Profile.js
  "profile.changeProfilePicture": "Change profile picture", // aria-label · Profile.js
  "profile.chooseUsername": "Choose a username", // button · Profile.js
  "profile.editProfile": "Edit profile", // button · Profile.js
  "profile.removePhoto": "Remove photo", // button · Profile.js
  "profile.firstName": "First name", // label · Profile.js
  "profile.lastName": "Last name", // label · Profile.js
  "profile.nameShownToMembers": "Name shown to members", // label · Profile.js
  "profile.yourNameFarmOrBusiness": "Your name, farm or business", // placeholder · Profile.js
  "profile.username": "Username", // label · Profile.js
  "profile.egNdapewaFarms": "e.g. ndapewa_farms", // placeholder · Profile.js
  "profile.region": "Region", // label · Profile.js
  "profile.chooseYourRegion": "Choose your region", // option · Profile.js
  "profile.bio": "Bio", // label · Profile.js
  "profile.whatYouFarmBuyOrResearch": "What you farm, buy or research. No phone numbers or e-mails: members reach you through Messages.", // placeholder · Profile.js
  "profile.nationality": "Nationality", // label · Profile.js
  "profile.gender": "Gender", // label · Profile.js
  "profile.preferNotToSay": "Prefer not to say", // option · Profile.js
  "profile.male": "Male", // option · Profile.js
  "profile.female": "Female", // option · Profile.js
  "profile.other": "Other", // option · Profile.js
  "profile.coverPhoto": "Cover photo", // legend · Profile.js
  "profile.personalDetails": "Personal details", // h3 · Profile.js
  "profile.onlyYouAndTheAfriagrifedTeam": "Only you and the AfriAgriFed team see this.", // p · Profile.js
  "profile.name": "Name", // span · Profile.js
  "profile.mail": "E-mail", // span · Profile.js
  "profile.accountStatus": "Account status", // h3 · Profile.js
  "profile.signUpDetails": "Sign-up details", // h3 · Profile.js
  "profile.documents": "Documents", // h3 · Profile.js
  "profile.noDocumentsOnFile": "No documents on file.", // p · Profile.js
  "profile.security": "Security", // h3 · Profile.js
  "profile.sendYourselfLinkToChooseNew": "Send yourself a link to choose a new password.", // p · Profile.js
  "profile.sendPasswordResetMail": "Send password reset e-mail", // button · Profile.js
  "profile.leaveEmptyToUseYourFirst": "Leave empty to use your first and last name.", // small · Profile.js
  "profile.lettersNumbersAndUnderscoresOthersCan": "Letters, numbers and underscores. Others can find you by it.", // either/or · Profile.js
  "profile.saveProfile": "Save profile", // either/or · Profile.js
  "profile.notProvided": "Not provided", // either/or · Profile.js
  "profile.viewFile": "View file", // either/or · Profile.js
  "profile.thatCouldnBeSavedCheckThe": "That couldn't be saved. Check the username and bio, then try again.", // toast.error · Profile.js
  "profile.thatPhotoCouldnBeSaved": "That photo couldn't be saved.", // toast.error · Profile.js
  "profile.couldNotSendResetEmail": "Could not send reset email.", // setResetStatus · Profile.js
  "profile.member": "Member", // either/or · Profile.js
  "profile.saving": "Saving...", // either/or · Profile.js
  "profile.checking": "Checking...", // while checking if a username is free
  "profile.nameFree": "{name} is free", // username check
  "profile.nameTaken": "{name} is taken", // username check
  "profile.justTaken": "{name} was just taken. Please pick another.", // toast
  "profile.sending": "Sending...", // while a reset e-mail is sent
  "profile.resetSent": "Reset link sent to {email}.", // after asking for a password reset
  "profile.addPhoto": "a photo", // an item in the list of things still to add to a profile
  "profile.addUsername": "a username", // an item in the list of things still to add to a profile
  "profile.addBio": "a short bio", // an item in the list of things still to add to a profile
  "profile.addRegion": "your region", // an item in the list of things still to add to a profile
  "profile.completeness": "Your profile is {percent}% complete. Add {list} so buyers and sellers know who they're dealing with.", // under the profile picture; {list} is e.g. a photo, a username and a short bio
  "profile.memberSince": "Member since {date}", // on a profile
  "profile.registration": "Registration", // account status row
  "profile.usernameFormat": "Use 3 to 20 letters, numbers or underscores (no spaces).", // username rule
  "profile.usernameReserved": "That username is reserved. Please pick another.", // username rule
  "profile.usernameNeedsLetter": "Include at least one letter.", // username rule
  "profile.nameRequired": "Please enter your name.", // profile rule
  "profile.nameTooLong": "Keep your name under {max} characters.", // profile rule
  "profile.bioTooLong": "Keep your bio under {max} characters.", // profile rule
  "profile.noContact": "Phone numbers, e-mails and links can't go on your public profile. Members reach you through Messages.", // profile rule
  "profile.eMail": "E-mail", // account status row
  // ---- promotions ----
  "promotions.pleaseAddProductName": "Please add a product name.", // toast.error · Promotions.js
  "promotions.pickStartAndEndDate": "Pick a start and end date.", // toast.error · Promotions.js
  "promotions.theStartDateCanBeIn": "The start date can't be in the past.", // toast.error · Promotions.js
  "promotions.theEndDateMustBeOn": "The end date must be on or after the start date.", // toast.error · Promotions.js
  "promotions.thoseDatesFallOnWeekendPick": "Those dates fall on a weekend. Pick at least one working day.", // toast.error · Promotions.js
  "promotions.visibleToProducersConsumersInstitutions": "Visible to producers, consumers & institutions", // eyebrow · Promotions.js
  "promotions.promotions": "Promotions", // title · Promotions.js
  "promotions.farmersSpotlightProductsHereToReach": "Farmers spotlight products here to reach preferential customers.", // subtitle · Promotions.js
  "promotions.activePromotions": "Active promotions", // aria-label · Promotions.js
  "promotions.noActivePromotionsRightNow": "No active promotions right now.", // p · Promotions.js
  "promotions.promoteProduct": "Promote a product", // h2 · Promotions.js
  "promotions.productName": "Product name", // label · Promotions.js
  "promotions.description": "Description", // label · Promotions.js
  "promotions.startDate": "Start date", // label · Promotions.js
  "promotions.endDate": "End date", // label · Promotions.js
  "promotions.photoOptional": "Photo (optional)", // label · Promotions.js
  "promotions.noPromotionsYet": "No promotions yet.", // p · Promotions.js
  "promotions.awaitingPayment": "Awaiting payment", // either/or · Promotions.js
  "promotions.redirectingToPaymentToActivateYour": "Redirecting to payment to activate your promotion...", // toast · Promotions.js
  "promotions.posting": "Posting...", // either/or · Promotions.js
  "promotions.active": "Active", // either/or · Promotions.js
  "promotions.expired": "Expired", // either/or · Promotions.js
  "promotions.couldNotCreate": "Could not create promotion: {error}", // error toast
  "promotions.ratePerDay": "{price} per working day (weekends excluded).", // price under the promotion form
  "promotions.costSummary_one": "{count} working day · {total} total", // price summary of a promotion
  "promotions.costSummary_other": "{count} working days · {total} total", // price summary of a promotion
  "promotions.payAndPost": "Pay {total} & post promotion", // submit button
  "promotions.dateRange": "{start} to {end}", // start and end dates of a promotion
  "promotions.by": "By {name}", // who posted a promotion
  "promotions.paymentDescription_one": "Promotion: {product} ({count} working day)", // text on the payment record (kept in English)
  "promotions.paymentDescription_other": "Promotion: {product} ({count} working days)", // text on the payment record (kept in English)
  // ---- publicProfile ----
  "publicProfile.pleaseChoosePhotoJpgOrPng": "Please choose a photo (JPG or PNG).", // error message · publicProfile.js
  "publicProfile.thatPhotoCouldnBeReadPlease": "That photo couldn't be read. Please try another.", // error message · publicProfile.js
  // ---- purchase ----
  "purchase.soldOut": "Sold out", // stock label on a listing
  "purchase.onlyLeft": "Only {count} left", // stock label on a listing
  "purchase.available": "{count} available", // stock label on a listing
  // ---- questionnaire ----
  "questionnaire.sectionOf": "Section {n} of {total}", // progress line above a questionnaire
  // ---- quickAccess ----
  "quickAccess.quickAccess": "Quick Access", // h1 · QuickAccess.js
  "quickAccess.skipsTheFullRegistrationQuestionnaireCreates": "Skips the full registration questionnaire. Creates (or signs into) a plain account - no farmer/consumer/institution profile, no document review.", // p · QuickAccess.js
  "quickAccess.email": "Email *", // label · QuickAccess.js
  "quickAccess.password": "Password *", // label · QuickAccess.js
  "quickAccess.enterAnEmailAndPasswordOf": "Enter an email and a password of at least 6 characters.", // setStatus · QuickAccess.js
  "quickAccess.signedInThisEmailIsnOn": "Signed in. This email isn't on the admin list, so redirecting to your dashboard.", // setStatus · QuickAccess.js
  "quickAccess.somethingWentWrong": "Something went wrong.", // setStatus · QuickAccess.js
  "quickAccess.working": "Working...", // either/or · QuickAccess.js
  "quickAccess.continue": "Continue", // either/or · QuickAccess.js
  // ---- readout ----
  "readout.humidity": "🌡 {temp} °C · humidity {humidity}%", // weather card at the pointer
  "readout.temp": "🌡 {temp} °C", // weather card at the pointer
  "readout.rainHour": "🌧 {mm} mm in the past hour", // weather card at the pointer
  "readout.rainChance": "☔ {value}% chance of rain, next 3 h", // weather card at the pointer
  "readout.wind": "💨 {text}", // weather card at the pointer; {text} is the wind
  "readout.thisSpot": "This spot", // weather card at the pointer: the exact spot
  "readout.thisSpotUp": "This spot, {m} m up", // weather card: exact spot and its height above sea level
  "readout.thisSpotAsOf": "This spot · as of {time}", // weather card
  "readout.thisSpotUpAsOf": "This spot, {m} m up · as of {time}", // weather card
  "readout.areaTemp": "🌡 ≈ {temp} °C", // weather card: estimate for the area
  "readout.areaRain": "🌧 ≈ {mm} mm/h", // weather card: estimate for the area
  "readout.areaWind": "💨 ≈ {text}", // weather card: estimate for the area
  "readout.areaNote": "Area estimate · rest here for this exact spot", // weather card
  "readout.areaNoExact": "Area estimate · the exact forecast couldn't load", // weather card
  // ---- register ----
  "register.registrationSuccessful": "Registration successful!", // toast.success · Register.js
  "register.home": "Home", // button · Register.js
  "register.contactUs": "Contact Us", // button · Register.js
  "register.createYourAccount": "Create Your Account", // h1 · Register.js
  "register.personalInformation": "Personal Information", // h2 · Register.js
  "register.firstName": "First Name *", // label · Register.js
  "register.enterYourFirstName": "Enter your first name", // placeholder · Register.js
  "register.lastName": "Last Name *", // label · Register.js
  "register.enterYourLastName": "Enter your last name", // placeholder · Register.js
  "register.dateOfBirth": "Date of Birth *", // label · Register.js
  "register.nationality": "Nationality *", // label · Register.js
  "register.yourNationality": "Your nationality", // placeholder · Register.js
  "register.gender": "Gender *", // label · Register.js
  "register.selectGender": "Select Gender", // option · Register.js
  "register.male": "Male", // option · Register.js
  "register.female": "Female", // option · Register.js
  "register.other": "Other", // option · Register.js
  "register.accountType": "Account Type *", // label · Register.js
  "register.selectAccountType": "Select Account Type", // option · Register.js
  "register.consumerOrganizationSupermarketRetailerBuyer": "Consumer / Organization (supermarket, retailer, buyer)", // option · Register.js
  "register.farmer": "Farmer", // option · Register.js
  "register.tertiaryInstitution": "Tertiary Institution", // option · Register.js
  "register.personalEmail": "Personal Email *", // label · Register.js
  "register.password": "Password *", // label · Register.js
  "register.createPassword": "Create a password", // placeholder · Register.js
  "register.confirmPassword": "Confirm Password *", // label · Register.js
  "register.confirmYourPassword": "Confirm your password", // placeholder · Register.js
  "register.afriagrifedTermsAndConditions": "Afriagrifed Terms and Conditions", // strong · Register.js
  "register.afriagrifedIsCommittedToFightingFood": "Afriagrifed is committed to fighting food insecurity by creating genuine connections between farmers, consumers and education. By creating an account, you agree to:", // p · Register.js
  "register.useThePlatformForItsIntended": "Use the platform for its intended purpose of agricultural commerce and fighting food insecurity.", // li · Register.js
  "register.performAllTransactionsOnThePlatform": "Perform all transactions on the platform for capturing agricultural realistic data and to avoid scams.", // li · Register.js
  "register.backToHome": "Back to Home", // button · Register.js
  "register.documentVerification": "Document Verification", // h2 · Register.js
  "register.doc": "DOC", // div · Register.js
  "register.documentSubmission": "Document Submission", // h4 · Register.js
  "register.uploadAllRequiredDocumentsBelow": "Upload all required documents below", // p · Register.js
  "register.rev": "REV", // div · Register.js
  "register.underReview24Hours": "Under Review (24 Hours)", // h4 · Register.js
  "register.ourTeamWillVerifyYourDocuments": "Our team will verify your documents within 24 hours", // p · Register.js
  "register.ver": "VER", // div · Register.js
  "register.accountFullyVerified": "Account Fully Verified", // h4 · Register.js
  "register.completeAccessToAllPlatformFeatures": "Complete access to all platform features", // p · Register.js
  "register.governmentIssuedIdPassportDriverLicense": "Government issued ID (Passport, Driver's License, etc.)", // p · Register.js
  "register.proofOfRegistration": "Proof of Registration *", // label · Register.js
  "register.businessRegistrationDocument": "Business registration document", // p · Register.js
  "register.businessCertificate": "Business Certificate *", // label · Register.js
  "register.officialBusinessCertification": "Official business certification", // p · Register.js
  "register.lastMonthBankStatement": "Last Month Bank Statement *", // label · Register.js
  "register.businessBankStatement": "Business bank statement", // p · Register.js
  "register.institutionCertificateDegree": "Institution Certificate/Degree *", // label · Register.js
  "register.uploadYourAcademicInstitutionProof": "Upload your academic institution proof", // p · Register.js
  "register.additionalVerificationOptional": "Additional Verification (Optional)", // label · Register.js
  "register.anyAdditionalDocumentsForVerification": "Any additional documents for verification", // p · Register.js
  "register.note": "Note:", // strong · Register.js
  "register.pleaseSelectYourAccountType": "Please select your account type", // validation message · Register.js
  "register.firstNameIsRequired": "First name is required", // validation message · Register.js
  "register.lastNameIsRequired": "Last name is required", // validation message · Register.js
  "register.dateOfBirthIsRequired": "Date of birth is required", // validation message · Register.js
  "register.youMustBe18OrOlder": "You must be 18 or older to create an account.", // validation message · Register.js
  "register.nationalityIsRequired": "Nationality is required", // validation message · Register.js
  "register.genderIsRequired": "Gender is required", // validation message · Register.js
  "register.personalEmailIsRequired": "Personal email is required", // validation message · Register.js
  "register.personalEmailIsInvalid": "Personal email is invalid", // validation message · Register.js
  "register.passwordIsRequired": "Password is required", // validation message · Register.js
  "register.passwordMustBeAtLeast6": "Password must be at least 6 characters", // validation message · Register.js
  "register.passwordsDoNotMatch": "Passwords do not match", // validation message · Register.js
  "register.pleaseAgreeToTheTermsOf": "Please agree to the Terms of service and Privacy policy to continue", // validation message · Register.js
  "register.uploadTheRequiredDocumentsToComplete": "Upload the required documents to complete your farmer registration and get full access to all features.", // either/or · Register.js
  "register.uploadTheRequiredDocumentsToComplete2": "Upload the required documents to complete your institution registration.", // either/or · Register.js
  "register.uploadDocumentsForVerificationOptionalFor": "Upload documents for verification (optional for consumers).", // either/or · Register.js
  "register.completeRegistration": "Complete Registration", // either/or · Register.js
  "register.submitForVerification": "Submit for Verification", // either/or · Register.js
  "register.yourDocumentsWillBeReviewedWithin": "Your documents will be reviewed within 24 hours. Once verified, your account will have full access to all platform features. Registering as pending gives limited access until verification is complete.", // either/or · Register.js
  "register.yourInstitutionDocumentsWillBeVerified": "Your institution documents will be verified within 24 hours. Full access to educational and research features will be granted upon verification.", // either/or · Register.js
  "register.documentVerificationIsOptionalForConsumers": "Document verification is optional for consumers. Your account will be active immediately.", // either/or · Register.js
  "register.contactPageComingSoon": "Contact page coming soon!", // toast · Register.js
  "register.registering": "Registering...", // either/or · Register.js
  "register.submitting": "Submitting...", // either/or · Register.js
  "register.invalidFileType": "Invalid file type: {name}", // error when a document is not a PDF, image or Word file
  "register.fileTooLarge": "File too large (max 20MB): {name}", // error when a document is too big
  "register.failed": "Registration failed. Please check your details and try again.", // error message
  "register.stepPersonal": "Personal Info", // step name in the sign-up progress bar
  "register.stepFarm": "Farm Info", // step name in the sign-up progress bar
  "register.stepInstitution": "Institution Info", // step name in the sign-up progress bar
  "register.stepConsumer": "Consumer Info", // step name in the sign-up progress bar
  "register.stepAdditional": "Additional Info", // step name in the sign-up progress bar
  "register.stepDocuments": "Documents", // step name in the sign-up progress bar
  "register.agreeTerms": "I have read and agree to the {terms} and the {privacy}. *", // checkbox on the sign-up form; {terms} and {privacy} are links
  "register.termsOfService": "Terms of service", // link text
  "register.privacyPolicy": "Privacy policy", // link text
  "register.legalComplianceLabel": "Legal Compliance:", // bold heading in the sign-up agreement
  "register.legalComplianceText": "You acknowledge that any fraudulent activities, scams, or attempts to deceive other users will result in immediate account suspension and may be reported to relevant law enforcement authorities. Afriagrifed reserves the right to cooperate fully with legal investigations and pursue criminal charges against individuals who misuse the platform.", // sign-up agreement; legal meaning, needs a careful translation
  "register.missionLabel": "Platform Mission:", // bold heading in the sign-up agreement
  "register.missionText": "We are building a trusted community dedicated to sustainable agriculture and food security. Your commitment to honesty and integrity helps us achieve this mission.", // sign-up agreement
  "register.continueRegistration": "Continue to Registration", // button
  "register.continueFarmer": "Continue to Farmer questionnaire", // button
  "register.continueInstitution": "Continue to Institution questionnaire", // button
  "register.continueNext": "Continue to Next step", // button
  "register.personalId": "Personal ID", // label of a document upload
  // ---- research ----
  "research.pleaseDescribeTheProblemYouRe": "Please describe the problem you're facing.", // alert · Research.js
  "research.institutionResearch": "Institution research", // eyebrow · Research.js
  "research.farmingResearchArticles": "Farming Research Articles", // title · Research.js
  "research.readAgriculturalReportsLinksAndPdfs": "Read agricultural reports, links and PDFs shared by institutions.", // subtitle · Research.js
  "research.submitProblemForResearch": "Submit a Problem for Research", // h2 · Research.js
  "research.institutionsWillSeeThisAndCan": "Institutions will see this and can publish a recommendation here.", // p · Research.js
  "research.shortTitleEgAphidsOnTomato": "Short title, e.g. Aphids on tomato leaves", // placeholder · Research.js
  "research.describeWhatYouReExperiencing": "Describe what you're experiencing...", // placeholder · Research.js
  "research.yourSubmittedProblems": "Your submitted problems", // h3 · Research.js
  "research.recommendation": "Recommendation", // p · Research.js
  "research.openLink": "Open Link", // a · Research.js
  "research.viewPdf": "View PDF", // a · Research.js
  "research.institutionPostsWillAppearHereOnce": "Institution posts will appear here once published.", // p · Research.js
  "research.submitProblem": "Submit Problem", // either/or · Research.js
  "research.awaitingResearch": "Awaiting research", // either/or · Research.js
  "research.loadingResearch": "Loading research...", // either/or · Research.js
  "research.noResearchArticlesYet": "No research articles yet", // either/or · Research.js
  "research.submitting": "Submitting...", // either/or · Research.js
  "research.answered": "Answered", // either/or · Research.js
  "research.research": "Research", // either/or · Research.js
  "research.couldNotSubmit": "Could not submit problem: {error}", // error alert
  // ---- satellite ----
  "satellite.satelliteLayerHasNoTimeInformation": "Satellite layer has no time information", // error message · satellite.js
  // ---- server ----
  "server.sign_in_required": "Please sign in first.", // the server asks the person to sign in
  "server.payment_provider_unavailable": "The payment provider could not be reached. Please try again.", // server error
  "server.bad_quantity": "Choose a whole number of units from 1 to {max}.", // server error
  "server.listing_not_found": "That listing is no longer available.", // server error
  "server.listing_unpriced": "This listing has no valid price.", // server error
  "server.sold_out": "This listing is sold out.", // server error
  "server.not_enough_stock_one": "Only {count} is available.", // server error
  "server.not_enough_stock_other": "Only {count} are available.", // server error
  "server.listing_unavailable": "This listing cannot be bought right now.", // server error
  "server.own_listing": "You can't buy your own listing.", // server error
  "server.seller_not_ready": "{name} hasn't set up payouts yet. Please contact them directly.", // server error; {name} is the seller's name
  "server.seller_not_ready.anon": "This seller hasn't set up payouts yet. Please contact them directly.", // server error when the seller has no name
  "server.promotion_not_found": "That promotion could not be found.", // server error
  "server.already_paid": "That promotion has already been paid for.", // server error
  "server.bad_dates": "The promotion's dates cover no working days.", // server error
  "server.email_required": "An email address is needed for the receipt.", // server error
  "server.payment_start_failed": "Could not start the payment. Please try again.", // server error
  "server.payments_not_ready": "Payments are being set up. Please try again soon.", // server error
  "server.banks_unavailable": "Could not load the bank list.", // server error
  "server.subaccount_failed": "Could not set up payouts. Check the bank details and try again.", // server error
  "server.server_error": "Something went wrong on our side. Please try again.", // server error
  "server.chat_not_configured": "The assistant is not switched on yet.", // assistant error
  "server.no_messages": "Send at least one message.", // assistant error
  "server.rate_limited": "The assistant is busy. Please try again in a moment.", // assistant error
  "server.chat_unavailable": "The assistant is temporarily unavailable.", // assistant error
  "server.chat_empty": "The assistant had nothing to say. Please ask again.", // assistant error
  "server.chat_stopped": "The assistant stopped unexpectedly.", // assistant error
  "server.bad_request": "That request could not be understood. Please check and try again.", // server error
  "server.too_many_items": "A basket can hold up to {max} different items.", // server error
  "server.mixed_sellers": "One payment can only cover one seller. Pay for each seller's items separately.", // server error
  "server.bad_date": "Choose a date from today up to two weeks ahead.", // server error
  "server.bad_address": "Please complete the delivery address: place the pin, describe the place, and add the name of the person receiving it.", // server error
  "server.contact_in_text": "Phone numbers, e-mails and links can't be shared here. Message each other in the app instead.", // server error
  "server.no_pickup_location": "The seller has not marked their place on the map, so delivery can't be arranged.", // server error
  "server.delivery_not_offered": "That way of getting the order is not offered by this seller.", // server error
  "server.delivery_too_far": "That is too far for this delivery option (up to {max} km).", // server error
  "server.delivery_too_heavy": "This order is too heavy for one carrier. Message the seller to arrange it.", // server error
  "server.delivery_price_changed": "The delivery fee is now {amount}. Please check it and pay again.", // server error
  "server.order_not_found": "That order could not be found.", // server error
  "server.order_not_yours": "That belongs to someone else.", // server error
  "server.wrong_status": "That can't be done at this stage of the order.", // server error
  "server.not_platform_delivery": "This order is not set up for an AfriAgriFed carrier.", // server error
  "server.job_exists": "A carrier has already been requested for this order.", // server error
  "server.bad_ready_time": "Choose a time the goods will be ready, within the next 3 days.", // server error
  "server.not_a_carrier": "Only approved carriers can take delivery jobs.", // server error
  "server.carrier_unavailable": "You are marked as not available. Switch to available to take jobs.", // server error
  "server.own_order": "You can't deliver your own order.", // server error
  "server.job_not_found": "That delivery job could not be found.", // server error
  "server.vehicle_too_small": "Your vehicle is too small for this load.", // server error
  "server.too_many_jobs": "You already have {max} jobs. Finish one first.", // server error
  "server.job_taken": "Someone else just took this job.", // server error
  "server.not_travelling": "The order is not on its way right now.", // server error
  "server.bad_location": "That position does not look right.", // server error
  "server.code_required": "At a collection the buyer's code is needed. They can also confirm in the app.", // server error
  "server.reason_required": "Please give a reason.", // server error
  "server.no_code": "This order has no handover code. Use the buyer's confirmation instead.", // server error
  "server.code_locked": "Too many wrong codes. Contact support to finish this order.", // server error
  "server.wrong_code": "That code is not right.", // server error
  "server.window_closed": "It is too early or too late to report a problem on this order. Message the seller or contact support.", // server error
  "server.admin_only": "Only support staff can do that.", // server error
  // ---- serverApi ----
  "serverApi.notConfigured": "No backend configured", // technical error shown in brackets on the weather map
  "serverApi.unreachable": "Backend unreachable", // technical error shown in brackets on the weather map
  "serverApi.unreachableWhy": "Backend unreachable ({reason})", // technical error shown in brackets on the weather map
  "serverApi.returned": "Backend returned {status}", // technical error shown in brackets on the weather map
  "serverApi.unreadable": "Backend sent an unreadable response", // technical error shown in brackets on the weather map
  "serverApi.dataRequestFailed": "Data request failed ({status})", // technical error
  "serverApi.weatherReturned": "Weather service returned {status}", // technical error
  // ---- shell ----
  "shell.toggleNavigation": "Toggle navigation", // aria-label · AppShell.js
  "shell.afriagrifedHome": "AfriAgriFed home", // title · AppShell.js
  "shell.logout": "Logout", // span · AppShell.js
  "shell.yourProfile": "Your profile", // title · AppShell.js
  "shell.setUpYourProfile": "Set up your profile", // either/or · AppShell.js
  "shell.expandMenu": "Expand menu", // aria-label · AppShell.js
  "shell.collapseMenu": "Collapse menu", // aria-label · AppShell.js
  "shell.expandMenu2": "Expand menu [", // title · AppShell.js
  "shell.collapseMenu2": "Collapse menu [", // title · AppShell.js
  "shell.nameProfile": "{name} - your profile", // hover text of the member chip when the menu is folded
  "shell.member": "Member", // shown when a member has no name
  // ---- signIn ----
  "signIn.yourFarmerAccountIsStillAwaiting": "Your farmer account is still awaiting admin approval.", // toast.error · SignIn.js
  "signIn.yourInstitutionAccountIsStillAwaiting": "Your institution account is still awaiting admin approval.", // toast.error · SignIn.js
  "signIn.home": "Home", // button · SignIn.js
  "signIn.contactUs": "Contact Us", // button · SignIn.js
  "signIn.email": "Email *", // label · SignIn.js
  "signIn.password": "Password *", // label · SignIn.js
  "signIn.forgotPassword": "Forgot password?", // Link · SignIn.js
  "signIn.emailIsRequired": "Email is required", // validation message · SignIn.js
  "signIn.passwordIsRequired": "Password is required", // validation message · SignIn.js
  "signIn.signingIn": "Signing In...", // either/or · SignIn.js
  "signIn.signIn": "Sign In", // either/or · SignIn.js
  "signIn.loginFailed": "Login failed. Please try again.", // toast
  "signIn.needAccount": "Need an account? {register}.", // under the sign-in form; {register} is a link
  "signIn.quickAccessDev": "or use {link} (development only)", // only shown while developing the site, never to visitors
  // ---- spaces ----
  "spaces.communitySpaces": "Community spaces", // aria-label · CommunitySpaces.js
  // ---- statistics ----
  "statistics.trendsNotJustTotals": "Trends, not just totals", // eyebrow · StatisticsDashboard.js
  "statistics.statisticsDashboard": "Statistics Dashboard", // title · StatisticsDashboard.js
  "statistics.nothingHasBeenRecordedYetCharts": "Nothing has been recorded yet. Charts fill in as producers list products, buyers post requests and institutions publish research and training.", // p · StatisticsDashboard.js
  "statistics.couldNotLoad": "Could not load", // either/or · StatisticsDashboard.js
  "statistics.loading": "Loading...", // either/or · StatisticsDashboard.js
  "statistics.subtitle": "Activity over the last {days} days, compared with the {days} days before.", // under the page title
  "statistics.noActivity": "No activity in either period", // under a chart
  "statistics.newNone": "{total} new, none in the {days} days before", // under a chart
  "statistics.vsBefore": "{change} vs the {days} days before", // under a chart; {change} is e.g. +3 or -2
  "statistics.chartLabel": "{label}: {total} in the last {days} days", // accessible name of a chart
  // ---- time ----
  "time.justNow": "just now", // "5 min ago" style times
  "time.minutesAgo": "{count} min ago",
  "time.hoursAgo": "{count} h ago",
  "time.daysAgo_one": "{count} day ago",
  "time.daysAgo_other": "{count} days ago",
  "time.minutesAgoShort": "{count}m ago", // compact time on feed posts
  "time.hoursAgoShort": "{count}h ago", // compact time on feed posts
  "time.daysAgoShort": "{count}d ago", // compact time on feed posts
  // ---- tracker ----
  "tracker.thisOrderWasCancelledContactSupport": "This order was cancelled. Contact support if you have questions about a refund.", // p · OrderTracker.js
  "tracker.orderProgress": "Order progress", // aria-label · OrderTracker.js
  "tracker.addNoteOptionalEgPickupTime": "Add a note (optional), e.g. pickup time or driver", // placeholder · OrderTracker.js
  "tracker.noteForTheOtherParty": "Note for the other party", // aria-label · OrderTracker.js
  "tracker.fulfilment": "Fulfilment", // eyebrow · OrderTracker.js
  "tracker.orderTracker": "Order Tracker", // title · OrderTracker.js
  "tracker.followEveryOrderFromPaymentTo": "Follow every order from payment to delivery.", // subtitle · OrderTracker.js
  "tracker.buying": "Buying", // button · OrderTracker.js
  "tracker.selling": "Selling", // button · OrderTracker.js
  "tracker.filterOrders": "Filter orders", // aria-label · OrderTracker.js
  "tracker.inProgress": "In progress", // button · OrderTracker.js
  "tracker.completed": "Completed", // button · OrderTracker.js
  "tracker.loadingYourOrders": "Loading your orders…", // p · OrderTracker.js
  "tracker.youDidNotHaveEnoughStock": "You did not have enough stock to fill this order in full. Contact the buyer to agree what to do, or ask for a refund.", // either/or · OrderTracker.js
  "tracker.theSellerDidNotHaveEnough": "The seller did not have enough stock to fill this order in full. They will contact you, or you can ask for a refund.", // either/or · OrderTracker.js
  "tracker.saving": "Saving…", // either/or · OrderTracker.js
  "tracker.noOrdersInProgressPurchasesFrom": "No orders in progress. Purchases from the Marketplace will appear here.", // either/or · OrderTracker.js
  "tracker.noOrdersWaitingOnYouNew": "No orders waiting on you. New paid orders will appear here and you'll get a notification.", // either/or · OrderTracker.js
  "tracker.noCompletedOrdersYet": "No completed orders yet.", // either/or · OrderTracker.js
  "tracker.order": "Order", // either/or · OrderTracker.js
  "tracker.buyer": "Buyer", // either/or · OrderTracker.js
  "tracker.seller": "Seller", // either/or · OrderTracker.js
  "tracker.youCanMakeThatChangeRight": "You can't make that change right now.", // toast.error · OrderTracker.js
  "tracker.messageBuyer": "Message buyer", // button on an order
  "tracker.messageSeller": "Message seller", // button on an order
  "tracker.history": "History ({count})", // button that opens the list of order steps
  "tracker.ref": "Ref {id}", // payment reference on an order
  "tracker.orderMarked": "Order marked {status}.", // toast; {status} is the new status in lower case, e.g. delivered
  "tracker.couldNotLoad": "Could not load your orders: {error}", // error message
  // ---- training ----
  "training.pleaseAddTitleAndStartDate": "Please add a title and a start date.", // toast.error · TrainingPrograms.js
  "training.educationProducers": "Education & producers", // eyebrow · TrainingPrograms.js
  "training.trainingPrograms": "Training Programs", // title · TrainingPrograms.js
  "training.programsInstitutionsRunForFarmersShared": "Programs institutions run for farmers, shared to the community feed.", // subtitle · TrainingPrograms.js
  "training.postTrainingProgram": "Post a Training Program", // h2 · TrainingPrograms.js
  "training.title": "Title", // label · TrainingPrograms.js
  "training.egSoilHealthCompostingWorkshop": "e.g., Soil health & composting workshop", // placeholder · TrainingPrograms.js
  "training.description": "Description", // label · TrainingPrograms.js
  "training.mode": "Mode", // label · TrainingPrograms.js
  "training.inPerson": "In-person", // option · TrainingPrograms.js
  "training.online": "Online", // option · TrainingPrograms.js
  "training.hybrid": "Hybrid", // option · TrainingPrograms.js
  "training.locationLink": "Location / Link", // label · TrainingPrograms.js
  "training.venueOrMeetingLink": "Venue or meeting link", // placeholder · TrainingPrograms.js
  "training.startDate": "Start Date", // label · TrainingPrograms.js
  "training.recordedClassTutorialLinkOptional": "Recorded class / tutorial link (optional)", // label · TrainingPrograms.js
  "training.youtubeVimeoOrOtherVideoLink": "YouTube, Vimeo or other video link", // placeholder · TrainingPrograms.js
  "training.noTrainingProgramsPostedYet": "No training programs posted yet.", // p · TrainingPrograms.js
  "training.watchRecordedClass": "Watch recorded class", // a · TrainingPrograms.js
  "training.postProgram": "Post Program", // either/or · TrainingPrograms.js
  "training.posting": "Posting...", // either/or · TrainingPrograms.js
  "training.couldNotPost": "Could not post training program: {error}", // error toast
  "training.hostedBy": "Hosted by {name}", // who runs a training program
  "training.feedPost": "New training program: {title} ({mode}, starts {date}). See Training Programs for details.", // automatic post in the community feed (stored in English)
  // ---- translate ----
  "translate.button": "Translate", // button under a post written in another language
  "translate.working": "Translating…", // while a post is being translated
  "translate.showOriginal": "Show original", // button: go back to what the member wrote
  "translate.showTranslation": "Show translation", // button: see the translation again
  "translate.note": "Translated from {from} by a machine. It can contain mistakes.", // line under a translated post; {from} is the language name
  "translate.limit": "The free translation limit has been reached for now. Please try again later.", // error under a post
  "translate.failed": "Could not translate this. Please try again.", // error under a post
  "translate.unavailable": "Translation is not available on this device right now.", // error under a post
  // ---- verifyEmail ----
  "verifyEmail.mailVerifiedThankYou": "E-mail verified. Thank you!", // toast.success · VerifyEmail.js
  "verifyEmail.sendMeTheLink": "Send me the link", // button · VerifyEmail.js
  "verifyEmail.haveVerified": "I have verified", // button · VerifyEmail.js
  "verifyEmail.hideThisReminder": "Hide this reminder", // aria-label · VerifyEmail.js
  "verifyEmail.haveVerifiedMyMail": "I have verified my e-mail", // button · VerifyEmail.js
  "verifyEmail.sendTheMailAgain": "Send the e-mail again", // button · VerifyEmail.js
  "verifyEmail.thisAreaIsOnlyForVerified": "This area is only for verified accounts.", // either/or · VerifyEmail.js
  "verifyEmail.couldNotSendTheMail": "Could not send the e-mail.", // toast.error · VerifyEmail.js
  "verifyEmail.notVerifiedYetOpenTheLink": "Not verified yet. Open the link in the e-mail we sent, then try again.", // toast · VerifyEmail.js
  "verifyEmail.verifyYourMailToContinue": "Verify your e-mail to continue", // default text · VerifyEmail.js
  "verifyEmail.sentTo": "Verification e-mail sent to {email}. Check your spam folder too.", // toast
  "verifyEmail.justSent_one": "An e-mail was just sent. You can ask for another in {count} second.", // toast; wait before asking again
  "verifyEmail.justSent_other": "An e-mail was just sent. You can ask for another in {count} seconds.", // toast; wait before asking again
  "verifyEmail.pleaseVerify": "Please verify your e-mail address ({email}). It keeps your account safe and recoverable.", // banner; {email} is shown in bold
  "verifyEmail.weSentLink": "We sent a link to {email}. Open it (check your spam folder too), then come back here.", // full-page notice; {email} is shown in bold
  // ---- weatherGrid ----
  "weatherGrid.weatherServiceReturnedAnIncompleteGrid": "Weather service returned an incomplete grid", // error message · weatherGrid.js
  // ---- weatherMap ----
  "weatherMap.thisBrowserCanShareYourLocation": "This browser can't share your location.", // toast.error · MapPage.js
  "weatherMap.map": "Map", // title · MapPage.js
  "weatherMap.liveWeatherSatelliteAndFarmingInformation": "Live weather, satellite and farming information, region by region.", // subtitle · MapPage.js
  "weatherMap.mapType": "Map type", // aria-label · MapPage.js
  "weatherMap.weather": "Weather", // p · MapPage.js
  "weatherMap.wind": "Wind", // button · MapPage.js
  "weatherMap.windModelledFlow10AboveGround": "Wind: modelled flow 10 m above ground; faster wind shows brighter trails.", // p · MapPage.js
  "weatherMap.hazards": "Hazards", // p · MapPage.js
  "weatherMap.fireHotspots": "Fire hotspots", // button · MapPage.js
  "weatherMap.under6": "under 6 h", // span · MapPage.js
  "weatherMap.nasaFirmsViirsUpdatedAboutEvery": "NASA FIRMS (VIIRS), updated about every 15 minutes", // p · MapPage.js
  "weatherMap.loadingForecast": "Loading forecast…", // p · MapPage.js
  "weatherMap.goTo": "Go to", // p · MapPage.js
  "weatherMap.allNamibia": "All Namibia", // button · MapPage.js
  "weatherMap.oshana": "Oshana", // button · MapPage.js
  "weatherMap.goToRegion": "Go to a region", // aria-label · MapPage.js
  "weatherMap.chooseRegion": "Choose a region…", // option · MapPage.js
  "weatherMap.tapAnywhereOnTheMapFor": "Tap anywhere on the map for that spot's weather and crop information.", // p · MapPage.js
  "weatherMap.time": "Time", // aria-label · MapPage.js
  "weatherMap.toggleDetails": "Toggle details", // aria-label · MapPage.js
  "weatherMap.myFarm": "My farm", // button · MapPage.js
  "weatherMap.weatherCrops": "Weather & crops", // button · MapPage.js
  "weatherMap.fireDataIsUnavailableRightNow": "Fire data is unavailable right now.", // either/or · MapPage.js
  "weatherMap.loadingFireHotspots": "Loading fire hotspots…", // either/or · MapPage.js
  "weatherMap.findingYou": "Finding you...", // either/or · MapPage.js
  "weatherMap.myLocation": "My location", // either/or · MapPage.js
  "weatherMap.hideDetails": "Hide details", // either/or · MapPage.js
  "weatherMap.showDetails": "Show details", // either/or · MapPage.js
  "weatherMap.youSeemToBeOutsideNamibia": "You seem to be outside Namibia, so the map can't show your spot.", // toast · MapPage.js
  "weatherMap.locationIsBlockedForThisSite": "Location is blocked for this site. Allow it in your browser's address bar, then try again.", // toast.error · MapPage.js
  "weatherMap.yourLocationCouldnBeFoundPlease": "Your location couldn't be found. Please try again outdoors or with Wi-Fi on.", // toast.error · MapPage.js
  "weatherMap.layers": "Layers", // either/or · MapPage.js
  "weatherMap.pause": "Pause", // aria-label · MapPage.js
  "weatherMap.play": "Play", // aria-label · MapPage.js
  "weatherMap.observed": "Observed", // either/or · MapPage.js
  "weatherMap.forecast": "Forecast", // either/or · MapPage.js
  "weatherMap.firesShort": "Fires", // short name of the fire layer, shown on the layers button
  "weatherMap.windSource": "Wind: ECMWF IFS 0.25° via Open-Meteo", // data source line; keep the model and provider names
  "weatherMap.youAreHere": "You are here", // tooltip on the pin showing where you are
  "weatherMap.fireDetections_one": "{count} satellite heat detection in the last 48 hours. These are not confirmed fires, and satellites pass only a few times a day.", // fire layer note
  "weatherMap.fireDetections_other": "{count} satellite heat detections in the last 48 hours. These are not confirmed fires, and satellites pass only a few times a day.", // fire layer note
  "weatherMap.gridError": "Could not load the forecast grid ({error}). Satellite layers and tap-for-weather still work.", // error message
  "weatherMap.satError": "Satellite imagery is unavailable right now ({error}).", // error message
  "weatherMap.age6to24": "6-24 h", // age of a fire hotspot in the map key: hours
  "weatherMap.age24to48": "24-48 h", // age of a fire hotspot in the map key: hours
  // ---- wind ----
  "wind.plain": "{speed} m/s", // wind speed
  "wind.from": "{speed} m/s from {dir}", // wind speed and where it blows from, e.g. 3.2 m/s from SW
  "wind.plainGust": "{speed} m/s, gusts {gust}", // wind speed with gusts
  "wind.fromGust": "{speed} m/s from {dir}, gusts {gust}", // wind speed from a direction, with gusts
};
