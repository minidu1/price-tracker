import { Router } from "express";
import { checkSchema, validationResult, matchedData } from "express-validator";
import { authenticateToken } from "../middleware/auth.js";
import { addNewProductValidation } from "../validation/schemas.js";
import { prisma } from "../prismaClient.js";
import { createOrGetProduct } from "../repositories/productRepo.js";
import { addToTrackedProduct } from "../repositories/trackedProductRepo.js";
import { scrapePrice } from "../services/scraper.js";
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
      return res.status(400).json(result);
    }
    try {
      const data = matchedData(req);
      const { link, target } = data;
      const uid = req.user.userId;

      await createOrGetProduct(link);
      const product = await addToTrackedProduct(link, target, uid);

      //add the current price to db to show the price to user
      let price = null;
      try {
        price = await scrapePrice(link);
        await savePriceHistory(product.productId, price);
      } catch (error) {
        console.log(
          "Initial price scrape failed, will retry on next scheduled check:",
          error.message,
        );
      }
      return res.status(201).json({ message: "Product added", price: price });
    } catch (error) {
      console.log(error);
      if (error.message === "SCRAPE_FAILED") {
        return res.status(422).json({
          message: "Couldn't retrieve product details, please try again",
        });
      }
      return res.status(500).json({ message: "Failed to add product" });
    }
  },
);

router.get("/tracked-products", authenticateToken, async (req, res) => {
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

export default router;
