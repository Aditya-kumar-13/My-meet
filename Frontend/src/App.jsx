import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./login";
import "./App.css";
import Register from "./Register";
import VideoChat from "./socket";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />}></Route>
        <Route path="/dashboard" element={<VideoChat />}></Route>
      </Routes>
    </Router>
  );
}

export default App;
