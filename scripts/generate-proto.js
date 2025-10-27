#!/usr/bin/env node

/**
 * Protobuf Code Generator
 *
 * Automatically generates TypeScript and JavaScript code from all .proto files
 * in the proto/ directory using grpc-tools.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Configuration
const PROTO_DIR = path.join(__dirname, '../proto');
const OUTPUT_DIR = path.join(__dirname, '../src/generated');

// Colors for console output
const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	red: '\x1b[31m',
};

function log(message, color = colors.reset) {
	console.log(`${color}${message}${colors.reset}`);
}

function cleanOutputDirectory() {
	log('\n🧹 Cleaning output directory...', colors.yellow);

	if (fs.existsSync(OUTPUT_DIR)) {
		fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
		log('✓ Removed existing generated files', colors.green);
	}

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	log('✓ Created fresh output directory', colors.green);
}

function getProtoFiles() {
	if (!fs.existsSync(PROTO_DIR)) {
		log(`\n❌ Error: Proto directory not found at ${PROTO_DIR}`, colors.red);
		process.exit(1);
	}

	const files = fs
		.readdirSync(PROTO_DIR)
		.filter((file) => file.endsWith('.proto'))
		.map((file) => path.join(PROTO_DIR, file));

	if (files.length === 0) {
		log('\n⚠️  Warning: No .proto files found', colors.yellow);
		process.exit(0);
	}

	return files;
}

function generateProtoCode(protoFile) {
	const fileName = path.basename(protoFile, '.proto');
	log(`\n📦 Generating code for ${fileName}.proto...`, colors.blue);

	const command = `grpc_tools_node_protoc \
		--js_out=import_style=commonjs,binary:${OUTPUT_DIR} \
		--grpc_out=grpc_js:${OUTPUT_DIR} \
		--plugin=protoc-gen-grpc=\`which grpc_tools_node_protoc_plugin\` \
		--plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
		--ts_out=grpc_js:${OUTPUT_DIR} \
		--proto_path=${PROTO_DIR} \
		${protoFile}`;

	try {
		execSync(command, { stdio: 'inherit' });
		log(`✓ Successfully generated code for ${fileName}`, colors.green);
		return true;
	} catch (_error) {
		log(`✗ Failed to generate code for ${fileName}`, colors.red);
		return false;
	}
}

function main() {
	log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
	log('  Protobuf Code Generator', colors.blue);
	log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);

	// Clean output directory
	cleanOutputDirectory();

	// Get all proto files
	const protoFiles = getProtoFiles();
	log(`\n📋 Found ${protoFiles.length} proto file(s):`, colors.blue);
	protoFiles.forEach((file) => {
		log(`   • ${path.basename(file)}`, colors.blue);
	});

	// Generate code for each proto file
	let successCount = 0;
	let failureCount = 0;

	for (const protoFile of protoFiles) {
		if (generateProtoCode(protoFile)) {
			successCount++;
		} else {
			failureCount++;
		}
	}

	// Summary
	log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
	log('  Summary', colors.blue);
	log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
	log(`\n✓ Success: ${successCount} file(s)`, colors.green);

	if (failureCount > 0) {
		log(`✗ Failed: ${failureCount} file(s)`, colors.red);
		process.exit(1);
	}

	log(`\n📁 Generated files saved to: ${OUTPUT_DIR}`, colors.blue);
	log('\n✨ Done!\n', colors.green);
}

// Run the script
main();
