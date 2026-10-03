import "dotenv/config";
import { Router } from "express";
import { prisma } from "../prismaClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { checkSchema, validationResult, matchedData } from "express-validator";
import {
  createUserValidation,
  loginValidation,
} from "../validation/schemas.js";

const router = Router();

router.post("/", checkSchema(createUserValidation), async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json(result);
  }

  try {
    const data = matchedData(req);
    console.log(data);
    const { name, email, password } = data;
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
    return res.status(201).json({ message: "Account created successfuly" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "signup failed" });
  }
});

router.post("/login", checkSchema(loginValidation), async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json(result);
  }

  const data = matchedData(req);

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

export default router;
