// Enterprise OpenAPI 3.0 Documentation Definition
import express from 'express';

const router = express.Router();

const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Enterprise AI Resource Allocation API",
    version: "2.0.0-enterprise",
    description: "Production-grade Workforce Planning & AI Recommendation API"
  },
  servers: [
    { url: "http://localhost:5000", description: "Backend API Gateway" },
    { url: "http://localhost:8000", description: "FastAPI ML Service" }
  ],
  paths: {
    "/api/v1/auth/login": {
      post: {
        summary: "User authentication & JWT issuance",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } } } } }
        },
        responses: {
          200: { description: "Successful login with access and refresh tokens" },
          401: { description: "AUTH_FAILED" }
        }
      }
    },
    "/api/v1/dashboard/workload": {
      get: {
        summary: "Retrieve multi-tenant workload snapshots and capacity metrics",
        responses: {
          200: { description: "Workload data envelope" }
        }
      }
    }
  }
};

router.get('/spec', (req, res) => {
  res.json(openApiSpec);
});

// Simple HTML wrapper rendering SwaggerUI via unpkg CDN
router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Enterprise Swagger UI</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/api/docs/spec',
            dom_id: '#swagger-ui',
          });
        };
      </script>
    </body>
    </html>
  `);
});

export default router;
