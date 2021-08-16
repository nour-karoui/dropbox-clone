FROM node:latest

WORKDIR '/app'

COPY package.json .
RUN npm i

COPY . .
RUN npm run build

FROM nginx
COPY --from=0 /app/build /usr/share/nginx/html
