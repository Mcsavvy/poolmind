import express, { Application, Request, Response } from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./docs/swagger";
import mainRouter from "./routes";
import { config } from "./config";
import cors from "cors";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Determine frontend build path based on environment
const frontendBuildPath = config.server.isDevelopment
  ? path.join(__dirname, "../src/frontend/dist") // Development: relative to src/
  : path.join(__dirname, "./public"); // Production: frontend copied to dist/public

// use cors only in development
app.use(
  cors({
    origin: config.server.isDevelopment ? "http://localhost:5173" : undefined,
    credentials: true,
  }),
);

// Health check endpoint (before API routes)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("OK");
});

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// OpenAPI JSON schema endpoint for download
app.get("/api-docs.json", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="poolmind-api-schema.json"',
  );
  res.send(swaggerSpec);
});

// Serve static files from frontend build
app.use(express.static(frontendBuildPath));

// API routes
app.use(config.api.baseUrl, mainRouter);

// Catch-all handler for client-side routing (must be last)
app.get("/*splat", (req: Request, res: Response): void => {
  // Don't serve index.html for API routes, docs, or health check
  if (
    req.path.startsWith(config.api.baseUrl) ||
    req.path.startsWith("/api-docs") ||
    req.path.startsWith("/health")
  ) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // For all other routes, serve the React app
  res.sendFile(path.join(frontendBuildPath, "index.html"), (err?: Error) => {
    if (err) {
      console.error("Error serving frontend:", err);
      res.status(500).json({ error: "Unable to serve frontend" });
    }
  });
});

export default app;
