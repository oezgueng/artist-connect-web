FROM nginx:alpine

# Frueher stand hier eine Liste einzelner Dateien. Das ging so lange gut, bis
# die Seite eine Datei dazubekam: live.js, die Store-Abzeichen und die Symbole
# fehlten im Image, und nginx lieferte fuer /live.js die index.html aus — mit
# Status 200, also sah von aussen alles richtig aus. Jetzt wandert das ganze
# Verzeichnis hinein, und .dockerignore haelt heraus, was nicht ausgeliefert
# werden darf.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/.dockerignore \
          /usr/share/nginx/html/nginx.conf \
          /usr/share/nginx/html/README.md

EXPOSE 80
