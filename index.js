import "dotenv/config";
import express from "express";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const app = express();

const PORT = 3000;


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
      product : {
        connectOrCreate: {
          where: {link},
          create: {link, name}
        }
      }
    }
  })

  res.status(201).json(newProduct);
});

app.get("/tracked-products", async(req, res) => {
  
  const products = await prisma.trackedProduct.findMany(
    {include:{
      product: true
    } }
  )
  res.status(200).json(products)
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
