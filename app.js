import express from "express";
import { PORT } from "./config/env.js"; 
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.routes.js";
import subscriptionRouter from "./routes/subscription.route.js";
import connectToDatabase from "./database/mongodb.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import cookieParser from "cookie-parser";
import arcjetMiddleware from "./middlewares/arcjet.middleware.js";
import workflowRouter from "./routes/workflow.routes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use (arcjetMiddleware);

//makakapunta ka sa sign-up  through /api/v1/users/auth/sign-up
app.use("/api/v1/users/auth", authRouter);

app.use("/api/v1/users", userRouter);

app.use("/api/v1/subscriptions", subscriptionRouter);

app.use("/api/v1/users/workflow", workflowRouter);

app.use(errorMiddleware);

app.get("/", (_, res) => {
  res.send("Welcome Pashnea!");
});

app.listen(PORT, async() => {
  console.log(`Server is running on http://localhost:${PORT}`);

await connectToDatabase()
});
