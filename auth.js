import "dotenv/config";
import express from "express";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {checkSchema, matchedData, validationResult } from "express-validator";
import { loginValidation } from "./validationSchemas.js";
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
const app = express();
app.use(express.json());
const PORT = 4000;

app.post("/users/login", checkSchema(loginValidation), async (req, res) => {
  // const email = req.body.email?.trim();
  // const password = req.body.password;

  // if (!email || !password) {
  //   return res.status(400).json({ message: "Email and password are required" });
  // }
  const result = validationResult(req)
  if (!result.isEmpty()){
    return res.status(400).json(result)
  }

  const data = matchedData(req)

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });
    if (!user) {
      return res.status(401).json({ message: `Invalid email or password` });
    }
    try {
      const isValid = await bcrypt.compare(data.password, user.passwordHash);
      if (isValid) {
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });
        return res.status(200).json({ message: "Login success", token });
      } else {
        return res.status(401).json({ message: `Invalid email or password` });
      }
    } catch {
      return res.status(401).json({ message: `Invalid email or password` });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Database error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
