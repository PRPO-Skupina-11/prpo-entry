import { Routes, Route } from "react-router-dom";
import ChatPage from "./ChatPage";
import UsagePage from "./UsagePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/usage" element={<UsagePage />} />
      <Route path="/chat/:chatId" element={<App />} />
    </Routes>
  );
}
