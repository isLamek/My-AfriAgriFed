import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { Toaster } from "react-hot-toast";

import Home from "./Home";
import SignIn from "./SignIn";
import Register from "./Register";
import QuickAccess from "./QuickAccess";
import ForgotPassword from "./ForgotPassword";
import Admin from "./adminBlock";
import AdminDashboard from "./AdminDashboard";
import Overview from "./Overview";
import Feed from "./Feed";
import Marketplace from "./Marketplace";
import Messages from "./Messages";
import Legal from "./Legal";
import CookieBanner from "./CookieBanner";
import MyListings from "./MyListings";
import InstitutionDashboard from "./InstitutionDashboard";
import Profile from "./Profile";
import OrderTracker from "./OrderTracker";
import DemandBoard from "./DemandBoard";
import PageAccessGate from "./PageAccessGate";
import Research from "./Research";
import TrainingPrograms from "./TrainingPrograms";
import Internships from "./Internships";
import DataDashboard from "./DataDashboard";
import StatisticsDashboard from "./StatisticsDashboard";
import Promotions from "./Promotions";
import PaymentCallback from "./PaymentCallback";

import { auth } from "./firebaseConfig";
import { useAccount } from "./AccountContext";
import { isAdmin } from "./admin";
import { needsVerification } from "./emailVerification";
import { homePathFor } from "./navConfig";
import { VerifyEmailGate } from "./VerifyEmail";

// Lazy-loaded so the map library only downloads when someone opens the map.
const MapPage = React.lazy(() => import("./MapPage"));

const Checking = ({ children }) => <p style={{ padding: 24, fontFamily: "Poppins, sans-serif" }}>{children}</p>;

function ProtectedRoute({ children }) {
  const { user, loading } = useAccount();
  if (user === undefined) return <Checking>Checking your account…</Checking>;
  if (!user || user.isAnonymous) return <Navigate to="/signin" replace />;
  if (loading) return <Checking>Loading…</Checking>;
  return children;
}

/**
 * Pages for one kind of approved account (e.g. My listings for producers).
 * Anyone else is sent to their own home page instead of a page they can't use.
 */
function RoleRoute({ role, children }) {
  const { user, loading, userType, approved, isAdminUser } = useAccount();
  if (user === undefined || (user && loading)) return <Checking>Checking your account…</Checking>;
  if (!user || user.isAnonymous) return <Navigate to="/signin" replace />;
  if (isAdminUser || (userType === role && approved)) return children;
  return <Navigate to={homePathFor(userType)} replace />;
}

/** The Overview is for buyers and producers; institutions start at their Research desk. */
function HomeRoute() {
  const { userType } = useAccount();
  if (userType === "institution") return <Navigate to="/institutiondashboard" replace />;
  return <Overview />;
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

      <Route path="/dashboard" element={<ProtectedRoute><HomeRoute /></ProtectedRoute>} />
      <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
      <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><OrderTracker /></ProtectedRoute>} />
      <Route path="/demand-board" element={<ProtectedRoute><DemandBoard /></ProtectedRoute>} />
      <Route path="/my-listings" element={<RoleRoute role="farmer"><MyListings /></RoleRoute>} />
      <Route path="/institutiondashboard" element={<RoleRoute role="institution"><InstitutionDashboard /></RoleRoute>} />

      {/* Old addresses, kept so bookmarks and old notifications still work. */}
      <Route path="/farmerdashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="/prices" element={<Navigate to="/marketplace" replace />} />
      <Route path="/my-orders" element={<Navigate to="/orders" replace />} />
      <Route path="/track-orders" element={<Navigate to="/orders" replace />} />

      {/* Legal pages: public, linked from every footer and the sign-up form. */}
      <Route path="/privacy" element={<Legal page="privacy" />} />
      <Route path="/terms" element={<Legal page="terms" />} />
      <Route path="/refunds" element={<Legal page="refunds" />} />
      <Route path="/cookies" element={<Legal page="cookies" />} />

      <Route
        path="/research"
        element={
          <ProtectedRoute>
            <Research />
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
      <CookieBanner />
    </>
  );
}

export default App;
