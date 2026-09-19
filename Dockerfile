FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY .well-known /usr/share/nginx/html/.well-known
EXPOSE 80
