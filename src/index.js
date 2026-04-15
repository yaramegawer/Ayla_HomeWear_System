import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

import App from "./App";
import { OrderProvider } from "./contexts/OrderContext";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <OrderProvider>
      <App />
    </OrderProvider>
  </BrowserRouter>
);
