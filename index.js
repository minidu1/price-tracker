import "dotenv/config";
import express from "express";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import puppeteer from "puppeteer";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const app = express();

const PORT = 3000;

async function scrapePrice(url) {
  const browser = await puppeteer.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".pdp-price_type_normal", { timeout: 10000 });
  const priceText = await page.$eval(
    ".pdp-price_type_normal",
    (el) => el.textContent,
  );
  await browser.close; //close the browser
  const numericPrice = parseFloat(priceText.match(/\d+(?:\.\d+)?/)?.[0]);
  return numericPrice;
}

async function checkAllProducts() {
  const productLinks = await prisma.product.findMany({
    select: {
      link: true,
    },
  });

  for (const product of productLinks) {
    try {
      const price = await scrapePrice(product.link);
      console.log(price);
    } catch (err) {
      console.log("Failed to fetch the price:", err.message);
    }
  }

  return;
}
const products = await checkAllProducts();

// endpoint calls
app.use(express.json()); // lets Express understand JSON sent in requests

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/products", async (req, res) => {
  const { uid, link, name, target } = req.body;

  const newProduct = await prisma.trackedProduct.create({
    data: {
      uid,
      target,
      notified: false,
      product: {
        connectOrCreate: {
          where: { link },
          create: { link, name },
        },
      },
    },
  });

  res.status(201).json(newProduct);
});

app.get("/tracked-products", async (req, res) => {
  const products = await prisma.trackedProduct.findMany({
    include: {
      product: true,
    },
  });
  res.status(200).json(products);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
