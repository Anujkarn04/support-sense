import { Navigate, Route, Routes } from "react-router-dom";
import { homeFor, useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/common/Layout.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import { Spinner } from "./components/common/states.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import CustomerChat from "./pages/CustomerChat.jsx";
import AgentConsole from "./pages/AgentConsole.jsx";
import ConversationDetails from "./pages/ConversationDetails.jsx";
import Conversations from "./pages/Conversations.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Alerts from "./pages/Alerts.jsx";
import Outcomes from "./pages/Outcomes.jsx";
import ThresholdSimulator from "./pages/ThresholdSimulator.jsx";
import Models from "./pages/Models.jsx";
import Settings from "./pages/Settings.jsx";
import NotFound from "./pages/NotFound.jsx";

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Signing you in" />;
  return <Navigate to={user ? homeFor(user.role) : "/login"} replace />;
}

const SUP = ["supervisor", "admin"];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route element={<ProtectedRoute roles={["customer"]} />}>
            <Route path="/chat" element={<CustomerChat />} />
          </Route>
          <Route element={<ProtectedRoute roles={["agent"]} />}>
            <Route path="/agent" element={<AgentConsole />} />
          </Route>
          <Route element={<ProtectedRoute roles={["agent", ...SUP]} />}>
            <Route path="/conversations/:id" element={<ConversationDetails />} />
          </Route>
          <Route element={<ProtectedRoute roles={SUP} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/outcomes" element={<Outcomes />} />
            <Route path="/analytics/thresholds" element={<ThresholdSimulator />} />
            <Route path="/models" element={<Models />} />
          </Route>
          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
