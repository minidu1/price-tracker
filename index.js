import "dotenv/config";
import express from "express";
import cron from "node-cron";
import userRouter from "./routes/user.js";
import productRouter from "./routes/products.js";
import { checkAllProducts } from "./services/priceChecker.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json()); // lets Express understand JSON sent in requests

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(cookieParser());
const PORT = process.env.PORT || 3000;

// cron.schedule("*/8 * * * *", async () => {
//   console.log("code runing")
//   await checkAllProducts();
// });
let isRunning = false;

app.post("/internal/run-check", (req, res) => {
  const secret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: "Authentication failed" });
  }
  if (isRunning) {
    return res.status(409).json({ message: "Already running" });
  }

  isRunning = true;
  res.status(202).json({ message: "Check started" });

  checkAllProducts()
    .catch((error) => console.error("Scheduled check failed:", error))
    .finally(() => {
      isRunning = false;
    });
});

// endpoint calls
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/users", userRouter);
app.use("/products", productRouter);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
