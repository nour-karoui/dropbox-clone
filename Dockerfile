FROM node:14.15.0

WORKDIR '/app'

COPY package.json .
RUN npm i

COPY . ./
RUN npm run build

FROM nginx
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
