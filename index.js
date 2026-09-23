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
    executablePath: process.env.CHROME_PATH
    });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".pdp-price_type_normal", { timeout: 10000 });
  const priceText = await page.$eval(
    ".pdp-price_type_normal",
    (el) => el.textContent,
  );
  await browser.close(); //close the browser
  const numericPrice = parseFloat(priceText.match(/\d+(?:\.\d+)?/)?.[0]);
  return numericPrice;
}

async function savePriceHistory(productId, price) {
  await prisma.priceHistory.create({
    data: {
      productId,
      date: new Date(),
      price,
    },
  });
}

async function comparePriceWithTarget(productId, price) {
  const targetPrices = await prisma.trackedProduct.findMany({
    where: { productId, notified: false },
    select: { target: true, uid: true },
  });

  for (const targetPrice of targetPrices) {
    if (price <= targetPrice.target){
      console.log("price is",price, "target is", targetPrice.target);
      
    }
    else{
      console.log(`price is ${price} but target is ${targetPrice.target}`);
      
    }
  }
}

async function checkAllProducts() {
  const products = await prisma.product.findMany({
    select: {
      link: true,
      id: true,
    },
  });

  for (const product of products) {
    try {
      const price = await scrapePrice(product.link);
      // await savePriceHistory(product.id, price);
      await comparePriceWithTarget(product.id, price);
    } catch (err) {
      console.log(`Failed processing ${product.link}:`, err.message);
    }
  }

  return;
}
await checkAllProducts();

// endpoint calls
app.use(express.json()); // lets Express understand JSON sent in requests

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/products", async (req, res) => {
  // *** need to validate parsing data *** //
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
