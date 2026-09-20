import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Wall from "./pages/Wall";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/muro" element={<Wall />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
