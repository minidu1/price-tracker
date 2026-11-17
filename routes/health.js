import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
  });
});

export default router;