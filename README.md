# artist-connect-web

Landingpage für **ArtistConnect** (ehemals MusicConnect), plus die beiden
Dateien, die iOS und Android brauchen, damit Links in der App landen.

    .well-known/apple-app-site-association   Universal Links (iOS)
    .well-known/assetlinks.json              App Links (Android)

Öffentlich, weil beide Dateien und die Seite ohnehin öffentlich ausgeliefert
werden. Es liegen keine Zugangsdaten darin.

## Deployment

Coolify baut das Dockerfile (nginx:alpine) bei jedem Push auf `main`.
Domains: artist-connect.de und artist-connect.app.

## Offen

`assetlinks.json` enthält aktuell den Fingerprint des **Upload-Keys**. Wird die
App über Play App Signing ausgeliefert, signiert Google mit einem anderen
Schlüssel und der Eintrag muss ergänzt werden:
Play Console → App-Integrität → App-Signaturschlüssel → SHA-256 kopieren und
als zweiten Eintrag in `sha256_cert_fingerprints` hinzufügen.
