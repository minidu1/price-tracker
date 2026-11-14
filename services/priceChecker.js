import { prisma } from "../prismaClient.js";
import { launchBrowser, openNewWebPage, scrapePrice } from "./scraper.js";
import { updateNotifiedInDatabase, sendNotification } from "./notifier.js";

export async function checkAllProducts() {
  //select the link and id of the product to check current price
  const products = await prisma.product.findMany({
    select: {
      link: true,
      id: true,
    },
  });

  const browser = await launchBrowser();
  try {
    for (const product of products) {
      let page;
      try {
        page = await openNewWebPage(browser, product.link);
        const price = await scrapePrice(page);
        await savePriceHistory(product.id, price);
        await comparePriceWithTarget(product.id, price);
        await page.close();
      } catch (error) {
        console.error(`Failed processing ${product.link}:`, error.cause?.message);
      } finally {
        if (page && !page.isClosed()) {
          await page.close().catch(() => {});
        }
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  return true;
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
      const emailSend = await sendNotification(
        email,
        target.product.name,
        price,
        target.target,
      );
      await updateNotifiedInDatabase(emailSend, target.id);
    }
  }
}

export async function savePriceHistory(productId, price) {
  await prisma.priceHistory.create({
    data: {
      productId,
      date: new Date(),
      price,
    },
  });
}
