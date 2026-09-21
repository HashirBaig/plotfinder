import { Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";

import LandingPage from "./pages/LandingPage";

import "./App.css";

function App() {
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
