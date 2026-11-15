import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { FacebookIcon, XIcon, InstagramIcon, LinkedinIcon } from "./SocialIcons";

import fullLogo from "./images/full-logo.png";
import footerLogo from "./images/footer-logo.png";
import farmingImg from "./images/farming-data.jpg";
import statisticsImg from "./images/statistics.jpg";
import promotionImg from "./images/promotion.jpg";
import programsImg from "./images/programs.jpg";
import aiBot from "./images/AI-bot.png";
import { OPEN_CHAT_EVENT } from "./AIChat";
import { backendConfigured } from "./apiBase";

import farmersImg from "./images/farming.jpg";
import consumersImg from "./images/consumers.jpg";
import educatorsImg from "./images/educators.jpg";
import { t, LanguageSwitcher } from "./i18n";

// The assistant runs on the backend; until that is online the bubble stays a
// greeting rather than a button that does nothing.
const CHAT_ON = backendConfigured();

gsap.registerPlugin(TextPlugin);

export default function Home() {

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Refs
  const logoRef = useRef(null);
  const cardRefs = useRef([]);
  const headlineRef = useRef(null);
  const subtitleRef = useRef(null);
  const navBtnRefs = useRef([]);
  const navRef = useRef(null);
  const aiBotRef = useRef(null);
  const aiMessageRef = useRef(null);
  const sectionRef = useRef(null);
  const sectionCardsRef = useRef([]);
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();

  const heroCards = [
    { title: t("home.cardFarmingData"), desc: t("home.cardFarmingDataDesc"), img: farmingImg },
    { title: t("home.cardStatistics"), desc: t("home.cardStatisticsDesc"), img: statisticsImg },
    { title: t("home.cardPromotion"), desc: t("home.cardPromotionDesc"), img: promotionImg },
    { title: t("home.cardPrograms"), desc: t("home.cardProgramsDesc"), img: programsImg }
  ];

  const sectionCards = [
  { 
    title: t("home.sectionFarmers"), 
    desc: t("home.sectionFarmersDesc"),
    img: farmersImg 
  },
  { 
    title: t("home.sectionConsumers"), 
    desc: t("home.sectionConsumersDesc"),
    img: consumersImg 
  },
  { 
    title: t("home.sectionInstitutions"), 
    desc: t("home.sectionInstitutionsDesc"),
    img: educatorsImg 
  }
];

  // Navigation handlers
  const handleRegisterClick = () => navigate("/register");
  const handleSignInClick = () => navigate("/signin");
  const handleContactClick = () => {
    const contactSection = document.querySelector('.contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const handleBackToHome = () => navigate("/home");

  // Contact form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: "", email: "", message: "" });
    }, 3000);
  };

  // Add cards to refs array
  const addToCardRefs = (el) => {
    if (el && !cardRefs.current.includes(el)) {
      cardRefs.current.push(el);
    }
  };

  // Add section cards to refs array
  const addToSectionCardRefs = (el) => {
    if (el && !sectionCardsRef.current.includes(el)) {
      sectionCardsRef.current.push(el);
    }
  };

  // Add nav buttons to refs array
  const addToNavBtnRefs = (el, index) => {
    if (el) {
      navBtnRefs.current[index] = el;
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted ) return;

    // Reset ref arrays
    cardRefs.current = [];
    navBtnRefs.current = [];
    sectionCardsRef.current = [];

    const tl = gsap.timeline();

    // Only animate elements that exist
    if (navRef.current) {
      tl.from(navRef.current, {
        y: -30,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out"
      });
    }

    // Animate nav buttons that exist
    const validNavBtns = navBtnRefs.current.filter(btn => btn);
    if (validNavBtns.length > 0) {
      tl.from(validNavBtns, {
        y: -10,
        opacity: 0,
        stagger: 0.1,
        duration: 0.4
      });
    }

    if (logoRef.current) {
      tl.from(logoRef.current, {
        opacity: 0,
        y: -40,
        scale: 0.7,
        duration: 1,
        ease: "power3.out"
      });
    }

    // Animate cards that exist
    const validCards = cardRefs.current.filter(card => card);
    if (validCards.length > 0) {
      tl.from(validCards, {
        opacity: 0,
        y: 50,
        scale: 0.92,
        stagger: 0.15,
        duration: 0.8,
        ease: "back.out(1.5)"
      });
    }

    if (headlineRef.current) {
      gsap.set(headlineRef.current, { text: "" });
      tl.to(headlineRef.current, {
        duration: 2.5,
        text: t("home.headline"),
        ease: "none"
      });
    }

    if (subtitleRef.current) {
      tl.from(subtitleRef.current, {
        opacity: 0,
        y: 20,
        duration: 1,
        ease: "power2.out"
      }, "-=0.6");
    }

    // Animate section cards with wave effect
    if (sectionRef.current) {
      const sectionCards = sectionCardsRef.current.filter(card => card);
      if (sectionCards.length > 0) {
        tl.from(sectionRef.current, {
          opacity: 0,
          y: 100,
          duration: 1.2,
          ease: "power3.out"
        }, "-=0.5")
        .from(sectionCards, {
          opacity: 0,
          y: 80,
          scale: 0.9,
          stagger: 0.2,
          duration: 1,
          ease: "back.out(1.4)"
        }, "-=0.8");
      }
    }

    // AI Bot Animation
    if (aiBotRef.current && aiMessageRef.current) {
      // Bouncing animation for AI bot
      gsap.to(aiBotRef.current, {
        y: -10,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
        delay: 3
      });

      // Typing animation for AI messages
      const aiTl = gsap.timeline({ delay: 4 });
      
      aiTl.set(aiMessageRef.current, { text: "" })
         .to(aiMessageRef.current, {
           duration: 3,
           text: t("home.botHello"),
           ease: "none"
         })
         .to(aiMessageRef.current, {
           duration: 0.5,
           opacity: 0,
           ease: "power2.inOut"
         })
         .set(aiMessageRef.current, { text: "" })
         .to(aiMessageRef.current, {
           duration: 0.5,
           opacity: 1,
           ease: "power2.inOut"
         })
         .to(aiMessageRef.current, {
           duration: 3,
           text: CHAT_ON ? t("home.botTap") : t("home.botSoon"),
           ease: "none"
         });
    }

    // Cleanup function
    return () => {
      tl.kill();
    };
  }, [isMounted]);

  // Page rendering logic


  return (
    <div className="home">
      {/* NAVBAR */}
      <nav ref={navRef} className="navbar">
        <div className="nav-links">
          <LanguageSwitcher tone="dark" />
          <button
            ref={el => addToNavBtnRefs(el, 0)}
            className="nav-btn"
            onClick={handleRegisterClick}
          >
            {t("home.register")}
          </button>
          <button
            ref={el => addToNavBtnRefs(el, 1)}
            className="nav-btn"
            onClick={handleSignInClick}
          >
            {t("common.signIn")}
          </button>
          <button
            ref={el => addToNavBtnRefs(el, 2)}
            className="nav-btn primary"
            onClick={handleContactClick}
          >
            {t("home.contactUs")}
          </button>
        </div>
      </nav>

      {/* AI ASSISTANT */}
      <div className="ai-assistant">
        <div className="ai-bot-container">
          {/* The bubble is the real thing now: it opens the AAF Assistant
              (src/AIChat.js), which is mounted once in App.js. */}
          {CHAT_ON ? (
            <button
              type="button"
              className="ai-bot-button"
              onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))}
              aria-label={t("home.openTheAafAssistant")}
            >
              <img
                ref={aiBotRef}
                src={aiBot}
                alt=""
                className="ai-bot"
              />
            </button>
          ) : (
            <img ref={aiBotRef} src={aiBot} alt={t("home.aafAssistantComingSoon")} className="ai-bot" />
          )}
          <div className="ai-message" ref={aiMessageRef}></div>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="hero-section">
        {/* LOGO CONTAINER */}
        <div className="logo-container">
          <div className="logo-box" ref={logoRef}>
            <img src={fullLogo} alt={t("home.afriagrifedDigitalizingAfricaFoodSecurityFro")} className="hero-logo" />
          </div>
        </div>

        <h1 ref={headlineRef} className="hero-title">
          {t("home.fightingFoodInsecurityOneConnectionAt")}
        </h1>

        <p ref={subtitleRef} className="hero-subtitle">
          {t("home.afriagrifedCombatsAfricaFoodInsecurityBy")}
        </p>

        {/* Prominent Call-to-Action Buttons */}
        <div className="cta-buttons">
          <button className="cta-btn primary" onClick={handleRegisterClick}>
            {t("home.getStartedRegisterNow")}
          </button>
          <button className="cta-btn secondary" onClick={handleSignInClick}>
            {t("home.signInToYourAccount")}
          </button>
        </div>

        {/* CARDS */}
        <div className="cards-row">
          {heroCards.map((c, i) => (
            <div
              key={i}
              ref={addToCardRefs}
              className="hero-card"
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url(${c.img})`
              }}
            >
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TARGET AUDIENCE SECTION */}
      <section ref={sectionRef} className="audience-section">
        <div className="section-header">
          <h2>{t("home.ourTargetAudience")}</h2>
            <p>{t("home.groupingProducersTheMarketAndEducators")}</p>
        </div>
        
        <div className="section-cards">
          {sectionCards.map((card, i) => (
            <div
              key={i}
              ref={addToSectionCardRefs}
              className="audience-card"
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${card.img})`
              }}
            >
              <div className="card-wave"></div>
              <div className="card-content">
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section className="contact-section">
        <div className="section-header">
          <h2>{t("home.contactUs")}</h2>
          <p>{t("home.getInTouchWithOurTeam")}</p>
        </div>

        <div className="contact-container">
          <div className="contact-info">
            <h3>{t("home.contactInformation")}</h3>
            <div className="contact-details">
              <div className="contact-item">
                <div className="contact-icon"><Mail size={20} /></div>
                <div>
                  <h4>{t("home.email")}</h4>
                  <p>{t("home.afriagrifedOutlookCom")}</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon"><Phone size={20} /></div>
                <div>
                  <h4>{t("home.phone")}</h4>
                  <p>+264 81 778 6565</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon"><MapPin size={20} /></div>
                <div>
                  <h4>{t("home.location")}</h4>
                  <p>{t("home.oshakatiNamibia")}</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon"><Clock size={20} /></div>
                <div>
                  <h4>{t("home.workingHours")}</h4>
                  <p>{t("home.monFri800Am5")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-container">
            <h3>{t("home.sendUsMessage")}</h3>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  name="name"
                  placeholder={t("home.yourName")}
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  placeholder={t("home.yourEmail")}
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <textarea
                  name="message"
                  placeholder={t("home.yourMessage")}
                  rows="5"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitted}>
                {isSubmitted ? t("home.messageSent") : t("home.sendMessage")}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER BANNER */}
      <footer className="footer-banner">
        <div className="footer-content">
          <img src={footerLogo} alt={t("home.afriagrifedDigitalizingAfricaFoodSecurityFro")} className="footer-brand-banner" loading="lazy" />
          <p className="footer-tagline">{t("home.digitizingNamibiaAgriculturalLandscape")}</p>

          <div className="footer-social">
            <p>{t("home.followUs")}</p>
            <div className="social-icons">
              <span className="social-icon"><FacebookIcon /></span>
              <span className="social-icon"><XIcon /></span>
              <span className="social-icon"><InstagramIcon /></span>
              <span className="social-icon"><LinkedinIcon /></span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {t("home.rights", { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}