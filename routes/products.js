import { Router } from "express";
import { checkSchema, validationResult, matchedData } from "express-validator";
import { authenticateToken } from "../middleware/auth.js";
import { addNewProductValidation } from "../validation/schemas.js";
import { prisma } from "../prismaClient.js";
import { ensureProductExist } from "../repositories/productRepo.js";
import { addToTrackedProduct } from "../repositories/trackedProductRepo.js";
import {
  launchBrowser,
  openNewWebPage,
  scrapePrice,
} from "../services/scraper.js";
import { savePriceHistory } from "../services/priceChecker.js";

// product ekak add unama eeka ewelma tracked price run wenn onede? user ta producr eka blaganna

const router = Router();

router.post(
  "/",
  authenticateToken,
  checkSchema(addNewProductValidation),
  async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({ message: result.array()[0].msg });
    }

    let browser;
    try {
      const data = matchedData(req);
      const { link, target } = data;
      const uid = req.user.userId;

      browser = await launchBrowser();
      const page = await openNewWebPage(browser, link);

      await ensureProductExist(link, page); // check if product already in db if not create that product
      const product = await addToTrackedProduct(link, target, uid);

      //add the current price to db to show the price to user
      let price = null;
      try {
        price = await scrapePrice(page);
        await savePriceHistory(product.productId, price);
      } catch (error) {
        console.log(
          "Initial price scrape failed, will retry on next scheduled check:",
          error.message,
        );
      }
      return res.status(201).json({ message: "Product added" });
    } catch (error) {
      console.log(error);
      if (error.message === "SCRAPE_FAILED") {
        return res.status(422).json({
          message: "Couldn't retrieve product details, please try again",
        });
      }
      return res.status(500).json({ message: "Failed to add product" });
    } finally {
      if (browser) await browser.close();
    }
  },
);

router.delete("/tracked-products/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deleteProduct = await prisma.trackedProduct.deleteMany({
      // find if the product id exist and it also belong to that user. so user cant delete other people's product by adding random ids
      where: {
        id,
        uid: req.user.userId,
      },
    });

    if (deleteProduct.count === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to delete product" });
  }
});

router.get("/tracked-products", authenticateToken, async (req, res) => {
  try {
    const products = await prisma.trackedProduct.findMany({
      where: {
        uid: req.user.userId,
      },
      select: {
        id: true,
        target: true,
        product: {
          select: {
            id: true,
            name: true,
            picture: true,
            priceHistory: {
              orderBy: {
                date: "desc",
              },
              take: 1,
              select: {
                price: true,
                date: true,
              },
            },
          },
        },
      },
    });
    return res.status(200).json(products);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
