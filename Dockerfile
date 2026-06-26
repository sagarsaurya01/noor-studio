FROM node:22-alpine

WORKDIR /app

# Install yt-dlp, ffmpeg, python3
RUN apk add --no-cache ffmpeg python3 curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
