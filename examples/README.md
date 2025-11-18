# Examples

This directory contains example applications demonstrating how to use the `@advcomm/tenant_replication_postgres` library.

## 📁 Available Examples

### `example-app/`

A complete, production-ready example application that demonstrates:

- ✅ Library initialization and configuration
- ✅ Using library's built-in sync routes
- ✅ Authentication middleware setup
- ✅ CORS configuration for Flutter apps
- ✅ Error handling
- ✅ Health check endpoints
- ✅ Test endpoints for demonstration
- ✅ Development vs Production mode handling

**See [example-app/README.md](./example-app/README.md) for detailed documentation.**

## 🚀 Quick Start

1. **Navigate to example:**
   ```bash
   cd examples/example-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   
   **Note:** The example app uses the local library package (`file:../..`), so all changes to the library source code are immediately reflected without needing to rebuild or reinstall. Perfect for development!

3. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

4. **Run the example:**
   ```bash
   npm run dev
   ```

## 📚 Purpose

These examples serve as:

- **Reference Implementation** - Shows best practices
- **Starting Point** - Copy to start your own application
- **Documentation** - Real, working code
- **Testing Ground** - Test library features

## 🤝 Contributing

Feel free to add more examples or improve existing ones!

