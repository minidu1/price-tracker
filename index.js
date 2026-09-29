import "dotenv/config";
import express from "express";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import puppeteer from "puppeteer";
import cron from "node-cron";
import { Resend } from "resend";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, checkSchema, matchedData, validationResult } from "express-validator";
import { createUserValidation } from "./validationSchemas.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
const app = express();
const PORT = 3000;

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendNotification(email, productName, price, target) {
  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev", // Resend's default test sender, works without domain verification
    to: email,
    subject: `Price drop: ${productName}`,
    text: `${productName} dropped to ${price}, at or below your target of ${target}!`,
  });

  if (error) {
    console.log(`Failed to send email to ${email}:`, error.message);
    return false;
  }
  return true;
}

async function scrapePrice(url) {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
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

async function updateNotifiedInDatabase(emailSend, targetId) {
  if (emailSend) {
    await prisma.trackedProduct.update({
      where: { id: targetId },
      data: { notified: true },
    });
    console.log("notified");
    return true;
  } else {
    console.log("not sended");
    return false;
  }
}

async function comparePriceWithTarget(productId, price) {
  const targets = await prisma.trackedProduct.findMany({
    where: { productId, notified: false },
    select: {
      target: true,
      id: true,
      product: {
        select: { name: true },
      },
      user: {
        select: { email: true },
      },
    },
  });

  for (const target of targets) {
    if (price <= target.target) {
      const email = target.user.email;
      console.log(email);
      const emailSend = await sendNotification(
        email,
        target.product.name,
        price,
        target.target,
      );
      await updateNotifiedInDatabase(emailSend, target.id);
    } else {
      console.log(`price is ${price} but target is ${target.target}`);
    }
  }
}

async function checkAllProducts() {
  //select the link and id of the product to check current price
  const products = await prisma.product.findMany({
    select: {
      link: true,
      id: true,
    },
  });

  for (const product of products) {
    try {
      // const price = 999;
      const price = await scrapePrice(product.link);
      await savePriceHistory(product.id, price);
      await comparePriceWithTarget(product.id, price);
    } catch (err) {
      console.log(`Failed processing ${product.link}:`, err.message);
    }
  }

  return;
}

// cron.schedule("0 9 * * *", async () => {
//   await checkAllProducts();
// });

// cron.schedule("* * * * *", async () => {
//   console.log("cron ran");

//   checkAllProducts();
// });

// await checkAllProducts();

// endpoint calls
app.use(express.json()); // lets Express understand JSON sent in requests

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/users",checkSchema(createUserValidation), async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json(result)
  }

  try {
    const data = matchedData(req)
    console.log(data)
    const { name, email, password } = data;
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
    return res.status(201).json(newUser);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "signup failed" });
  }
});

// app.post("/users/login", async (req, res) => {
//   const password = req.body.password;
//   const user = await prisma.user.findUnique({
//     where: {
//       email: req.body.email,
//     },
//   });
//   if (!user) {
//     return res.status(401).json({ message: `Invalid email or password` });
//   }
//   try {
//     const isValid = await bcrypt.compare(password, user.passwordHash);
//     if (isValid) {
//       const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
//         expiresIn: "7d",
//       });
//       return res.status(200).json({ message: "Login success", token });
//     } else {
//       return res.status(401).json({ message: `Invalid email or password` });
//     }
//   } catch {
//     return res.status(401).json({ message: `Invalid email or password` });
//   }
// });

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Authentication token is missing" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
    if (error) {
      return res
        .status(403)
        .json({ message: "Invalid or expired authentication toke" });
    }

    req.user = user;
    next();
  });
}

app.post("/products", authenticateToken, async (req, res) => {
  const { link, name, target } = req.body;
  const uid = req.user.userId;

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

app.get("/tracked-products", authenticateToken, async (req, res) => {
  const products = await prisma.trackedProduct.findMany({
    where: {
      uid: req.user.userId,
    },
    include: {
      product: true,
    },
  });
  res.status(200).json(products);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
