# Build Scripts

Utility scripts for development and build processes.

## `generate-proto.js`

Automatically generates TypeScript and JavaScript code from Protocol Buffer definitions.

### Features

- 🔍 **Auto-discovery** - Automatically finds all `.proto` files in the `proto/` directory
- 🧹 **Clean builds** - Removes old generated files before creating new ones
- 📦 **Batch processing** - Processes all proto files in one command
- 🎨 **Colored output** - Clear visual feedback with success/error messages
- ✅ **Error handling** - Reports failures and exits with proper exit codes

### Usage

```bash
# Run directly
npm run proto:generate

# Or use node
node scripts/generate-proto.js
```

### Configuration

The script uses these default paths:
- **Input**: `proto/*.proto` - All proto files in the proto directory
- **Output**: `src/generated/` - Generated TypeScript and JavaScript files

### Generated Files

For each `.proto` file, the script generates:
- `*.js` - JavaScript implementation (CommonJS)
- `*_pb.js` - Protocol Buffer messages
- `*_grpc_pb.js` - gRPC service definitions
- `*.d.ts` - TypeScript type definitions
- `*_pb.d.ts` - TypeScript types for messages
- `*_grpc_pb.d.ts` - TypeScript types for services

### Adding New Proto Files

Simply add your `.proto` files to the `proto/` directory. The script will automatically process them on the next run.

```bash
# Example: Add a new proto file
echo 'syntax = "proto3";' > proto/new-service.proto

# Generate code
npm run proto:generate
```

### Dependencies

This script requires:
- `grpc-tools` - gRPC code generation tools
- `grpc_tools_node_protoc_ts` - TypeScript plugin for protoc

These are installed automatically with `npm install`.

