# RideX — Full Production Ride-Hailing Application Platform

RideX is a full-stack, production-grade ride-hailing platform built with original branding, responsive design, modular backend micro-architectures, real-time WebSockets, GIS routing, AI-based dispatch ranking & fraud detection, and an admin management suite.

---

## 🏗️ Architecture Overview

RideX is organized as a production monorepo containing 5 distinct micro-services and web client suites:

- **`apps/backend`**: Express + TypeScript + Socket.IO real-time server with PostGIS relational store & Redis Geo search.
- **`apps/ai-service`**: Python FastAPI microservice providing AI Driver Ranking Recommendation, GPS Spoofing Fraud Detection, and AI Support Assistant.
- **`apps/customer-app`**: Rider Mobile Web application featuring interactive map booking, dynamic fare estimation, live driver location tracking, OTP start security, real-time chat, SOS safety desk alert, and wallet.
- **`apps/driver-app`**: Driver Partner Web application with Online/Offline duty toggle, 10-second request dispatch prompt, turn-by-turn simulation, OTP trip verification, GPS broadcast, earnings dashboard, and KYC document manager.
- **`apps/admin-dashboard`**: Control Center featuring live fleet radar, driver KYC approval desk, pricing & surge control, SOS emergency desk, AI fraud telemetry, and system audit logs.

---

## ⚡ Quick Start & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Backend API & WebSocket Server
```bash
npm run dev:backend
# Starts server on http://localhost:4000
```

### 3. Launch Customer Mobile App
```bash
npm run dev:customer
# Opens Customer App on http://localhost:3000
```

### 4. Launch Driver Partner App
```bash
npm run dev:driver
# Opens Driver App on http://localhost:3001
```

### 5. Launch Admin Control Dashboard
```bash
npm run dev:admin
# Opens Admin Dashboard on http://localhost:3002
```

---

## 🐳 Docker Deployment
```bash
docker-compose up --build -d
```

---

## 🧪 Testing
```bash
npm run test:backend
```
