# FlashKart

FlashKart is a flash-sale shopping demo where customers can reserve a product for a limited time and complete checkout before the reservation expires. It uses React and Vite for the frontend, with a TypeScript and Express API backed by PostgreSQL and Redis.

## Setup

1. Start Docker Desktop, then run the database and cache:
   ```sh
   docker compose up -d
   ```
2. Install backend dependencies and seed the demo data:
   ```sh
   cd backend
   npm install
   npm run seed
   ```
3. Start the backend:
   ```sh
   npm start
   ```
4. In a second terminal, install and start the frontend:
   ```sh
   cd frontend
   npm install
   npm run dev
   ```
   Open the local URL printed by Vite, usually `http://localhost:5173`.
