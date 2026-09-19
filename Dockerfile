FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html impressum.html style.css main.js globe.js /usr/share/nginx/html/
COPY vendor /usr/share/nginx/html/vendor
COPY partners /usr/share/nginx/html/partners
COPY .well-known /usr/share/nginx/html/.well-known
EXPOSE 80
