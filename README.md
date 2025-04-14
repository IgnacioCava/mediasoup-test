# Mediasoup test

A small app for testing [mediasoup](https://github.com/versatica/mediasoup)'s configuration and setup

# Installation 

1. Clone the repo
```bash
git clone https://github.com/IgnacioCava/mediasoup-test.git
```

2. Install dependencies
```bash
yarn init-deps
```

3. Create certificates

Mediasoup docs specify that the app must run in HTTPS, and that we need to add PEM certificates to the server config. I'm using [mkcert](https://github.com/FiloSottile/mkcert) for these.
    
```bash
cd server
mkcert -install
mkdir src/certs
mkcert -key-file ./src/certs/cert-key.pem -cert-file ./src/certs/cert.pem localhost
```

If you change the certs' name, make sure to reflect that in `server/src/server.ts`

4. Start the project
```bash
yarn dev
```
