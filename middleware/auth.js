import "dotenv/config";
import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
  const token = req.cookies.token; //read token from cookie
  if (!token) {
    return res.status(401).json({ message: "Authentication token is missing" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
    if (error) {
      return res
        .status(403)
        .json({ message: "Invalid or expired authentication token" });
    }

    req.user = user; // add user obj to req.user
    next();
  });
}
