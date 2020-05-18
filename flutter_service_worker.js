'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "main.dart.js": "f50d2c1c407e0ffedb78f979e183deed",
"assets/fonts/MaterialIcons-Regular.ttf": "56d3ffdef7a25659eab6a68a3fbfaf16",
"assets/FontManifest.json": "01700ba55b08a6141f33e168c4a6c22f",
"assets/LICENSE": "da6e973ac3ab52a7b9aeab42f4aec415",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "115e937bb829a890521f72d2e664b632",
"assets/assets/person2.jpeg": "94bd58214363da080f5c92298a4cb1ef",
"assets/assets/mail.png": "dc55662a996e5617957530fe4d32d06a",
"assets/assets/github_app.png": "1fbf1eeb622038a1ea2e62036d33788a",
"assets/assets/person1.jpeg": "1d93c1b598e0378af0ce618fa39b2f19",
"assets/assets/twitter.png": "4907a786377fe693a9aa563792728683",
"assets/assets/github.png": "3e54ed15b9cd877c5223f5ecf64579df",
"assets/assets/person3.jpeg": "68f7f58edb11830b0525a4c65cc3a845",
"assets/assets/message.png": "4ab37fd9235ee454ef36d904f80502ff",
"assets/assets/jaimeblasco.jpeg": "52e200d3b4ec4978617490d949f90d0e",
"assets/assets/flutter.png": "d21f1eecaeaab081ba7efec1721c0712",
"assets/assets/demo_image.jpeg": "4129427d4b3d8ffbfda70b0bae61400b",
"assets/assets/person4.jpeg": "2e9b5940fd621cd2b6ef87652e922100",
"assets/assets/MacBook.jpg": "3d3f92faf14d52e12c8a8583a2cf30c2",
"assets/assets/slack.png": "efd8727d64d49659d14eee20476f8de7",
"assets/AssetManifest.json": "c02d227dbbf2171c7f8fdf8137ae6dee",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"manifest.json": "00e0b69b49487ce4f9ff0c5fac8fda49",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/image.png": "67a5713828d6376924dae3e846725009",
"index.html": "4a0667cd3b6d180b0afd89a2d691abd0",
"/": "4a0667cd3b6d180b0afd89a2d691abd0"
};

// The application shell files that are downloaded before a service worker can
// start.
const CORE = [
  "main.dart.js",
"/",
"index.html",
"assets/LICENSE",
"assets/AssetManifest.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(CORE);
    })
  );
});

// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');

      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        return;
      }

      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});

// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // If the URL is not the the RESOURCE list, skip the cache.
  if (!RESOURCES[key]) {
    return event.respondWith(fetch(event.request));
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache.
        return response || fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
    })
  );
});

