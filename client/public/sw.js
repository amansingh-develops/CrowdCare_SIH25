const CACHE_NAME = 'crowdcare-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Ensure the service worker takes control of all clients
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  console.log('[ServiceWorker] Fetch:', event.request.url);
  
  // Handle different types of requests
  if (event.request.method !== 'GET') {
    // Only cache GET requests
    return;
  }

  // Handle API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If successful, clone and cache the response for certain endpoints
          if (response.status === 200 && 
              (event.request.url.includes('/api/issues') || 
               event.request.url.includes('/api/departments'))) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return a custom offline response for API calls
            return new Response(
              JSON.stringify({ 
                error: 'Offline', 
                message: 'You are currently offline. Please check your connection.' 
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'application/json'
                })
              }
            );
          });
        })
    );
    return;
  }

  // Handle navigation requests (pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If offline, serve the cached app shell
          return caches.match('/').then((cachedResponse) => {
            return cachedResponse || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Handle other requests (static assets)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).then((fetchResponse) => {
          // Cache the fetched resource for future use
          if (fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
      .catch(() => {
        // If both cache and network fail, return a fallback
        if (event.request.destination === 'image') {
          // Return a placeholder image for failed image requests
          return new Response(
            '<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="150" fill="#f3f4f6"/><text x="100" y="75" text-anchor="middle" fill="#9ca3af">Image unavailable offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      })
  );
});

// Handle background sync for offline issue reporting
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'issue-sync') {
    event.waitUntil(syncIssues());
  }
});

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New update from CrowdCare',
      icon: '/manifest-icon-192.png',
      badge: '/manifest-icon-96.png',
      tag: data.tag || 'general',
      data: data.url || '/',
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/manifest-icon-96.png'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'CrowdCare', options)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    const url = event.notification.data || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// Sync offline issues when connection is restored
async function syncIssues() {
  try {
    // Get stored offline issues from IndexedDB
    const db = await openDB();
    const tx = db.transaction(['offline_issues'], 'readonly');
    const store = tx.objectStore('offline_issues');
    const issues = await store.getAll();
    
    for (const issue of issues) {
      try {
        // Attempt to upload the offline issue
        const formData = new FormData();
        Object.keys(issue.data).forEach(key => {
          if (key !== 'images') {
            formData.append(key, issue.data[key]);
          }
        });
        
        // Add images if present
        if (issue.data.images) {
          issue.data.images.forEach(image => {
            formData.append('images', image);
          });
        }
        
        const response = await fetch('/api/issues', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (response.ok) {
          // Remove successfully synced issue
          const deleteTx = db.transaction(['offline_issues'], 'readwrite');
          const deleteStore = deleteTx.objectStore('offline_issues');
          await deleteStore.delete(issue.id);
          console.log('[ServiceWorker] Successfully synced offline issue:', issue.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync issue:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to sync issues:', error);
  }
}

// Helper function to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CrowdCareDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store for offline issues
      if (!db.objectStoreNames.contains('offline_issues')) {
        const store = db.createObjectStore('offline_issues', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

// Message handling for communication with main app
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[ServiceWorker] Service Worker registered successfully');
