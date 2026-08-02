import { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { NotificationStack } from "./components/NotificationStack";
import { useNotifications } from "./hooks/useNotifications";
import { Home } from "./pages/Home";
import { Products } from "./pages/Products";
import { ProductDetail } from "./pages/ProductDetail";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { Login } from "./pages/Login";
import { Onboarding } from "./pages/Onboarding";
import { Orders } from "./pages/Orders";
import { Addresses } from "./pages/Addresses";
import { Profile } from "./pages/Profile";

export function App() {
  const navigate = useNavigate();
  const { notify } = useNotifications();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("onboardingPending")) {
      return;
    }
    const onboardingPending = params.get("onboardingPending") === "true";
    if (onboardingPending) {
      navigate("/onboarding", { replace: true });
    } else {
      notify({ type: "success", title: "Login realizado", message: "Bem-vindo(a) de volta à Sorofarma!" });
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return (
    <div>
      <Header />
      <main>
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
          <Route path="/perfil" element={<Profile />} />
        </Routes>
      </main>
      <Footer />
      <NotificationStack />
    </div>
  );
}
