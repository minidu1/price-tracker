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
  await page.waitForSelector('.pdp-price_type_normal', { timeout: 10000 })
  const priceText = await page.$eval(
    ".pdp-price_type_normal",
    (el) => el.textContent,
  );
  await browser.close; //close the browser
  return priceText;
}

const url =
  "https://www.daraz.lk/products/inpods-pro-air-13-pods-i127743453-s1044998823.html?scm=1007.51610.379274.0&pvid=d22d4f68-daaf-4cb6-9860-6962d17d7860&search=flashsale&spm=a2a0e.tm80335410.FlashSale.d_127743453";
const price = await scrapePrice(url);
console.log(price);

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
