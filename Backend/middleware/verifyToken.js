import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {

  const token =
    req.cookies?.token ||
    (req.headers.authorization?.startsWith("Bearer ") &&
      req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = payload.userId;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};