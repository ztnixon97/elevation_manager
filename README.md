# Elevation Manager - Team Management System

A modern, secure, and feature-rich team management system built with Rust, Tauri, and React.

## 🚀 Overview

Elevation Manager is a comprehensive application for managing teams, products, task orders, and user permissions. It provides a robust authentication system, role-based access control, and a clean, intuitive interface for team collaboration.

## ✨ Features

- **Authentication**: Secure JWT-based authentication with role-based access control
- **Team Management**: Create, update, and delete teams
- **User Management**: Invite users, assign roles, and manage permissions
- **Product Management**: Track products and assign them to teams
- **Task Order Management**: Create and manage task orders
- **Role-Based Access Control**: Fine-grained permissions for different user roles
- **GraphQL API**: Modern API for frontend applications
- **WFS Support**: Web Feature Service for geospatial data
- **OpenAPI Documentation**: Comprehensive API documentation

## 🔧 Technology Stack

### Backend
- **Rust**: High-performance, memory-safe systems language
- **Axum**: Lightweight, modular web framework
- **SQLx**: Type-safe SQL toolkit for Rust
- **PostgreSQL**: Robust, open-source database
- **JSON Web Tokens**: Secure authentication mechanism
- **Moka Cache**: High-performance caching
- **Async-GraphQL**: GraphQL server implementation
- **OpenAPI/Swagger**: API documentation

### Frontend
- **Tauri**: Lightweight, secure desktop application framework
- **React**: Component-based UI library
- **Material UI**: Modern component library
- **React Query**: Data fetching and state management
- **OpenLayers**: Interactive map component

## 🏗️ Architecture

The application follows a microservice-like architecture with clear separation of concerns:

- **API Layer**: Handles HTTP requests and authentication
- **Service Layer**: Implements business logic
- **Database Layer**: Manages data persistence
- **Authentication Layer**: Handles user authentication and authorization
- **Middleware**: Implements cross-cutting concerns like logging and error handling

## 📋 Prerequisites

- Rust (latest stable)
- Node.js (v14+)
- PostgreSQL (v12+)
- Tauri CLI

## 🚀 Getting Started

1. **Clone the repository**

```bash
git clone https://github.com/your-username/elevation-manager.git
cd elevation-manager
```

2. **Set up environment variables**

Create a `.env` file in the root directory:

```
DATABASE_URL=postgres://username:password@localhost/elevation_db
JWT_SECRET=your-secret-key
AUTH_DISABLED=false
REVIEW_STORAGE_PATH=C:\reviews\content
REVIEW_IMAGE_STORAGE_PATH=C:\reviews\images
```

3. **Set up the database**

```bash
# Create the database
createdb elevation_db

# Run migrations
cargo install sqlx-cli
sqlx migrate run
```

4. **Build and run the backend**

```bash
cargo run
```

5. **Build and run the frontend**

```bash
cd src-tauri
npm install
npm run tauri dev
```

## 🔒 Authentication and Authorization

The application uses a robust JWT-based authentication system with role-based access control:

- **Admin**: Full access to all features
- **Manager**: Can manage teams and users
- **Team Lead**: Can manage their team members and products
- **Member**: Can view and edit assigned products
- **Viewer**: Can view assigned products

## 📚 Documentation

API documentation is available at `/swagger` and `/rapidoc` endpoints when the server is running.

## 🧪 Testing

Run tests with:

```bash
cargo test
```

