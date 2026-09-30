import { prisma } from "../prisma.js";
import { scrapePrice } from "./scraper.js";
import { updateNotifiedInDatabase, sendNotification } from "./notifier.js";

export async function checkAllProducts() {
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

async function savePriceHistory(productId, price) {
  await prisma.priceHistory.create({
    data: {
      productId,
      date: new Date(),
      price,
    },
  });
}
