FROM node:22-alpine

WORKDIR /app

# Solo copiamos los manifests primero para aprovechar la cache de capas.
COPY package.json package-lock.json ./
RUN npm install

# El resto del código se monta por volumen en desarrollo.
COPY . .

EXPOSE 5173

# --host expone Vite en 0.0.0.0 para que sea accesible desde el host.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
