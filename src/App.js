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

// Lazy-loaded so the map library only downloads when someone opens the map.
const FarmMap = React.lazy(() => import("./FarmMap"));

const isApprovedStatus = (userData) =>
  userData.approved === true ||
  userData.status === "approved" ||
  userData.status === "verified" ||
  userData.accountStatus?.registrationStatus === "verified" ||
  userData.accountStatus?.documentStatus === "approved";

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
      <Route path="/quick-access" element={<QuickAccess />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ConsumerDashboard />
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

      <Route
        path="/farm-map"
        element={
          <ProtectedRoute>
            <React.Suspense fallback={<p style={{ padding: 24 }}>Loading map…</p>}>
              <FarmMap />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

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
