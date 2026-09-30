import "dotenv/config";
import express from "express";
import cron from "node-cron";
import userRouter from "./routes/user.js";
import productRouter from "./routes/products.js";
import { checkAllProducts } from "./services/priceChecker.js";

const app = express();
app.use(express.json()); // lets Express understand JSON sent in requests
const PORT = 3000;

// cron.schedule("0 9 * * *", async () => {
//   await checkAllProducts();
// });

cron.schedule("* * * * *", async () => {
  console.log("cron ran");

  checkAllProducts();
});

// await checkAllProducts();

// endpoint calls
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/users", userRouter);
app.use("/products", productRouter);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
