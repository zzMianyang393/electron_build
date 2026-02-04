const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

function requestFor(url) {
  return url.startsWith("https:") ? https : http;
}

function downloadFile({ url, destinationPath, onProgress }) {
  return new Promise((resolve, reject) => {
    const client = requestFor(url);
    const request = client.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return resolve(downloadFile({ url: response.headers.location, destinationPath, onProgress }));
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Download failed with status ${response.statusCode}`));
      }

      const total = Number(response.headers["content-length"] || 0);
      let received = 0;

      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      const fileStream = fs.createWriteStream(destinationPath);

      response.on("data", (chunk) => {
        received += chunk.length;
        if (onProgress) {
          onProgress({ received, total });
        }
      });

      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close(() => resolve(destinationPath));
      });

      fileStream.on("error", reject);
    });

    request.on("error", reject);
  });
}

module.exports = {
  downloadFile,
};
