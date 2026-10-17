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
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.post("/", checkSchema(createUserValidation), async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ message: result.array()[0].msg });
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
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }
    return res.status(500).json({
      message: "signup failed",
    });
  }
});

router.post("/login", checkSchema(loginValidation), async (req, res) => {
  const result = validationResult(req); // catch validation errors from req body
  if (!result.isEmpty()) {
    return res.status(400).json({ message: result.array()[0].msg });
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

        res.cookie("token", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production", // should have to make this true brfore deploy to use https only
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // make new user property only include name and email to render dashboard
        return res.status(200).json({
          message: "Login success",
          user: {
            name: user.name,
            email: user.email,
          },
        });
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

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // should have to make this true brfore deploy to use https only
  });
  return res.status(200).json({
    message: "Logged out successfully",
  });
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId, //get userId from cookie
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    if (!user) {
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production", // should have to make this true brfore deploy to use https only
      });
      return res.status(401).json({ message: "Not authenticated" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to get user",
    });
  }
});

export default router;
