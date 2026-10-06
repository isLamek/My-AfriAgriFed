import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import SiteFooter from "./SiteFooter";
import { BUSINESS } from "./business";

import fullLogo from "./images/full-logo.png";
import footerLogo from "./images/footer-logo.png";
import farmingImg from "./images/farming-data.jpg";
import statisticsImg from "./images/statistics.jpg";
import promotionImg from "./images/promotion.jpg";
import programsImg from "./images/programs.jpg";
import farmersImg from "./images/farming.jpg";
import consumersImg from "./images/consumers.jpg";
import educatorsImg from "./images/educators.jpg";

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
  const sectionRef = useRef(null);
  const sectionCardsRef = useRef([]);
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();

  const heroCards = [
    { title: "Weather & crops", desc: "Rain, wind and crop guidance for every region", img: farmingImg },
    { title: "Market data", desc: "What is listed and requested on the platform", img: statisticsImg },
    { title: "Marketplace", desc: "Buy from and sell to producers directly", img: promotionImg },
    { title: "Learning", desc: "Research, training and internships", img: programsImg }
  ];

  const sectionCards = [
  { 
    title: "Producers", 
    desc: "List your produce, get paid online, answer buyers' bulk requests and plan with weather and crop data for your farm.",
    img: farmersImg 
  },
  { 
    title: "Buyers", 
    desc: "Households, shops, restaurants and schools buying straight from Namibian producers, or posting what they need in bulk.",
    img: consumersImg 
  },
  { 
    title: "Tertiary Institutions", 
    desc: "Publish research and training, offer internships, and answer the problems producers bring to you.",
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

  // There is no mail server behind this form yet, so it opens the visitor's own
  // e-mail app with the message filled in, rather than pretending to send it.
  const handleSubmit = async (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Message from ${formData.name} via the AfriAgriFed website`);
    const body = encodeURIComponent(`${formData.message}\n\n${formData.name}\n${formData.email}`);
    window.location.href = `mailto:${BUSINESS.email}?subject=${subject}&body=${body}`;
    setIsSubmitted(true);
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
        text: "Fighting Food Insecurity, One Connection at a Time",
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
          <button
            ref={el => addToNavBtnRefs(el, 0)}
            className="nav-btn"
            onClick={handleRegisterClick}
          >
            Register
          </button>
          <button
            ref={el => addToNavBtnRefs(el, 1)}
            className="nav-btn"
            onClick={handleSignInClick}
          >
            Sign In
          </button>
          <button
            ref={el => addToNavBtnRefs(el, 2)}
            className="nav-btn primary"
            onClick={handleContactClick}
          >
            Contact Us
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="hero-section">
        {/* LOGO CONTAINER */}
        <div className="logo-container">
          <div className="logo-box" ref={logoRef}>
            <img src={fullLogo} alt="AfriAgriFed - Digitalizing Africa's food security from African soil" className="hero-logo" />
          </div>
        </div>

        <h1 ref={headlineRef} className="hero-title">
          Fighting Food Insecurity, One Connection at a Time
        </h1>

        <p ref={subtitleRef} className="hero-subtitle">
          AfriAgriFed connects Namibian producers with buyers and institutions, and gives farmers the weather, market and
          training information they need to grow more.
        </p>

        {/* Prominent Call-to-Action Buttons */}
        <div className="cta-buttons">
          <button className="cta-btn primary" onClick={handleRegisterClick}>
            Create a free account
          </button>
          <button className="cta-btn secondary" onClick={handleSignInClick}>
            Sign in
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
          <h2>Who AfriAgriFed is for</h2>
            <p>One platform for producers, the people who buy from them, and the institutions that train and research.</p>
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
          <h2>Contact Us</h2>
          <p>Get in touch with our team for inquiries and support</p>
        </div>

        <div className="contact-container">
          <div className="contact-info">
            <h3>Contact Information</h3>
            <div className="contact-details">
              <div className="contact-item">
                <div className="contact-icon"><Mail size={20} /></div>
                <div>
                  <h4>Email</h4>
                  <p><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon"><Phone size={20} /></div>
                <div>
                  <h4>Phone</h4>
                  <p><a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a></p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon"><MapPin size={20} /></div>
                <div>
                  <h4>Location</h4>
                  <p>{BUSINESS.town}, {BUSINESS.country}</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon"><Clock size={20} /></div>
                <div>
                  <h4>Working Hours</h4>
                  <p>{BUSINESS.hours}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-container">
            <h3>Send us a message</h3>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="contact-name" className="aaf-visually-hidden">Your name</label>
                <input
                  id="contact-name"
                  autoComplete="name"
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-email" className="aaf-visually-hidden">Your e-mail address</label>
                <input
                  id="contact-email"
                  autoComplete="email"
                  type="email"
                  name="email"
                  placeholder="Your e-mail address"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-message" className="aaf-visually-hidden">Your message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  placeholder="Your message"
                  rows="5"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>
              <button type="submit" className="submit-btn">
                Write e-mail
              </button>
              <p className="contact-form-note" role="status">
                {isSubmitted
                  ? `Your e-mail app should now be open with your message. If it didn't open, write to ${BUSINESS.email}.`
                  : `This opens your e-mail app with the message ready to send to ${BUSINESS.email}. We use your details only to reply.`}
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <div className="footer-banner">
        <div className="footer-content">
          <img src={footerLogo} alt="AfriAgriFed - Digitalizing Africa's food security from African soil" className="footer-brand-banner" loading="lazy" />
        </div>
      </div>
      <SiteFooter tone="dark" />
    </div>
  );
}