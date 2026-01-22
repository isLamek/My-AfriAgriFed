import React, { useState } from 'react';
import Home from './Home';
import Register from './Register';
import SignIn from './SignIn';
import './App.css';
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCcTP0FGWW8RZdVHGP2RfgL7I6FP6SVTTw",
  authDomain: "afriagrifed-ebc30.firebaseapp.com",
  projectId: "afriagrifed-ebc30",
  storageBucket: "afriagrifed-ebc30.firebasestorage.app",
  messagingSenderId: "936599860460",
  appId: "1:936599860460:web:e14467de59e30285ed61c9",
  measurementId: "G-7WFC56EJZL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'register':
        return <Register 
          onBackToHome={() => setCurrentPage('home')}
          onNavigateToSignIn={() => setCurrentPage('signin')}
        />;
      case 'signin':
        return <SignIn onBackToHome={() => setCurrentPage('home')} />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };



  return (
    <div className="App">
      {renderPage()}
    </div>
  );
}

export default App;