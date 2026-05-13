Leaflet marker assets copied from `node_modules/leaflet/dist/images/`.

Next.js does not resolve Leaflet's default marker image URLs reliably after
bundling, so `PropertyMap.tsx` points the default icon URLs at this public
directory.
