# ZeroGate 👁️⛓️  
## The Visual Web3 Marketplace

ZeroGate is a next-generation decentralized marketplace that bridges the gap between physical items and digital ownership. It features a neural visual search engine that allows users to discover assets simply by uploading a photo. All transactions are secured using on-chain escrow smart contracts, while sensitive shipping telemetry is kept private through a secure Web2.5 off-chain database.

---

## ✨ Core Features

### 🧠 Neural Visual Search
Snap a photo or upload an image to instantly query the vector database and find exact or visually similar on-chain assets.

### 🔐 Trustless Escrow
Smart contracts hold cryptocurrency payments (ETH) securely until the buyer physically confirms receipt of the item, protecting both parties.

### 🛡️ Web2.5 Privacy Architecture
Financial transactions and ownership are verified publicly on the blockchain. Physical shipping destinations are encrypted and stored off-chain, visible only to the seller.

### 🚫 Anti-Wash Trading
Protocol-level and UI-level safeguards prevent operators from acquiring their own assets to artificially inflate marketplace volume.

---

## 🛠️ Tech Stack

ZeroGate uses a 4-pillar microservice architecture:

### 1️⃣ Frontend
- Next.js (App Router)
- React
- Tailwind CSS
- Lucide Icons

### 2️⃣ Web3 Integration
- Viem
- MetaMask
- Solidity
- Foundry (Anvil local network)

### 3️⃣ Backend Orchestrator
- Node.js
- Express
- Prisma ORM
- PostgreSQL

### 4️⃣ AI Microservice
- Python
- FastAPI
- pgvector (for visual similarity matching)

---

## 🏗️ Architecture Overview

ZeroGate operates using four independent but connected layers:

1. Frontend Client (Next.js)  
2. Smart Contract Layer (Solidity + Anvil)  
3. Backend Orchestrator (Node.js + Express + Prisma)  
4. AI Visual Search Engine (FastAPI + pgvector)  

Each layer is modular and can scale independently.

---

## 🚀 Quick Start Guide

### ✅ Prerequisites

Ensure the following are installed:

- Node.js (v18+)
- Python (v3.9+)
- PostgreSQL (with `pgvector` extension enabled)
- Foundry (for Anvil local blockchain)
- MetaMask browser extension

---

## 1️⃣ Start the Blockchain Network

Open a terminal and start your local Anvil node:

```bash
anvil
```

Deploy your `ZeroGateMarketplace.sol` contract and update the `MARKETPLACE_ADDRESS` constant in your frontend configuration.

---

## 2️⃣ Initialize the Database & Backend Orchestrator

Open a second terminal and run:

```bash
cd server
npx prisma generate
npx prisma db push
npm run dev
```

---

## 3️⃣ Start the AI Microservice

Open a third terminal:

```bash
cd ai-service
source venv/bin/activate     # On Windows: venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

---

## 4️⃣ Launch the Frontend

Open a fourth terminal and start the Next.js app:

```bash
npm run dev
```

Navigate to:

```
http://localhost:3000
```

to access the ZeroGate operator interface.

---

## 🔒 Security & Privacy

### 🚫 No PII On-Chain
Physical shipping addresses are never broadcasted to the blockchain.

### 🔑 Strict Access Control
Only the buyer who initiated the escrow can release the funds via cryptographic signature.

---

## 📌 Summary

ZeroGate combines:
- AI-powered visual discovery  
- Trustless Web3 escrow payments  
- Hybrid Web2.5 privacy infrastructure  
- Modular microservice scalability  

It is designed to merge decentralized finance, AI, and real-world commerce into one secure marketplace platform.
