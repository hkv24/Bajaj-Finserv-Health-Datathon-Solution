FROM node:18-alpine

RUN apk add --no-cache graphicsmagick ghostscript

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
