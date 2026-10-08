# Network Info CLI

## What It Is

Network Info CLI is an interactive terminal utility for local and public network diagnostics, port checks, Wi-Fi discovery, subnet scanning, and internet speed tests.

## Features

- Show local IPs, MAC address, gateway, DNS servers, hostname, and platform.
- Look up public IP, approximate location, and ISP information.
- Check selected TCP ports on a host.
- Scan a subnet for reachable devices and hostnames.
- List nearby Wi-Fi networks, signal strength, security, and channel where supported.
- Run download, upload, and ping measurements.

## Usage

```bash
npm install
npm start
```

Inside the prompt:

```text
info
local
public
ports example.com 80,443
scan 192.168.1.0/24
wifi
speedtest
```

After `npm link`, use `netinfo`. Run port and subnet scans only on systems and networks you own or are authorized to test.

## Technology

- Node.js 14 or newer and ES modules
- Networking APIs and operating-system network tools
- External public-IP/location and speed-test services where required

## Privacy and Safety

Local network details are read from the machine. `public`, `speedtest`, and some lookups can contact external services that may receive your IP address and request metadata. Results are not anonymous. Scans can be intrusive, so obtain authorization first.

## Distribution

Network Info CLI is distributed as a paid digital product through Gumroad. The product page may contain the current package, releases, and commercial terms.

## License

The source project declares the MIT License. See `package.json` for metadata. Gumroad purchase terms and the MIT License may apply to different parts of the distributed package.

## Status

Version 1.0.0. Results vary with operating system, network configuration, firewall rules, and external service availability.