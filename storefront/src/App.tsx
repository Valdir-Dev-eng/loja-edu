import { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Products } from "./pages/Products";
import { ProductDetail } from "./pages/ProductDetail";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { Login } from "./pages/Login";
import { Onboarding } from "./pages/Onboarding";
import { Orders } from "./pages/Orders";
import { Addresses } from "./pages/Addresses";

export function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("onboardingPending")) {
      return;
    }
    const onboardingPending = params.get("onboardingPending") === "true";
    navigate(onboardingPending ? "/onboarding" : "/", { replace: true });
  }, [navigate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/produto/:id" element={<ProductDetail />} />
          <Route path="/carrinho" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/enderecos" element={<Addresses />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
