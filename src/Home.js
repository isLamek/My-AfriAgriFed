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
  const aiBotRef = useRef(null);
  const aiMessageRef = useRef(null);
  const sectionRef = useRef(null);
  const sectionCardsRef = useRef([]);
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();

  const heroCards = [
    { title: "Farming Data", desc: "Agricultural insights", img: farmingImg },
    { title: "Statistics", desc: "Real-time analytics", img: statisticsImg },
    { title: "Promotion", desc: "Market products", img: promotionImg },
    { title: "Programs", desc: "Training resources", img: programsImg }
  ];

  const sectionCards = [
  { 
    title: "Farmers", 
    desc: "Maximized interaction, connectivity to the market and educational resources to foster smooth upscaling.",
    img: farmersImg 
  },
  { 
    title: "Consumers", 
    desc: "Direct connectivity of Farmers and producers with buyers for fresh produce, sustained production and efficient transactions.",
    img: consumersImg 
  },
  { 
    title: "Tertiary Institutions", 
    desc: "Education resources, research data, training programs and solutions to problems towards boosting production.",
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
           text: "Hi! I'm AAF AI Assistant",
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
           text: "Need help? I'm here for you!",
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

      {/* AI ASSISTANT */}
      <div className="ai-assistant">
        <div className="ai-bot-container">
          <img 
            ref={aiBotRef}
            src={aiBot} 
            alt="AI Assistant" 
            className="ai-bot" 
          />
          <div className="ai-message" ref={aiMessageRef}></div>
        </div>
      </div>

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
          AfriAgriFed combats Africa's food insecurity by boosting food production through data driven agricultural innovation.
        </p>

        {/* Prominent Call-to-Action Buttons */}
        <div className="cta-buttons">
          <button className="cta-btn primary" onClick={handleRegisterClick}>
            Get Started - Register Now
          </button>
          <button className="cta-btn secondary" onClick={handleSignInClick}>
            Sign In to Your Account
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
          <h2>Our Target Audience</h2>
            <p>Grouping producers, the market and educators into an agriculturally focused platform.</p>
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
                  <p>afriagrifed@outlook.com</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon"><Phone size={20} /></div>
                <div>
                  <h4>Phone</h4>
                  <p>+264 81 778 6565</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon"><MapPin size={20} /></div>
                <div>
                  <h4>Location</h4>
                  <p>Oshakati, Namibia</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon"><Clock size={20} /></div>
                <div>
                  <h4>Working Hours</h4>
                  <p>Mon - Fri: 8:00 AM - 5:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-container">
            <h3>Send us a Message</h3>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <textarea
                  name="message"
                  placeholder="Your Message"
                  rows="5"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitted}>
                {isSubmitted ? "Message Sent!" : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER BANNER */}
      <footer className="footer-banner">
        <div className="footer-content">
          <img src={footerLogo} alt="AfriAgriFed - Digitalizing Africa's food security from African soil" className="footer-brand-banner" loading="lazy" />
          <p className="footer-tagline">Digitizing Namibia's Agricultural Landscape</p>

          <div className="footer-social">
            <p>Follow Us</p>
            <div className="social-icons">
              <span className="social-icon"><FacebookIcon /></span>
              <span className="social-icon"><XIcon /></span>
              <span className="social-icon"><InstagramIcon /></span>
              <span className="social-icon"><LinkedinIcon /></span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} AfriAgriFed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}