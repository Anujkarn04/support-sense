import { useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import ConversationWorkspace from "../components/chat/ConversationWorkspace.jsx";
import { MobileAccountBar } from "../components/common/Layout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ConversationDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const back = user.role === "agent" ? "/agent" : "/conversations";
  return (
    <>
      <MobileAccountBar />
      <div className="px-5 pt-5 md:px-8">
        <Link to={back} className="inline-flex items-center gap-1.5 text-sm underline underline-offset-2">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to conversations
        </Link>
      </div>
      <div className="mx-5 my-4 overflow-hidden rounded-panel border border-line md:mx-8" style={{ background: "var(--surface)" }}>
        <ConversationWorkspace id={Number(id)} />
      </div>
    </>
  );
}
