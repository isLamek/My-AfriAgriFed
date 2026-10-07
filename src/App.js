import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Toaster } from "react-hot-toast";

import Home from "./Home";
import SignIn from "./SignIn";
import Register from "./Register";
import QuickAccess from "./QuickAccess";
import ForgotPassword from "./ForgotPassword";
import Admin from "./adminBlock";
import AdminDashboard from "./AdminDashboard";
import ConsumerDashboard from "./ConsumerDashboard";
import FarmerDashboard from "./FarmerDashboard";
import MyListings from "./MyListings";
import InstitutionDashboard from "./InstitutionDashboard";
import Prices from "./Prices";
import Profile from "./Profile";
import MyOrders from "./MyOrders";
import OrderTracker from "./OrderTracker";
import Messages from "./Messages";
import useAccountContext from "./useAccountContext";
import DemandBoard from "./DemandBoard";
import PageAccessGate from "./PageAccessGate";
import Research from "./Research";
import TrainingPrograms from "./TrainingPrograms";
import Internships from "./Internships";
import DataDashboard from "./DataDashboard";
import StatisticsDashboard from "./StatisticsDashboard";
import Promotions from "./Promotions";
import PaymentCallback from "./PaymentCallback";

import { auth, db } from "./firebaseConfig";
import { isAdmin } from "./admin";
import { needsVerification } from "./emailVerification";
import { VerifyEmailGate } from "./VerifyEmail";

// Lazy-loaded so the map library only downloads when someone opens the map.
const MapPage = React.lazy(() => import("./MapPage"));

const isApprovedStatus = (userData) =>
  userData.approved === true ||
  userData.status === "approved" ||
  userData.status === "verified" ||
  userData.accountStatus?.registrationStatus === "verified" ||
  userData.accountStatus?.documentStatus === "approved";

// /dashboard shows the Community Feed and Marketplace as the signed-in person:
// farmers get the farmer version (their menu, "My Listings"), institutions their
// own desk. Before, /dashboard always showed the buyer version, so a farmer who
// clicked "Community Feed" in the menu lost their farmer menu.
function RoleHome() {
  const { userType, profileLoaded } = useAccountContext("/dashboard");
  if (!profileLoaded) return <p style={{ padding: 24 }}>Loading...</p>;
  if (userType === "institution") return <Navigate to="/institutiondashboard" replace />;
  return <ConsumerDashboard role={userType === "farmer" ? "farmer" : "consumer"} />;
}

function ProtectedRoute({ children }) {
  const [user, setUser] = React.useState(auth.currentUser);
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
    });

    return () => unsubscribe();
  }, []);

  if (checking) {
    return <p>Checking account...</p>;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}

function FarmerRoute({ children }) {
  const [user, setUser] = React.useState(auth.currentUser);
  const [allowed, setAllowed] = React.useState(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setAllowed(false);
        return;
      }

      const snapshot = await getDoc(doc(db, "users", currentUser.uid));
      const userData = snapshot.exists() ? snapshot.data() : {};
      const admin = await isAdmin(currentUser);
      const isApprovedFarmer = userData.userType === "farmer" && isApprovedStatus(userData);

      setAllowed(admin || isApprovedFarmer);
    });

    return () => unsubscribe();
  }, []);

  if (!user && allowed === false) {
    return <Navigate to="/signin" replace />;
  }

  if (allowed === null) {
    return <p>Checking farmer approval...</p>;
  }

  return allowed ? children : <Navigate to="/dashboard" replace />;
}

function InstitutionRoute({ children }) {
  const [user, setUser] = React.useState(auth.currentUser);
  const [allowed, setAllowed] = React.useState(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setAllowed(false);
        return;
      }

      const snapshot = await getDoc(doc(db, "users", currentUser.uid));
      const userData = snapshot.exists() ? snapshot.data() : {};
      const admin = await isAdmin(currentUser);
      const isApprovedInstitution = userData.userType === "institution" && isApprovedStatus(userData);

      setAllowed(admin || isApprovedInstitution);
    });

    return () => unsubscribe();
  }, []);

  if (!user && allowed === false) {
    return <Navigate to="/signin" replace />;
  }

  if (allowed === null) {
    return <p>Checking institution approval...</p>;
  }

  return allowed ? children : <Navigate to="/dashboard" replace />;
}

function AdminRoute({ children }) {
  const [user, setUser] = React.useState(auth.currentUser);
  const [allowed, setAllowed] = React.useState(null);
  const [, refresh] = React.useState(0); // re-render after the e-mail gets verified

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setAllowed(false);
        return;
      }

      const ok = await isAdmin(currentUser);
      setAllowed(ok);
    });

    return () => unsubscribe();
  }, []);

  if (!user && allowed === false) {
    return <Navigate to="/signin" replace />;
  }

  if (allowed === null) {
    return <p>Checking admin...</p>;
  }

  // Admin rights belong to an e-mail address, so the address must be proven first
  // (the database rules require it too).
  if (allowed && needsVerification(user)) {
    return (
      <VerifyEmailGate
        user={user}
        onVerified={() => refresh((n) => n + 1)}
        title="Verify your e-mail to open the Admin area"
        reason="Admin access is tied to your e-mail address, so we need to confirm it is yours."
      />
    );
  }

  return allowed ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: "Poppins, sans-serif",
            fontSize: "0.9rem",
          },
          success: { iconTheme: { primary: "#044d3a", secondary: "#fff" } },
          error: { iconTheme: { primary: "#c0392b", secondary: "#fff" } },
        }}
      />
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      {process.env.NODE_ENV !== "production" && <Route path="/quick-access" element={<QuickAccess />} />}
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleHome />
          </ProtectedRoute>
        }
      />

      <Route
        path="/farmerdashboard"
        element={
          <FarmerRoute>
            <FarmerDashboard />
          </FarmerRoute>
        }
      />

      <Route
        path="/my-listings"
        element={
          <FarmerRoute>
            <MyListings />
          </FarmerRoute>
        }
      />

      <Route
        path="/institutiondashboard"
        element={
          <InstitutionRoute>
            <InstitutionDashboard />
          </InstitutionRoute>
        }
      />

      <Route
        path="/prices"
        element={
          <ProtectedRoute>
            <Prices />
          </ProtectedRoute>
        }
      />

      <Route
        path="/research"
        element={
          <ProtectedRoute>
            <Research />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-orders"
        element={
          <ProtectedRoute>
            <MyOrders />
          </ProtectedRoute>
        }
      />

      <Route
        path="/demand-board"
        element={
          <ProtectedRoute>
            <DemandBoard />
          </ProtectedRoute>
        }
      />

      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

      <Route
        path="/track-orders"
        element={
          <ProtectedRoute>
            <OrderTracker />
          </ProtectedRoute>
        }
      />

      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <React.Suspense fallback={<p style={{ padding: 24 }}>Loading map…</p>}>
              <MapPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="/farm-map" element={<Navigate to="/map" replace />} />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route path="/training" element={<TrainingPrograms />} />

      <Route
        path="/internships"
        element={
          <ProtectedRoute>
            <Internships />
          </ProtectedRoute>
        }
      />

      <Route
        path="/data"
        element={
          <PageAccessGate pageKey="data">
            <DataDashboard />
          </PageAccessGate>
        }
      />
      <Route
        path="/statistics"
        element={
          <PageAccessGate pageKey="statistics">
            <StatisticsDashboard />
          </PageAccessGate>
        }
      />
      <Route path="/promotions" element={<Promotions />} />
      <Route path="/payment-callback" element={<PaymentCallback />} />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;
