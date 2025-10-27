/**
 * gRPC Constants
 *
 * Configuration values for gRPC communication
 */

/**
 * Default gRPC server addresses (fallback values)
 */
export const DEFAULT_QUERY_SERVERS = ['192.168.0.87', '192.168.0.2'];
export const DEFAULT_LOOKUP_SERVER = '127.0.0.1';

/**
 * gRPC ports
 */
export const GRPC_QUERY_SERVER_PORT = 50051;
export const GRPC_LOOKUP_PORT = 50054;

/**
 * gRPC message size limits (256MB)
 */
export const GRPC_MAX_MESSAGE_SIZE = 256 * 1024 * 1024;

/**
 * gRPC connection options
 */
export const GRPC_CONNECTION_OPTIONS = {
	maxReceiveMessageLength: GRPC_MAX_MESSAGE_SIZE,
	maxSendMessageLength: GRPC_MAX_MESSAGE_SIZE,
} as const;

/**
 * SSL Certificate for gRPC secure connections
 * TODO: Move to external configuration file for production
 */
export const GRPC_SSL_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIEDjCCAvagAwIBAgIUGCEDu7QmO7Sn1B23BNlfjf9tuRUwDQYJKoZIhvcNAQEL
BQAwczELMAkGA1UEBhMCVVMxDjAMBgNVBAgMBVN0YXRlMQ0wCwYDVQQHDARDaXR5
MRUwEwYDVQQKDAxPcmdhbml6YXRpb24xFjAUBgNVBAsMDUlUIERlcGFydG1lbnQx
FjAUBgNVBAMMDTk1LjIxNi4xODkuNjAwHhcNMjUwODE5MTMzODEwWhcNMjYwODE5
MTMzODEwWjBzMQswCQYDVQQGEwJVUzEOMAwGA1UECAwFU3RhdGUxDTALBgNVBAcM
BENpdHkxFTATBgNVBAoMDE9yZ2FuaXphdGlvbjEWMBQGA1UECwwNSVQgRGVwYXJ0
bWVudDEWMBQGA1UEAwwNOTUuMjE2LjE4OS42MDCCASIwDQYJKoZIhvcNAQEBBQAD
ggEPADCCAQoCggEBANVisy9f1amkVSc9tRgxOAhmbYo/T4x3FjEphHqvnY5feCH1
GkTl/LBMDwwHYMI1Jt7fqxR7R1X/FbH8ve37ovRjJsgh6zG61d/xdtz3xqmmUNuT
x+DU66KAP/6NjT1Xal7t1HfjKDqJ1cF9VfBpd8SlK1cSTlmM/w3Ayoka9+zksxeQ
zbz3/34rnCvTbUKJcGfBlh1b3GfJeoqHQBqtshU2AES90/INjtzDtUHY7FMR/6Mm
VsO1nhhgZTu/+JUvCE9WBxl5Teya9srHzt4uBmUPCgZbwigKnsUGwkv1Eniwo+MY
zDNsyVmWRAEcb3Uo+/YHx5pNfrlEYSZ+NdJW04UCAwEAAaOBmTCBljAOBgNVHQ8B
Af8EBAMCA6gwIAYDVR0lAQH/BBYwFAYIKwYBBQUHAwEGCCsGAQUFBwMCMDUGA1Ud
EQEB/wQrMCmHBF/YvTyCDTk1LjIxNi4xODkuNjCCCWxvY2FsaG9zdIIHKi5sb2Nh
bDAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBR94NkZpzh55M17RTu4z+2je0XwITAN
BgkqhkiG9w0BAQsFAAOCAQEAqv/stnFVsNUlnba7RzsY743Nox/l24/aa+mbclyj
fwdlu5aIBT8PkROJg+Qp6TvexD/tiRT5zJFKO4yT/p5lDQb9bktKLzpaRoFfijV0
7cN5IyMMPcCZ+Oqv4WPSzOIsS3TRXXsA535I2wcota2JCsXTaEaivZ49eLAOT4X/
4yw5hdYCLCZoFKyoCi9fVRVpM0ktN3VtQE4+VfR7CVK6sSIW7DryxEd7hnjMdroo
1X6emed5cVU4ddys45QNX3yMo29jmFglC+fZryQulX1cqa3s1SR+tJWWxX0o+Drn
a3mUx29+bYa8bEo5+ePaewxP4YPCyKAHxjIMRS5SyMSIUw==
-----END CERTIFICATE-----`;

/**
 * SSL target name override for SNI prevention
 */
export const SSL_TARGET_OVERRIDE = 'localhost';

/**
 * Default authority for HTTP/2
 */
export const DEFAULT_AUTHORITY = '95.216.189.60';
