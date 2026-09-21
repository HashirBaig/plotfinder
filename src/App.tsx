import { Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";

import LandingPage from "./pages/LandingPage";
// import { useUserStore } from "./store/userStore";

import "./App.css";
// import { useEffect, useRef } from "react";

function App() {
  // const hasFetchedRef = useRef(false);
  // const hasHydrated = useUserStore((state) => state.hasHydrated);
  // const username = useUserStore((state) => state.username);
  // const fetchGuestUser = useUserStore((state) => state.fetchGuestUser);

  // useEffect(() => {
  //   if (hasFetchedRef.current) return;
  //   hasFetchedRef.current = true;

  //   if (!hasHydrated) return;

  //   if (!username) {
  //     fetchGuestUser();
  //   }
  // }, [hasHydrated, username, fetchGuestUser]);

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
      </Routes>
      <Toaster richColors position="bottom-center" />
    </>
  );
}

export default App;
